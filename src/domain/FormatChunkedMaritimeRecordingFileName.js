import { formatSecondsAfterMidnightAsChunkTimestampLabel } from "./FormatSecondsAfterMidnightAsChunkTimestampLabel.js";

export function formatChunkedMaritimeRecordingFileName({
  sourceRecording,
  absoluteStartSecondsAfterMidnight,
  absoluteEndSecondsAfterMidnight,
}) {
  const startLabel = formatSecondsAfterMidnightAsChunkTimestampLabel(
    absoluteStartSecondsAfterMidnight,
  );
  const endLabel = formatSecondsAfterMidnightAsChunkTimestampLabel(
    absoluteEndSecondsAfterMidnight,
  );

  return `${sourceRecording.fileNameWithoutExtension}__${startLabel}__${endLabel}.mp3`;
}
