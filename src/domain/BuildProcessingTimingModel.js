export function buildProcessingTimingModel({
  startedAt,
  completedAt,
  durationMilliseconds,
}) {
  return Object.freeze({
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalDurationMilliseconds: Number(durationMilliseconds.toFixed(3)),
    totalDurationSeconds: Number((durationMilliseconds / 1000).toFixed(3)),
  });
}
