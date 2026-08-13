export function createMaritimeAudioChunkModel({
  sourceRecording,
  chunkIndex,
  chunkStartSeconds,
  chunkEndSeconds,
  chunkDurationSeconds,
  absoluteStartSecondsAfterMidnight,
  absoluteEndSecondsAfterMidnight,
  outputFileName,
  outputFilePath,
}) {
  return Object.freeze({
    sourceRecording,
    chunkIndex,
    chunkStartSeconds,
    chunkEndSeconds,
    chunkDurationSeconds,
    absoluteStartSecondsAfterMidnight,
    absoluteEndSecondsAfterMidnight,
    outputFileName,
    outputFilePath,
  });
}
