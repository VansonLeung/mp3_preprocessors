function formatDurationSeconds(durationSeconds) {
  return `${durationSeconds.toFixed(3)}s`;
}

export function createConsoleProgressCallbacks({ verbose }) {
  return {
    onInputDiscoveryCompleted({ discoveredCount, selectedCount }) {
      console.log(
        `Discovered ${discoveredCount} MP3 recording(s); selected ${selectedCount}.`,
      );
    },

    onRecordingStarted({ inputFilePath }) {
      console.log(`Processing recording: ${inputFilePath}`);
    },

    onSilenceDetectionCompleted({ sourceRecording, silenceEventCount }) {
      console.log(
        `Detected ${silenceEventCount} silence event(s) in ${sourceRecording.fileNameWithoutExtension}.`,
      );
    },

    onChunkPlanCreated({ sourceRecording, chunkCount }) {
      console.log(
        `Planned ${chunkCount} chunk(s) for ${sourceRecording.fileNameWithoutExtension}.`,
      );
    },

    onMergedChunkPlanCreated({ sourceRecording, mergedChunkCount }) {
      console.log(
        `Planned ${mergedChunkCount} merged listening file(s) for ${sourceRecording.fileNameWithoutExtension}.`,
      );
    },

    onChunkExported({ chunk }) {
      console.log(
        `Exported chunk ${chunk.chunkIndex + 1}: ${chunk.outputFileName} (${formatDurationSeconds(
          chunk.chunkDurationSeconds,
        )})`,
      );
    },

    onTranscriptionCompleted({ chunk, transcriptionResult }) {
      console.log(
        `Transcribed ${chunk.outputFileName}: ${transcriptionResult.whisperOutputDirectoryPath}`,
      );
    },

    onCachedChunkTranscriptionStarted({ chunk }) {
      console.log(`Transcribing cached chunk: ${chunk.outputFileName}`);
    },

    onMergedChunkExported({ mergedChunk }) {
      console.log(
        `Exported merged listening file ${mergedChunk.mergedChunkIndex + 1}: ${mergedChunk.outputFileName}`,
      );
    },

    onSourceRecordingTranscriptsStitched({
      sourceRecording,
      sourceRecordingTranscriptResult,
    }) {
      console.log(
        `Stitched source transcript for ${sourceRecording.fileNameWithoutExtension}: ${sourceRecordingTranscriptResult.textFilePath}`,
      );
    },

    onDateChannelTranscriptsStitched({
      dateStamp,
      channel,
      stitchedDateChannelTranscriptResult,
    }) {
      console.log(
        `Stitched date/channel transcript for ${dateStamp} ${channel}: ${stitchedDateChannelTranscriptResult.textFilePath}`,
      );
    },

    onRecordingCompleted({ sourceRecording, chunkCount, mergedChunkCount }) {
      console.log(
        `Completed ${sourceRecording.fileNameWithoutExtension}: ${chunkCount} chunk(s), ${mergedChunkCount} merged listening file(s).`,
      );
    },

    onRecordingFailed({ inputFilePath, error }) {
      console.error(`Failed recording: ${inputFilePath}`);
      console.error(error.stack ?? error.message);
    },

    onProcessingCompleted({
      manifestFilePath,
      processedRecordingCount,
      failureCount,
      chunkCount,
    }) {
      console.log(
        `Completed processing. recordings=${processedRecordingCount}, failures=${failureCount}, chunks=${chunkCount}`,
      );
      console.log(`Manifest: ${manifestFilePath}`);
    },

    onCommandStdout({ text }) {
      if (verbose) {
        process.stdout.write(text);
      }
    },

    onCommandStderr({ text }) {
      if (verbose) {
        process.stderr.write(text);
      }
    },
  };
}
