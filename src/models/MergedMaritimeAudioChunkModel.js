export function createMergedMaritimeAudioChunkModel({
  sourceRecording,
  mergedChunkIndex,
  componentChunks,
  mergedStartSeconds,
  mergedEndSeconds,
  mergedSourceSpanDurationSeconds,
  estimatedMergedAudioDurationSeconds,
  absoluteStartSecondsAfterMidnight,
  absoluteEndSecondsAfterMidnight,
  outputFileName,
  outputFilePath,
}) {
  return Object.freeze({
    sourceRecording,
    mergedChunkIndex,
    componentChunks,
    mergedStartSeconds,
    mergedEndSeconds,
    mergedSourceSpanDurationSeconds,
    estimatedMergedAudioDurationSeconds,
    absoluteStartSecondsAfterMidnight,
    absoluteEndSecondsAfterMidnight,
    outputFileName,
    outputFilePath,
  });
}
