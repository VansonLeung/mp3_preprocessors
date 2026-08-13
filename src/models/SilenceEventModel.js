export function createSilenceEventModel({
  silenceStartSeconds,
  silenceEndSeconds,
  silenceDurationSeconds,
}) {
  return Object.freeze({
    silenceStartSeconds,
    silenceEndSeconds,
    silenceDurationSeconds,
  });
}
