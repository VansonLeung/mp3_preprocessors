import path from "node:path";
import { createMaritimeRecordingModel } from "../models/MaritimeRecordingModel.js";
import { parseMaritimeRecordingFileName } from "../domain/ParseMaritimeRecordingFileName.js";
import { readAudioMetadataWithFfprobeAdapter } from "../infrastructure/ffmpeg/FfprobeAudioMetadataAdapter.js";
import { detectSilenceEventsWithFfmpegAdapter } from "../infrastructure/ffmpeg/FfmpegSilenceDetectionAdapter.js";
import { exportMp3ChunkWithFfmpegAdapter } from "../infrastructure/ffmpeg/FfmpegMp3ChunkExportAdapter.js";
import { concatenateMp3ChunksWithFfmpegAdapter } from "../infrastructure/ffmpeg/FfmpegMergedMp3ChunkConcatAdapter.js";
import { transcribeMp3ChunkWithMlxWhisperAdapter } from "../infrastructure/whisper/MlxWhisperTranscriptionAdapter.js";
import { ensureOutputDirectoryExistsAdapter } from "../infrastructure/filesystem/OutputDirectoryCreationAdapter.js";
import { stitchSourceRecordingTranscriptsAdapter } from "../infrastructure/filesystem/TranscriptStitchingAdapter.js";
import { createSilenceBasedChunkPlanUseCase } from "./CreateSilenceBasedChunkPlanUseCase.js";
import { createMergedChunkPlanUseCase } from "./CreateMergedChunkPlanUseCase.js";

function createManifestRecordForChunk({
  chunk,
  silenceEventCount,
  transcriptionResult,
  dryRun,
}) {
  return {
    dryRun,
    sourceFilePath: chunk.sourceRecording.sourceFilePath,
    sourceRelativeDirectoryPath: chunk.sourceRecording.relativeDirectoryPath,
    sourceDurationSeconds: chunk.sourceRecording.durationSeconds,
    sourceChannel: chunk.sourceRecording.channel,
    outputLayer: "chunk",
    silenceEventCount,
    chunkIndex: chunk.chunkIndex,
    chunkStartSeconds: chunk.chunkStartSeconds,
    chunkEndSeconds: chunk.chunkEndSeconds,
    chunkDurationSeconds: chunk.chunkDurationSeconds,
    outputFilePath: chunk.outputFilePath,
    transcriptTextFilePath: transcriptionResult?.textFilePath ?? null,
    transcriptRelativeSrtFilePath:
      transcriptionResult?.relativeSrtFilePath ?? null,
    transcriptAbsoluteSrtFilePath:
      transcriptionResult?.absoluteSrtFilePath ?? null,
  };
}

function createManifestRecordForMergedChunk({
  mergedChunk,
  dryRun,
}) {
  return {
    dryRun,
    sourceFilePath: mergedChunk.sourceRecording.sourceFilePath,
    sourceRelativeDirectoryPath: mergedChunk.sourceRecording.relativeDirectoryPath,
    sourceDurationSeconds: mergedChunk.sourceRecording.durationSeconds,
    sourceChannel: mergedChunk.sourceRecording.channel,
    outputLayer: "chunk-merged",
    mergedChunkIndex: mergedChunk.mergedChunkIndex,
    mergedStartSeconds: mergedChunk.mergedStartSeconds,
    mergedEndSeconds: mergedChunk.mergedEndSeconds,
    mergedSourceSpanDurationSeconds: mergedChunk.mergedSourceSpanDurationSeconds,
    estimatedMergedAudioDurationSeconds:
      mergedChunk.estimatedMergedAudioDurationSeconds,
    componentChunkCount: mergedChunk.componentChunks.length,
    componentChunkOutputFilePaths: mergedChunk.componentChunks.map(
      (componentChunk) => componentChunk.outputFilePath,
    ),
    outputFilePath: mergedChunk.outputFilePath,
    transcriptTextFilePath: null,
    transcriptRelativeSrtFilePath: null,
    transcriptAbsoluteSrtFilePath: null,
  };
}

export async function processOneMaritimeRecordingUseCase({
  inputFilePath,
  configuration,
  dryRun,
  callbacks,
}) {
  callbacks?.onRecordingStarted?.({ inputFilePath });

  const parsedFileName = parseMaritimeRecordingFileName(inputFilePath);
  const relativeDirectoryPath = path.relative(
    configuration.inputsDirectoryPath,
    path.dirname(inputFilePath),
  );
  const audioMetadata = await readAudioMetadataWithFfprobeAdapter({
    ffprobeCommand: configuration.ffprobeCommand,
    inputFilePath,
    callbacks,
  });

  const sourceRecording = createMaritimeRecordingModel({
    sourceFilePath: inputFilePath,
    inputRootDirectoryPath: configuration.inputsDirectoryPath,
    relativeDirectoryPath,
    ...parsedFileName,
    ...audioMetadata,
  });

  const silenceEvents = await detectSilenceEventsWithFfmpegAdapter({
    ffmpegCommand: configuration.ffmpegCommand,
    inputFilePath,
    silenceNoiseThreshold: configuration.silenceNoiseThreshold,
    silenceMinimumDurationSeconds:
      configuration.silenceMinimumDurationSeconds,
    callbacks,
  });

  callbacks?.onSilenceDetectionCompleted?.({
    sourceRecording,
    silenceEventCount: silenceEvents.length,
  });

  const outputChunksDirectoryPath = path.join(
    configuration.outputsDirectoryPath,
    "chunks",
    relativeDirectoryPath,
  );
  const outputMergedChunksDirectoryPath = path.join(
    configuration.outputsDirectoryPath,
    "chunk-merged",
    relativeDirectoryPath,
  );
  const chunkTranscriptOutputDirectoryPath = path.join(
    configuration.outputsDirectoryPath,
    "transcripts",
    "chunks",
    "relative",
    relativeDirectoryPath,
  );
  const chunkAbsoluteSrtOutputDirectoryPath = path.join(
    configuration.outputsDirectoryPath,
    "transcripts",
    "chunks",
    "absolute",
    relativeDirectoryPath,
  );

  const chunks = createSilenceBasedChunkPlanUseCase({
    sourceRecording,
    silenceEvents,
    outputChunksDirectoryPath,
    configuration,
  });

  callbacks?.onChunkPlanCreated?.({
    sourceRecording,
    chunkCount: chunks.length,
  });

  const mergedChunks = configuration.enableChunkMerging
    ? createMergedChunkPlanUseCase({
        sourceRecording,
        chunks,
        outputMergedChunksDirectoryPath,
        configuration,
      })
    : [];

  callbacks?.onMergedChunkPlanCreated?.({
    sourceRecording,
    mergedChunkCount: mergedChunks.length,
  });

  if (!dryRun) {
    await ensureOutputDirectoryExistsAdapter({
      directoryPath: outputChunksDirectoryPath,
    });
    if (configuration.enableChunkMerging) {
      await ensureOutputDirectoryExistsAdapter({
        directoryPath: outputMergedChunksDirectoryPath,
      });
    }
  }

  const manifestRecords = [];
  const chunkTranscriptionResults = [];

  for (const chunk of chunks) {
    let transcriptionResult = null;

    if (!dryRun) {
      await exportMp3ChunkWithFfmpegAdapter({
        ffmpegCommand: configuration.ffmpegCommand,
        inputFilePath,
        outputFilePath: chunk.outputFilePath,
        chunkStartSeconds: chunk.chunkStartSeconds,
        chunkDurationSeconds: chunk.chunkDurationSeconds,
        exportMp3Bitrate: configuration.exportMp3Bitrate,
        callbacks,
      });

      callbacks?.onChunkExported?.({ chunk });

      if (configuration.enableTranscription) {
        transcriptionResult = await transcribeMp3ChunkWithMlxWhisperAdapter({
          whisperCommand: configuration.whisperCommand,
          whisperModel: configuration.whisperModel,
          whisperLanguage: configuration.whisperLanguage,
          chunk,
          transcriptOutputDirectoryPath: chunkTranscriptOutputDirectoryPath,
          absoluteSrtOutputDirectoryPath: chunkAbsoluteSrtOutputDirectoryPath,
          callbacks,
        });

        callbacks?.onTranscriptionCompleted?.({
          chunk,
          transcriptionResult,
        });
        chunkTranscriptionResults.push(transcriptionResult);
      }
    }

    manifestRecords.push(
      createManifestRecordForChunk({
        chunk,
        silenceEventCount: silenceEvents.length,
        transcriptionResult,
        dryRun,
      }),
    );
  }

  let sourceRecordingTranscriptResult = null;
  if (!dryRun && configuration.enableTranscription) {
    sourceRecordingTranscriptResult =
      await stitchSourceRecordingTranscriptsAdapter({
        outputsDirectoryPath: configuration.outputsDirectoryPath,
        sourceRecording,
        transcriptionResults: chunkTranscriptionResults,
      });
    callbacks?.onSourceRecordingTranscriptsStitched?.({
      sourceRecording,
      sourceRecordingTranscriptResult,
    });
  }

  for (const mergedChunk of mergedChunks) {
    if (!dryRun) {
      await concatenateMp3ChunksWithFfmpegAdapter({
        ffmpegCommand: configuration.ffmpegCommand,
        mergedChunk,
        exportMp3Bitrate: configuration.exportMp3Bitrate,
        insertedSilenceSeconds: configuration.mergedChunkInsertSilenceSeconds,
        reencodeAudio: configuration.mergedChunkReencodeAudio,
        callbacks,
      });

      callbacks?.onMergedChunkExported?.({ mergedChunk });
    }

    manifestRecords.push(
      createManifestRecordForMergedChunk({
        mergedChunk,
        dryRun,
      }),
    );
  }

  callbacks?.onRecordingCompleted?.({
    sourceRecording,
    chunkCount: chunks.length,
    mergedChunkCount: mergedChunks.length,
  });

  return {
    sourceRecording,
    silenceEvents,
    chunks,
    mergedChunks,
    chunkTranscriptionResults,
    sourceRecordingTranscriptResult,
    manifestRecords,
  };
}
