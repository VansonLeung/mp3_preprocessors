import { formatSecondsAfterMidnightAsChunkTimestampLabel } from "./FormatSecondsAfterMidnightAsChunkTimestampLabel.js";

export function formatMergedChunkedMaritimeRecordingFileName({
  sourceRecording,
  absoluteStartSecondsAfterMidnight,
  absoluteEndSecondsAfterMidnight,
  mergedChunkIndex,
}) {
  const startLabel = formatSecondsAfterMidnightAsChunkTimestampLabel(
    absoluteStartSecondsAfterMidnight,
  );
  const endLabel = formatSecondsAfterMidnightAsChunkTimestampLabel(
    absoluteEndSecondsAfterMidnight,
  );
  const mergedChunkIndexLabel = String(mergedChunkIndex + 1).padStart(3, "0");

  return `${sourceRecording.fileNameWithoutExtension}__${startLabel}__${endLabel}__merged_${mergedChunkIndexLabel}.mp3`;
}
