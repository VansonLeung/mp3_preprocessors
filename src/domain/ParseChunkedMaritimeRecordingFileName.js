import path from "node:path";
import { convertClockTimeToSecondsAfterMidnight } from "./ConvertClockTimeToSecondsAfterMidnight.js";

const CHUNKED_MARITIME_RECORDING_FILE_NAME_PATTERN =
  /^(?<dateStamp>\d{8})_(?<scheduledStartTime>\d{4})_(?<scheduledEndTime>\d{4})_(?<channel>[A-Z0-9]+)__(?<chunkStartLabel>\d{6}_\d{3})__(?<chunkEndLabel>\d{6}_\d{3})\.mp3$/;

function convertChunkTimestampLabelToSecondsAfterMidnight(chunkTimestampLabel) {
  const [hhmmss, milliseconds] = chunkTimestampLabel.split("_");
  const hours = Number(hhmmss.slice(0, 2));
  const minutes = Number(hhmmss.slice(2, 4));
  const seconds = Number(hhmmss.slice(4, 6));

  return hours * 3600 + minutes * 60 + seconds + Number(milliseconds) / 1000;
}

export function parseChunkedMaritimeRecordingFileName(filePath) {
  const baseName = path.basename(filePath);
  const matchedFileName = baseName.match(
    CHUNKED_MARITIME_RECORDING_FILE_NAME_PATTERN,
  );

  if (!matchedFileName?.groups) {
    throw new Error(
      `Invalid chunked maritime recording filename: ${baseName}. Expected YYYYMMDD_HHmm_HHmm_CHANNEL__HHmmss_SSS__HHmmss_SSS.mp3`,
    );
  }

  const {
    dateStamp,
    scheduledStartTime,
    scheduledEndTime,
    channel,
    chunkStartLabel,
    chunkEndLabel,
  } = matchedFileName.groups;
  const scheduledStartSecondsAfterMidnight =
    convertClockTimeToSecondsAfterMidnight(scheduledStartTime);
  const absoluteStartSecondsAfterMidnight =
    convertChunkTimestampLabelToSecondsAfterMidnight(chunkStartLabel);
  const absoluteEndSecondsAfterMidnight =
    convertChunkTimestampLabelToSecondsAfterMidnight(chunkEndLabel);

  return {
    fileNameWithoutExtension: `${dateStamp}_${scheduledStartTime}_${scheduledEndTime}_${channel}`,
    chunkFileNameWithoutExtension: baseName.slice(
      0,
      -path.extname(baseName).length,
    ),
    dateStamp,
    scheduledStartTime,
    scheduledEndTime,
    channel,
    scheduledStartSecondsAfterMidnight,
    scheduledEndSecondsAfterMidnight:
      convertClockTimeToSecondsAfterMidnight(scheduledEndTime),
    chunkStartSeconds:
      absoluteStartSecondsAfterMidnight - scheduledStartSecondsAfterMidnight,
    chunkEndSeconds:
      absoluteEndSecondsAfterMidnight - scheduledStartSecondsAfterMidnight,
    absoluteStartSecondsAfterMidnight,
    absoluteEndSecondsAfterMidnight,
  };
}
