import { formatSecondsAfterMidnightAsChunkTimestampLabel } from "./FormatSecondsAfterMidnightAsChunkTimestampLabel.js";

const HONG_KONG_UTC_OFFSET_HOURS = 8;
const HONG_KONG_UTC_OFFSET_LABEL = "+08:00";
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

function padNumber(value, targetLength) {
  return String(value).padStart(targetLength, "0");
}

function parseDateStamp(dateStamp) {
  return {
    year: Number(dateStamp.slice(0, 4)),
    month: Number(dateStamp.slice(4, 6)),
    day: Number(dateStamp.slice(6, 8)),
  };
}

function formatDateTimeComponentFromUtcDate(date) {
  return `${date.getUTCFullYear()}-${padNumber(
    date.getUTCMonth() + 1,
    2,
  )}-${padNumber(date.getUTCDate(), 2)}T${padNumber(
    date.getUTCHours(),
    2,
  )}:${padNumber(date.getUTCMinutes(), 2)}:${padNumber(
    date.getUTCSeconds(),
    2,
  )}.${padNumber(date.getUTCMilliseconds(), 3)}${HONG_KONG_UTC_OFFSET_LABEL}`;
}

function buildAbsoluteDateTimeMetadata({ dateStamp, secondsAfterMidnight }) {
  const { year, month, day } = parseDateStamp(dateStamp);
  const millisecondsAfterMidnight = Math.round(secondsAfterMidnight * 1000);
  const localDateTimeAsUtcClockMilliseconds =
    Date.UTC(year, month - 1, day) + millisecondsAfterMidnight;

  return {
    dateTime: formatDateTimeComponentFromUtcDate(
      new Date(localDateTimeAsUtcClockMilliseconds),
    ),
    unixTimestampMilliseconds:
      localDateTimeAsUtcClockMilliseconds -
      HONG_KONG_UTC_OFFSET_HOURS * MILLISECONDS_PER_HOUR,
  };
}

export function buildMaritimeTranscriptAnalysisDebugContext({
  chunk,
  strategyName,
  rawTranscriptText,
  promptBiasRules,
}) {
  const absoluteStartDateTimeMetadata = buildAbsoluteDateTimeMetadata({
    dateStamp: chunk.sourceRecording.dateStamp,
    secondsAfterMidnight: chunk.absoluteStartSecondsAfterMidnight,
  });
  const absoluteEndDateTimeMetadata = buildAbsoluteDateTimeMetadata({
    dateStamp: chunk.sourceRecording.dateStamp,
    secondsAfterMidnight: chunk.absoluteEndSecondsAfterMidnight,
  });

  return Object.freeze({
    strategyName,
    chunkFilePath: chunk.outputFilePath,
    chunkFileName: chunk.outputFileName,
    sourceFilePath: chunk.sourceRecording.sourceFilePath,
    sourceFileNameWithoutExtension: chunk.sourceRecording.fileNameWithoutExtension,
    sourceRelativeDirectoryPath: chunk.sourceRecording.relativeDirectoryPath,
    recordingDateStamp: chunk.sourceRecording.dateStamp,
    recordingTimeZone: "Asia/Hong_Kong",
    channel: chunk.sourceRecording.channel,
    chunkStartSeconds: chunk.chunkStartSeconds,
    chunkEndSeconds: chunk.chunkEndSeconds,
    chunkDurationSeconds: chunk.chunkDurationSeconds,
    absoluteStartSecondsAfterMidnight:
      chunk.absoluteStartSecondsAfterMidnight,
    absoluteEndSecondsAfterMidnight: chunk.absoluteEndSecondsAfterMidnight,
    absoluteStartTimestampLabel:
      formatSecondsAfterMidnightAsChunkTimestampLabel(
        chunk.absoluteStartSecondsAfterMidnight,
      ),
    absoluteEndTimestampLabel: formatSecondsAfterMidnightAsChunkTimestampLabel(
      chunk.absoluteEndSecondsAfterMidnight,
    ),
    absoluteStartDateTime: absoluteStartDateTimeMetadata.dateTime,
    absoluteEndDateTime: absoluteEndDateTimeMetadata.dateTime,
    absoluteStartUnixTimestampMilliseconds:
      absoluteStartDateTimeMetadata.unixTimestampMilliseconds,
    absoluteEndUnixTimestampMilliseconds:
      absoluteEndDateTimeMetadata.unixTimestampMilliseconds,
    rawTranscriptText,
    promptBiasRules,
  });
}
