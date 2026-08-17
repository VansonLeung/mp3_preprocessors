import { discoverMaritimeRecordingInputFilesAdapter } from "../infrastructure/filesystem/MaritimeRecordingInputFileDiscoveryAdapter.js";
import { writeProcessingManifestFileAdapter } from "../infrastructure/filesystem/ProcessingManifestWriterAdapter.js";
import { stitchDateChannelTranscriptsAdapter } from "../infrastructure/filesystem/TranscriptStitchingAdapter.js";
import { processOneMaritimeRecordingUseCase } from "./ProcessOneMaritimeRecordingUseCase.js";

function createDateChannelTranscriptionGroupKey(sourceRecording) {
  return `${sourceRecording.dateStamp}__${sourceRecording.channel}`;
}

export async function processAllMaritimeRecordingsUseCase({
  configuration,
  limit,
  selectedInputPaths,
  dryRun,
  callbacks,
}) {
  const discoveredInputFilePaths =
    await discoverMaritimeRecordingInputFilesAdapter({
      inputsDirectoryPath: configuration.inputsDirectoryPath,
      selectedInputPaths,
    });

  const selectedInputFilePaths =
    limit === null ? discoveredInputFilePaths : discoveredInputFilePaths.slice(0, limit);

  callbacks?.onInputDiscoveryCompleted?.({
    discoveredCount: discoveredInputFilePaths.length,
    selectedCount: selectedInputFilePaths.length,
  });

  const allManifestRecords = [];
  const dateChannelTranscriptionGroups = new Map();
  const failures = [];

  for (const inputFilePath of selectedInputFilePaths) {
    try {
      const processingResult = await processOneMaritimeRecordingUseCase({
        inputFilePath,
        configuration,
        dryRun,
        callbacks,
      });
      allManifestRecords.push(...processingResult.manifestRecords);

      if (configuration.enableTranscription) {
        const groupKey = createDateChannelTranscriptionGroupKey(
          processingResult.sourceRecording,
        );
        const existingGroup = dateChannelTranscriptionGroups.get(groupKey) ?? {
          dateStamp: processingResult.sourceRecording.dateStamp,
          channel: processingResult.sourceRecording.channel,
          transcriptionResults: [],
        };
        existingGroup.transcriptionResults.push(
          ...processingResult.chunkTranscriptionResults,
        );
        dateChannelTranscriptionGroups.set(groupKey, existingGroup);
      }
    } catch (error) {
      callbacks?.onRecordingFailed?.({ inputFilePath, error });
      failures.push({ inputFilePath, error });
    }
  }

  if (configuration.enableTranscription) {
    for (const dateChannelTranscriptionGroup of dateChannelTranscriptionGroups.values()) {
      const stitchedDateChannelTranscriptResult =
        await stitchDateChannelTranscriptsAdapter({
          outputsDirectoryPath: configuration.outputsDirectoryPath,
          strategyName: configuration.transcriptionStrategy,
          dateStamp: dateChannelTranscriptionGroup.dateStamp,
          channel: dateChannelTranscriptionGroup.channel,
          transcriptionResults:
            dateChannelTranscriptionGroup.transcriptionResults,
        });
      callbacks?.onDateChannelTranscriptsStitched?.({
        dateStamp: dateChannelTranscriptionGroup.dateStamp,
        channel: dateChannelTranscriptionGroup.channel,
        stitchedDateChannelTranscriptResult,
      });
    }
  }

  const manifestFilePath = await writeProcessingManifestFileAdapter({
    outputsDirectoryPath: configuration.outputsDirectoryPath,
    manifestRecords: allManifestRecords,
  });

  callbacks?.onProcessingCompleted?.({
    manifestFilePath,
    processedRecordingCount: selectedInputFilePaths.length - failures.length,
    failureCount: failures.length,
    chunkCount: allManifestRecords.length,
  });

  if (failures.length > 0) {
    const error = new Error(`${failures.length} recording(s) failed.`);
    error.failures = failures;
    throw error;
  }

  return {
    manifestFilePath,
    processedRecordingCount: selectedInputFilePaths.length,
    chunkCount: allManifestRecords.length,
  };
}
