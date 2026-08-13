function padNumber(value, targetLength) {
  return String(value).padStart(targetLength, "0");
}

export function formatSecondsAfterMidnightAsChunkTimestampLabel(
  secondsAfterMidnight,
) {
  const roundedMilliseconds = Math.round(secondsAfterMidnight * 1000);
  const millisecondsWithinDay =
    ((roundedMilliseconds % 86400000) + 86400000) % 86400000;

  const hours = Math.floor(millisecondsWithinDay / 3600000);
  const minutes = Math.floor((millisecondsWithinDay % 3600000) / 60000);
  const seconds = Math.floor((millisecondsWithinDay % 60000) / 1000);
  const milliseconds = millisecondsWithinDay % 1000;

  return `${padNumber(hours, 2)}${padNumber(minutes, 2)}${padNumber(
    seconds,
    2,
  )}_${padNumber(milliseconds, 3)}`;
}
