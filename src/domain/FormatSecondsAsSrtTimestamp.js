function padNumber(value, targetLength) {
  return String(value).padStart(targetLength, "0");
}

export function formatSecondsAsSrtTimestamp(seconds) {
  const roundedMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(roundedMilliseconds / 3600000);
  const minutes = Math.floor((roundedMilliseconds % 3600000) / 60000);
  const wholeSeconds = Math.floor((roundedMilliseconds % 60000) / 1000);
  const milliseconds = roundedMilliseconds % 1000;

  return `${padNumber(hours, 2)}:${padNumber(minutes, 2)}:${padNumber(
    wholeSeconds,
    2,
  )},${padNumber(milliseconds, 3)}`;
}
