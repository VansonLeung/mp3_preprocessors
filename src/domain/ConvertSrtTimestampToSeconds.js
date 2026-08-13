const SRT_TIMESTAMP_PATTERN =
  /^(?<hours>\d{2}):(?<minutes>\d{2}):(?<seconds>\d{2}),(?<milliseconds>\d{3})$/;

export function convertSrtTimestampToSeconds(srtTimestamp) {
  const match = srtTimestamp.match(SRT_TIMESTAMP_PATTERN);

  if (!match?.groups) {
    throw new Error(`Invalid SRT timestamp: ${srtTimestamp}`);
  }

  return (
    Number(match.groups.hours) * 3600 +
    Number(match.groups.minutes) * 60 +
    Number(match.groups.seconds) +
    Number(match.groups.milliseconds) / 1000
  );
}
