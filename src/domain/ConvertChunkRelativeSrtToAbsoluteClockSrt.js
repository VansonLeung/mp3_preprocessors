import { convertSrtTimestampToSeconds } from "./ConvertSrtTimestampToSeconds.js";
import { formatSecondsAsSrtTimestamp } from "./FormatSecondsAsSrtTimestamp.js";

const SRT_TIMING_LINE_PATTERN =
  /(?<startTimestamp>\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(?<endTimestamp>\d{2}:\d{2}:\d{2},\d{3})(?<settings>.*)$/;

export function convertChunkRelativeSrtToAbsoluteClockSrt({
  relativeSrtContents,
  sourceRecording,
  chunkStartSeconds,
}) {
  return relativeSrtContents
    .split(/\r?\n/)
    .map((line) => {
      const timingLineMatch = line.match(SRT_TIMING_LINE_PATTERN);

      if (!timingLineMatch?.groups) {
        return line;
      }

      const relativeStartSeconds = convertSrtTimestampToSeconds(
        timingLineMatch.groups.startTimestamp,
      );
      const relativeEndSeconds = convertSrtTimestampToSeconds(
        timingLineMatch.groups.endTimestamp,
      );
      const absoluteStartSeconds =
        sourceRecording.scheduledStartSecondsAfterMidnight +
        chunkStartSeconds +
        relativeStartSeconds;
      const absoluteEndSeconds =
        sourceRecording.scheduledStartSecondsAfterMidnight +
        chunkStartSeconds +
        relativeEndSeconds;

      return `${formatSecondsAsSrtTimestamp(
        absoluteStartSeconds,
      )} --> ${formatSecondsAsSrtTimestamp(absoluteEndSeconds)}${
        timingLineMatch.groups.settings
      }`;
    })
    .join("\n");
}
