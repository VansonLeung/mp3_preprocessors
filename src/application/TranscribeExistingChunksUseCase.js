import path from "node:path";
import { createMaritimeAudioChunkModel } from "../models/MaritimeAudioChunkModel.js";
import { createMaritimeRecordingModel } from "../models/MaritimeRecordingModel.js";
import { parseChunkedMaritimeRecordingFileName } from "../domain/ParseChunkedMaritimeRecordingFileName.js";
import { readAudioMetadataWithFfprobeAdapter } from "../infrastructure/ffmpeg/FfprobeAudioMetadataAdapter.js";
import { discoverMaritimeRecordingInputFilesAdapter } from "../infrastructure/filesystem/MaritimeRecordingInputFileDiscoveryAdapter.js";
import { writeProcessingManifestFileAdapter } from "../infrastructure/filesystem/ProcessingManifestWriterAdapter.js";
import { runSelectedTranscriptionStrategyUseCase } from "./transcriptionStrategies/RunSelectedTranscriptionStrategyUseCase.js";

function createManifestRecordForCachedChunkTranscription({ transcriptionResult }) {
  const { chunk } = transcriptionResult;

  return {
    dryRun: false,
    outputLayer: "cached-chunk-transcription",
    sourceRelativeDirectoryPath: chunk.sourceRecording.relativeDirectoryPath,
    sourceChannel: chunk.sourceRecording.channel,
    cachedChunkFilePath: chunk.outputFilePath,
    chunkStartSeconds: chunk.chunkStartSeconds,
    chunkEndSeconds: chunk.chunkEndSeconds,
    chunkDurationSeconds: chunk.chunkDurationSeconds,
    transcriptionStrategy: transcriptionResult.strategyName,
    asrProvider: transcriptionResult.asrProvider,
    language: transcriptionResult.language,
    transcriptTextFilePath: transcriptionResult.textFilePath,
    transcriptRelativeSrtFilePath: transcriptionResult.relativeSrtFilePath,
    transcriptAbsoluteSrtFilePath: transcriptionResult.absoluteSrtFilePath,
    analysisJsonFilePath: transcriptionResult.analysisJsonFilePath,
    analysisMarkdownFilePath: transcriptionResult.analysisMarkdownFilePath,
    transcriptionTiming: transcriptionResult.transcriptionTiming,
    childTranscriptionResultCount:
      transcriptionResult.childTranscriptionResults.length,
    childTranscriptionResults: transcriptionResult.childTranscriptionResults.map(
      (childTranscriptionResult) => ({
        language: childTranscriptionResult.language,
        textFilePath: childTranscriptionResult.textFilePath,
        relativeSrtFilePath: childTranscriptionResult.relativeSrtFilePath,
        absoluteSrtFilePath: childTranscriptionResult.absoluteSrtFilePath,
      }),
    ),
  };
}

export async function transcribeExistingChunksUseCase({
  configuration,
  limit,
  selectedInputPaths,
  callbacks,
}) {
  const discoveredChunkFilePaths =
    await discoverMaritimeRecordingInputFilesAdapter({
      inputsDirectoryPath: path.join(configuration.outputsDirectoryPath, "chunks"),
      selectedInputPaths,
    });
  const canonicalChunkFilePaths = discoveredChunkFilePaths.filter(
    (chunkFilePath) => {
      const parsedChunkFileName =
        parseChunkedMaritimeRecordingFileName(chunkFilePath);

      return (
        path.basename(path.dirname(chunkFilePath)) ===
        parsedChunkFileName.fileNameWithoutExtension
      );
    },
  );
  const selectedChunkFilePaths =
    limit === null ? canonicalChunkFilePaths : canonicalChunkFilePaths.slice(0, limit);

  callbacks?.onInputDiscoveryCompleted?.({
    discoveredCount: canonicalChunkFilePaths.length,
    selectedCount: selectedChunkFilePaths.length,
  });

  const manifestRecords = [];
  const failures = [];

  for (const chunkFilePath of selectedChunkFilePaths) {
    try {
      const parsedChunkFileName =
        parseChunkedMaritimeRecordingFileName(chunkFilePath);
      const relativeDirectoryPath = path.relative(
        path.join(configuration.outputsDirectoryPath, "chunks"),
        path.dirname(chunkFilePath),
      );
      const sourceRelativeDirectoryPath = path.dirname(relativeDirectoryPath);
      const audioMetadata = await readAudioMetadataWithFfprobeAdapter({
        ffprobeCommand: configuration.ffprobeCommand,
        inputFilePath: chunkFilePath,
        callbacks,
      });
      const sourceRecording = createMaritimeRecordingModel({
        sourceFilePath: null,
        inputRootDirectoryPath: configuration.inputsDirectoryPath,
        relativeDirectoryPath: sourceRelativeDirectoryPath,
        fileNameWithoutExtension: parsedChunkFileName.fileNameWithoutExtension,
        dateStamp: parsedChunkFileName.dateStamp,
        scheduledStartTime: parsedChunkFileName.scheduledStartTime,
        scheduledEndTime: parsedChunkFileName.scheduledEndTime,
        channel: parsedChunkFileName.channel,
        scheduledStartSecondsAfterMidnight:
          parsedChunkFileName.scheduledStartSecondsAfterMidnight,
        scheduledEndSecondsAfterMidnight:
          parsedChunkFileName.scheduledEndSecondsAfterMidnight,
        durationSeconds: null,
        sampleRate: audioMetadata.sampleRate,
        channelCount: audioMetadata.channelCount,
      });
      const chunk = createMaritimeAudioChunkModel({
        sourceRecording,
        chunkIndex: manifestRecords.length,
        chunkStartSeconds: parsedChunkFileName.chunkStartSeconds,
        chunkEndSeconds: parsedChunkFileName.chunkEndSeconds,
        chunkDurationSeconds: audioMetadata.durationSeconds,
        absoluteStartSecondsAfterMidnight:
          parsedChunkFileName.absoluteStartSecondsAfterMidnight,
        absoluteEndSecondsAfterMidnight:
          parsedChunkFileName.absoluteEndSecondsAfterMidnight,
        outputFileName: path.basename(chunkFilePath),
        outputFilePath: chunkFilePath,
      });

      callbacks?.onCachedChunkTranscriptionStarted?.({ chunk });

      const transcriptionResult = await runSelectedTranscriptionStrategyUseCase({
        chunk,
        configuration,
        callbacks,
      });

      callbacks?.onTranscriptionCompleted?.({
        chunk,
        transcriptionResult,
      });
      manifestRecords.push(
        createManifestRecordForCachedChunkTranscription({
          transcriptionResult,
        }),
      );
    } catch (error) {
      callbacks?.onRecordingFailed?.({ inputFilePath: chunkFilePath, error });
      failures.push({ inputFilePath: chunkFilePath, error });
    }
  }

  const manifestFilePath = await writeProcessingManifestFileAdapter({
    outputsDirectoryPath: configuration.outputsDirectoryPath,
    manifestRecords,
  });

  callbacks?.onProcessingCompleted?.({
    manifestFilePath,
    processedRecordingCount: selectedChunkFilePaths.length - failures.length,
    failureCount: failures.length,
    chunkCount: manifestRecords.length,
  });

  if (failures.length > 0) {
    const error = new Error(`${failures.length} cached chunk(s) failed.`);
    error.failures = failures;
    throw error;
  }

  return {
    manifestFilePath,
    processedRecordingCount: selectedChunkFilePaths.length,
    chunkCount: manifestRecords.length,
  };
}
