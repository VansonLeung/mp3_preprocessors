export function calculateAbsoluteChunkTimestamps({
  sourceRecording,
  chunkStartSeconds,
  chunkEndSeconds,
}) {
  return {
    absoluteStartSecondsAfterMidnight:
      sourceRecording.scheduledStartSecondsAfterMidnight + chunkStartSeconds,
    absoluteEndSecondsAfterMidnight:
      sourceRecording.scheduledStartSecondsAfterMidnight + chunkEndSeconds,
  };
}
