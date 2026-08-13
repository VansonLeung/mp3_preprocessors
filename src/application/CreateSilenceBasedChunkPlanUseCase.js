import path from "node:path";
import { createMaritimeAudioChunkModel } from "../models/MaritimeAudioChunkModel.js";
import { calculateAbsoluteChunkTimestamps } from "../domain/CalculateAbsoluteChunkTimestamps.js";
import { calculateChunkBoundariesFromSilenceEvents } from "../domain/CalculateChunkBoundariesFromSilenceEvents.js";
import { formatChunkedMaritimeRecordingFileName } from "../domain/FormatChunkedMaritimeRecordingFileName.js";

export function createSilenceBasedChunkPlanUseCase({
  sourceRecording,
  silenceEvents,
  outputChunksDirectoryPath,
  configuration,
}) {
  const chunkBoundaries = calculateChunkBoundariesFromSilenceEvents({
    silenceEvents,
    durationSeconds: sourceRecording.durationSeconds,
    minimumChunkDurationSeconds: configuration.minimumChunkDurationSeconds,
    maximumChunkDurationSeconds: configuration.maximumChunkDurationSeconds,
    chunkPaddingSeconds: configuration.chunkPaddingSeconds,
    shortSpeechMergeGapSeconds: configuration.shortSpeechMergeGapSeconds,
  });

  return chunkBoundaries.map((chunkBoundary, chunkIndex) => {
    const absoluteTimestamps = calculateAbsoluteChunkTimestamps({
      sourceRecording,
      chunkStartSeconds: chunkBoundary.startSeconds,
      chunkEndSeconds: chunkBoundary.endSeconds,
    });
    const outputFileName = formatChunkedMaritimeRecordingFileName({
      sourceRecording,
      ...absoluteTimestamps,
    });

    return createMaritimeAudioChunkModel({
      sourceRecording,
      chunkIndex,
      chunkStartSeconds: chunkBoundary.startSeconds,
      chunkEndSeconds: chunkBoundary.endSeconds,
      chunkDurationSeconds: chunkBoundary.durationSeconds,
      ...absoluteTimestamps,
      outputFileName,
      outputFilePath: path.join(outputChunksDirectoryPath, outputFileName),
    });
  });
}
