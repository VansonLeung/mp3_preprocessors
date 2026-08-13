import path from "node:path";
import { convertClockTimeToSecondsAfterMidnight } from "./ConvertClockTimeToSecondsAfterMidnight.js";

const MARITIME_RECORDING_FILE_NAME_PATTERN =
  /^(?<dateStamp>\d{8})_(?<scheduledStartTime>\d{4})_(?<scheduledEndTime>\d{4})_(?<channel>[A-Z0-9]+)\.mp3$/;

export function parseMaritimeRecordingFileName(filePath) {
  const baseName = path.basename(filePath);
  const matchedFileName = baseName.match(MARITIME_RECORDING_FILE_NAME_PATTERN);

  if (!matchedFileName?.groups) {
    throw new Error(
      `Invalid maritime recording filename: ${baseName}. Expected YYYYMMDD_HHmm_HHmm_CHANNEL.mp3`,
    );
  }

  const {
    dateStamp,
    scheduledStartTime,
    scheduledEndTime,
    channel,
  } = matchedFileName.groups;

  return {
    fileNameWithoutExtension: baseName.slice(0, -path.extname(baseName).length),
    dateStamp,
    scheduledStartTime,
    scheduledEndTime,
    channel,
    scheduledStartSecondsAfterMidnight:
      convertClockTimeToSecondsAfterMidnight(scheduledStartTime),
    scheduledEndSecondsAfterMidnight:
      convertClockTimeToSecondsAfterMidnight(scheduledEndTime),
  };
}
