import path from "node:path";
import { createMergedMaritimeAudioChunkModel } from "../models/MergedMaritimeAudioChunkModel.js";
import { calculateAbsoluteChunkTimestamps } from "../domain/CalculateAbsoluteChunkTimestamps.js";
import { formatMergedChunkedMaritimeRecordingFileName } from "../domain/FormatMergedChunkedMaritimeRecordingFileName.js";
import { planMergedChunkGroupsFromAudioChunks } from "../domain/PlanMergedChunkGroupsFromAudioChunks.js";

export function createMergedChunkPlanUseCase({
  sourceRecording,
  chunks,
  outputMergedChunksDirectoryPath,
  configuration,
}) {
  const mergedChunkMaximumDurationSeconds =
    configuration.mergedChunkMaximumDurationMinutes === null
      ? null
      : configuration.mergedChunkMaximumDurationMinutes * 60;

  const mergedChunkGroups = planMergedChunkGroupsFromAudioChunks({
    chunks,
    mergedChunkMaximumDurationSeconds,
  });

  return mergedChunkGroups.map((componentChunks, mergedChunkIndex) => {
    const firstComponentChunk = componentChunks[0];
    const lastComponentChunk = componentChunks.at(-1);
    const mergedStartSeconds = firstComponentChunk.chunkStartSeconds;
    const mergedEndSeconds = lastComponentChunk.chunkEndSeconds;
    const absoluteTimestamps = calculateAbsoluteChunkTimestamps({
      sourceRecording,
      chunkStartSeconds: mergedStartSeconds,
      chunkEndSeconds: mergedEndSeconds,
    });
    const outputFileName = formatMergedChunkedMaritimeRecordingFileName({
      sourceRecording,
      ...absoluteTimestamps,
      mergedChunkIndex,
    });

    return createMergedMaritimeAudioChunkModel({
      sourceRecording,
      mergedChunkIndex,
      componentChunks,
      mergedStartSeconds,
      mergedEndSeconds,
      mergedSourceSpanDurationSeconds:
        Math.round((mergedEndSeconds - mergedStartSeconds) * 1000) / 1000,
      estimatedMergedAudioDurationSeconds:
        Math.round(
          componentChunks.reduce(
            (totalDurationSeconds, componentChunk) =>
              totalDurationSeconds + componentChunk.chunkDurationSeconds,
            0,
          ) *
            1000,
        ) / 1000,
      ...absoluteTimestamps,
      outputFileName,
      outputFilePath: path.join(outputMergedChunksDirectoryPath, outputFileName),
    });
  });
}
