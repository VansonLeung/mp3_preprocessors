import fs from "node:fs/promises";
import path from "node:path";
import { FileSystemResourceAdapter } from "../adapters/FileSystemResourceAdapter.js";
import { SafeWorkspacePathAdapter } from "../adapters/SafeWorkspacePathAdapter.js";
import { ChunkTimelineItemModel } from "../models/ChunkTimelineItemModel.js";
import { SourceRecordingModel } from "../models/SourceRecordingModel.js";

const sourceRecordingNamePattern =
  /^(?<dateStamp>\d{8})_(?<scheduledStartTime>\d{4})_(?<scheduledEndTime>\d{4})_(?<channel>[A-Z0-9]+)$/;
const chunkFileNamePattern =
  /^(?<sourceName>\d{8}_\d{4}_\d{4}_[A-Z0-9]+)__(?<start>\d{6}_\d{3})__(?<end>\d{6}_\d{3})\.mp3$/;

export class SourceRecordingTimelineDelegate {
  constructor(
    private readonly safeWorkspacePathAdapter: SafeWorkspacePathAdapter,
    private readonly fileSystemResourceAdapter: FileSystemResourceAdapter,
  ) {}

  async listSourceRecordings(): Promise<SourceRecordingModel[]> {
    const chunkSourceRecordings = await this.listChunkSourceRecordings();
    const inputSourceRecordings = await this.listInputSourceRecordings();
    const bySourceKey = new Map<string, SourceRecordingModel>();

    for (const sourceRecording of inputSourceRecordings) {
      bySourceKey.set(sourceRecording.sourceKey, sourceRecording);
    }
    for (const sourceRecording of chunkSourceRecordings) {
      const existing = bySourceKey.get(sourceRecording.sourceKey);
      bySourceKey.set(sourceRecording.sourceKey, {
        ...sourceRecording,
        inputMp3Path: existing?.inputMp3Path ?? sourceRecording.inputMp3Path,
      });
    }

    return [...bySourceKey.values()].sort((left, right) =>
      left.sourceKey.localeCompare(right.sourceKey),
    );
  }

  async buildTimelineForSourceKey(sourceKey: string): Promise<ChunkTimelineItemModel[]> {
    const chunksDirectoryResourcePath = `outputs/chunks/${sourceKey}`;
    const { absolutePath } =
      this.safeWorkspacePathAdapter.resolveResourcePath(chunksDirectoryResourcePath);
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const chunkResourcePaths = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mp3"))
      .map((entry) => `${chunksDirectoryResourcePath}/${entry.name}`)
      .sort();

    const timelineItems = await Promise.all(
      chunkResourcePaths.map((chunkResourcePath) =>
        this.buildTimelineItemForChunkResourcePath(sourceKey, chunkResourcePath),
      ),
    );

    return timelineItems.sort(
      (left, right) => left.absoluteStartSeconds - right.absoluteStartSeconds,
    );
  }

  private async buildTimelineItemForChunkResourcePath(
    sourceKey: string,
    chunkResourcePath: string,
  ): Promise<ChunkTimelineItemModel> {
    const fileName = path.basename(chunkResourcePath);
    const matchedFileName = fileName.match(chunkFileNamePattern);

    if (!matchedFileName?.groups) {
      throw new Error(`Invalid chunk filename: ${fileName}`);
    }

    const baseName = fileName.slice(0, -".mp3".length);
    const transcriptTextPath = `outputs/transcripts/chunks/blank-asr-maritime-analysis/auto/relative/${sourceKey}/${baseName}.txt`;
    const relativeSrtPath = `outputs/transcripts/chunks/blank-asr-maritime-analysis/auto/relative/${sourceKey}/${baseName}.srt`;
    const absoluteSrtPath = `outputs/transcripts/chunks/blank-asr-maritime-analysis/auto/absolute/${sourceKey}/${baseName}.absolute.srt`;
    const analysisJsonPath = `outputs/analysis/chunks/blank-asr-maritime-analysis/auto/${sourceKey}/${baseName}.analysis.json`;
    const analysisMarkdownPath = `outputs/analysis/chunks/blank-asr-maritime-analysis/auto/${sourceKey}/${baseName}.analysis.md`;
    const textPreview = (
      await this.fileSystemResourceAdapter.readOptionalTextFile(transcriptTextPath)
    )
      .trim()
      .slice(0, 220);

    const absoluteStartSeconds = this.convertChunkTimestampLabelToSeconds(
      matchedFileName.groups.start,
    );
    const absoluteEndSeconds = this.convertChunkTimestampLabelToSeconds(
      matchedFileName.groups.end,
    );

    return {
      id: chunkResourcePath,
      chunkResourcePath,
      chunkFileName: fileName,
      sourceKey,
      absoluteStartLabel: matchedFileName.groups.start,
      absoluteEndLabel: matchedFileName.groups.end,
      absoluteStartSeconds,
      absoluteEndSeconds,
      durationSeconds: Math.max(0, absoluteEndSeconds - absoluteStartSeconds),
      textPreview,
      transcriptTextPath: await this.optionalExistingPath(transcriptTextPath),
      relativeSrtPath: await this.optionalExistingPath(relativeSrtPath),
      absoluteSrtPath: await this.optionalExistingPath(absoluteSrtPath),
      analysisJsonPath: await this.optionalExistingPath(analysisJsonPath),
      analysisMarkdownPath: await this.optionalExistingPath(analysisMarkdownPath),
    };
  }

  private async optionalExistingPath(resourcePath: string) {
    return (await this.fileSystemResourceAdapter.resourceExists(resourcePath))
      ? resourcePath
      : null;
  }

  private async listChunkSourceRecordings(): Promise<SourceRecordingModel[]> {
    const chunksRoot = this.safeWorkspacePathAdapter.resolveResourcePath(
      "outputs/chunks",
    ).absolutePath;
    const dateFolders = await this.safeReaddir(chunksRoot);
    const sourceRecordings: SourceRecordingModel[] = [];

    for (const dateFolder of dateFolders) {
      const dateFolderPath = path.join(chunksRoot, dateFolder);
      const sourceFolders = await this.safeReaddir(dateFolderPath);
      for (const sourceName of sourceFolders) {
        const matchedSourceName = sourceName.match(sourceRecordingNamePattern);
        if (!matchedSourceName?.groups) {
          continue;
        }
        const chunkDirectoryPath = `outputs/chunks/${dateFolder}/${sourceName}`;
        const chunkCount = (await this.safeReaddir(path.join(dateFolderPath, sourceName)))
          .filter((fileName) => fileName.endsWith(".mp3")).length;
        const analysisDirectoryPath =
          this.safeWorkspacePathAdapter.resolveResourcePath(
            `outputs/analysis/chunks/blank-asr-maritime-analysis/auto/${dateFolder}/${sourceName}`,
          ).absolutePath;
        const analysisCount = (await this.safeReaddir(analysisDirectoryPath))
          .filter((fileName) => fileName.endsWith(".analysis.json")).length;
        sourceRecordings.push({
          id: `${dateFolder}/${sourceName}`,
          sourceKey: `${dateFolder}/${sourceName}`,
          inputMp3Path: `inputs/${dateFolder}/${sourceName}.mp3`,
          chunkDirectoryPath,
          dateFolder,
          sourceName,
          dateStamp: matchedSourceName.groups.dateStamp,
          scheduledStartTime: matchedSourceName.groups.scheduledStartTime,
          scheduledEndTime: matchedSourceName.groups.scheduledEndTime,
          channel: matchedSourceName.groups.channel,
          chunkCount,
          analysisCount,
        });
      }
    }

    return sourceRecordings;
  }

  private async listInputSourceRecordings(): Promise<SourceRecordingModel[]> {
    const inputsRoot = this.safeWorkspacePathAdapter.resolveResourcePath(
      "inputs",
    ).absolutePath;
    const dateFolders = await this.safeReaddir(inputsRoot);
    const sourceRecordings: SourceRecordingModel[] = [];

    for (const dateFolder of dateFolders) {
      const dateFolderPath = path.join(inputsRoot, dateFolder);
      const fileNames = await this.safeReaddir(dateFolderPath);
      for (const fileName of fileNames.filter((name) => name.endsWith(".mp3"))) {
        const sourceName = fileName.slice(0, -".mp3".length);
        const matchedSourceName = sourceName.match(sourceRecordingNamePattern);
        if (!matchedSourceName?.groups) {
          continue;
        }
        sourceRecordings.push({
          id: `${dateFolder}/${sourceName}`,
          sourceKey: `${dateFolder}/${sourceName}`,
          inputMp3Path: `inputs/${dateFolder}/${fileName}`,
          chunkDirectoryPath: null,
          dateFolder,
          sourceName,
          dateStamp: matchedSourceName.groups.dateStamp,
          scheduledStartTime: matchedSourceName.groups.scheduledStartTime,
          scheduledEndTime: matchedSourceName.groups.scheduledEndTime,
          channel: matchedSourceName.groups.channel,
          chunkCount: 0,
          analysisCount: 0,
        });
      }
    }

    return sourceRecordings;
  }

  private async safeReaddir(absolutePath: string) {
    try {
      return (await fs.readdir(absolutePath)).filter((name) => name !== ".DS_Store");
    } catch {
      return [];
    }
  }

  private convertChunkTimestampLabelToSeconds(timestampLabel: string) {
    const [hhmmss, milliseconds] = timestampLabel.split("_");
    return (
      Number(hhmmss.slice(0, 2)) * 3600 +
      Number(hhmmss.slice(2, 4)) * 60 +
      Number(hhmmss.slice(4, 6)) +
      Number(milliseconds) / 1000
    );
  }
}
