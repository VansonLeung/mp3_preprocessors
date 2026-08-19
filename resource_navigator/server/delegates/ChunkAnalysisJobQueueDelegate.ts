import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import path from "node:path";
import { SafeWorkspacePathAdapter } from "../adapters/SafeWorkspacePathAdapter.js";
import { ChunkAnalysisJobModel } from "../models/ChunkAnalysisJobModel.js";

type ChunkAnalysisJobEventListener = (job: ChunkAnalysisJobModel) => void;

function createJobId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class ChunkAnalysisJobQueueDelegate {
  private readonly jobsById = new Map<string, ChunkAnalysisJobModel>();
  private readonly queuedJobIds: string[] = [];
  private readonly eventEmitter = new EventEmitter();
  private isRunningJob = false;

  constructor(
    private readonly workspaceRootDirectoryPath: string,
    private readonly safeWorkspacePathAdapter: SafeWorkspacePathAdapter,
  ) {}

  createChunkAnalysisJob({
    chunkResourcePaths,
  }: {
    chunkResourcePaths: string[];
  }) {
    if (!Array.isArray(chunkResourcePaths) || chunkResourcePaths.length === 0) {
      throw new Error("At least one chunk must be selected for analysis.");
    }

    const validatedChunkResourcePaths = chunkResourcePaths.map((resourcePath) =>
      this.validateChunkResourcePath(resourcePath),
    );
    const job: ChunkAnalysisJobModel = {
      jobId: createJobId(),
      status: "queued",
      chunkResourcePaths: validatedChunkResourcePaths,
      totalChunkCount: validatedChunkResourcePaths.length,
      completedChunkCount: 0,
      currentChunkFileName: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      recentLogs: [],
    };

    this.jobsById.set(job.jobId, job);
    this.queuedJobIds.push(job.jobId);
    this.emitJobSnapshot(job);
    void this.runNextJobIfIdle();

    return job;
  }

  getChunkAnalysisJob(jobId: string) {
    const job = this.jobsById.get(jobId);
    if (!job) {
      throw new Error(`Analysis job not found: ${jobId}`);
    }

    return job;
  }

  subscribeToChunkAnalysisJob({
    jobId,
    listener,
  }: {
    jobId: string;
    listener: ChunkAnalysisJobEventListener;
  }) {
    this.getChunkAnalysisJob(jobId);
    this.eventEmitter.on(jobId, listener);

    return () => {
      this.eventEmitter.off(jobId, listener);
    };
  }

  private validateChunkResourcePath(resourcePath: string) {
    if (
      !resourcePath.startsWith("outputs/chunks/") ||
      !resourcePath.endsWith(".mp3")
    ) {
      throw new Error(`Selected resource is not an output chunk MP3: ${resourcePath}`);
    }

    this.safeWorkspacePathAdapter.resolveResourcePath(resourcePath);

    return resourcePath;
  }

  private updateJob(
    jobId: string,
    updater: (job: ChunkAnalysisJobModel) => ChunkAnalysisJobModel,
  ) {
    const existingJob = this.getChunkAnalysisJob(jobId);
    const updatedJob = updater(existingJob);
    this.jobsById.set(jobId, updatedJob);
    this.emitJobSnapshot(updatedJob);

    return updatedJob;
  }

  private appendJobLog(jobId: string, text: string) {
    const trimmedLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of trimmedLines) {
      this.updateJob(jobId, (job) => ({
        ...job,
        currentChunkFileName: this.extractCurrentChunkFileName({
          line,
          currentChunkFileName: job.currentChunkFileName,
        }),
        completedChunkCount: line.startsWith("Transcribed ")
          ? Math.min(job.totalChunkCount, job.completedChunkCount + 1)
          : job.completedChunkCount,
        recentLogs: [...job.recentLogs, line].slice(-80),
      }));
    }
  }

  private extractCurrentChunkFileName({
    line,
    currentChunkFileName,
  }: {
    line: string;
    currentChunkFileName: string | null;
  }) {
    const matchedLine = line.match(/^Transcribing cached chunk: (?<fileName>.+)$/);
    return matchedLine?.groups?.fileName ?? currentChunkFileName;
  }

  private emitJobSnapshot(job: ChunkAnalysisJobModel) {
    this.eventEmitter.emit(job.jobId, job);
  }

  private async runNextJobIfIdle() {
    if (this.isRunningJob) {
      return;
    }

    const nextJobId = this.queuedJobIds.shift();
    if (!nextJobId) {
      return;
    }

    this.isRunningJob = true;
    await this.runJob(nextJobId).catch(() => undefined);
    this.isRunningJob = false;
    void this.runNextJobIfIdle();
  }

  private runJob(jobId: string) {
    const job = this.updateJob(jobId, (existingJob) => ({
      ...existingJob,
      status: "running",
      startedAt: new Date().toISOString(),
    }));
    const absoluteChunkFilePaths = job.chunkResourcePaths.map(
      (chunkResourcePath) =>
        this.safeWorkspacePathAdapter.resolveResourcePath(chunkResourcePath)
          .absolutePath,
    );
    const args = [
      "run",
      "chunk-and-transcribe",
      "--",
      "--transcribe-existing-chunks",
      "--enable-transcription",
      "--strategy",
      "blank-asr-maritime-analysis",
      ...absoluteChunkFilePaths.flatMap((chunkFilePath) => [
        "--input",
        chunkFilePath,
      ]),
    ];

    return new Promise<void>((resolve) => {
      const childProcess = spawn("npm", args, {
        cwd: this.workspaceRootDirectoryPath,
        stdio: ["ignore", "pipe", "pipe"],
      });

      childProcess.stdout.on("data", (data) => {
        this.appendJobLog(jobId, data.toString());
      });

      childProcess.stderr.on("data", (data) => {
        this.appendJobLog(jobId, data.toString());
      });

      childProcess.on("error", (error) => {
        this.updateJob(jobId, (existingJob) => ({
          ...existingJob,
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: error.message,
          recentLogs: [...existingJob.recentLogs, error.message].slice(-80),
        }));
        resolve();
      });

      childProcess.on("close", (exitCode) => {
        this.updateJob(jobId, (existingJob) => ({
          ...existingJob,
          status: exitCode === 0 ? "completed" : "failed",
          completedAt: new Date().toISOString(),
          errorMessage:
            exitCode === 0
              ? null
              : `chunk-and-transcribe exited with code ${exitCode}`,
          completedChunkCount:
            exitCode === 0
              ? existingJob.totalChunkCount
              : existingJob.completedChunkCount,
          recentLogs: [
            ...existingJob.recentLogs,
            exitCode === 0
              ? "Analysis job completed."
              : `Analysis job failed with exit code ${exitCode}.`,
          ].slice(-80),
        }));
        resolve();
      });
    });
  }
}
