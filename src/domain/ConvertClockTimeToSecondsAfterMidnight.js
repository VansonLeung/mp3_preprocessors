export function convertClockTimeToSecondsAfterMidnight(clockTime) {
  if (!/^\d{4}$/.test(clockTime)) {
    throw new Error(`Invalid HHmm clock time: ${clockTime}`);
  }

  const hours = Number(clockTime.slice(0, 2));
  const minutes = Number(clockTime.slice(2, 4));

  if (hours > 23 || minutes > 59) {
    throw new Error(`Invalid HHmm clock time: ${clockTime}`);
  }

  return hours * 3600 + minutes * 60;
}
