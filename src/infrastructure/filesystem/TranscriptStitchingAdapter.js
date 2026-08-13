import fs from "node:fs/promises";
import path from "node:path";
import { ensureOutputDirectoryExistsAdapter } from "./OutputDirectoryCreationAdapter.js";

async function readTextFileIfPresent(filePath) {
  if (!filePath) {
    return "";
  }

  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function renumberSrtContents({ srtContents, startingCueNumber }) {
  const blocks = srtContents
    .trim()
    .split(/\r?\n\r?\n/)
    .filter(Boolean);
  let nextCueNumber = startingCueNumber;

  const renumberedBlocks = blocks.map((block) => {
    const lines = block.split(/\r?\n/);

    if (/^\d+$/.test(lines[0])) {
      lines[0] = String(nextCueNumber);
    } else {
      lines.unshift(String(nextCueNumber));
    }

    nextCueNumber += 1;
    return lines.join("\n");
  });

  return {
    srtContents: renumberedBlocks.join("\n\n"),
    nextCueNumber,
  };
}

async function writeStitchedTranscriptGroup({
  textFilePath,
  relativeSrtFilePath,
  absoluteSrtFilePath,
  transcriptionResults,
}) {
  await ensureOutputDirectoryExistsAdapter({
    directoryPath: path.dirname(textFilePath),
  });
  await ensureOutputDirectoryExistsAdapter({
    directoryPath: path.dirname(relativeSrtFilePath),
  });
  await ensureOutputDirectoryExistsAdapter({
    directoryPath: path.dirname(absoluteSrtFilePath),
  });

  const textParts = [];
  const relativeSrtParts = [];
  const absoluteSrtParts = [];
  let relativeCueNumber = 1;
  let absoluteCueNumber = 1;

  for (const transcriptionResult of transcriptionResults) {
    const textContents = await readTextFileIfPresent(
      transcriptionResult.textFilePath,
    );
    if (textContents.trim()) {
      textParts.push(textContents.trim());
    }

    const relativeSrtContents = await readTextFileIfPresent(
      transcriptionResult.relativeSrtFilePath,
    );
    if (relativeSrtContents.trim()) {
      const renumberedRelativeSrt = renumberSrtContents({
        srtContents: relativeSrtContents,
        startingCueNumber: relativeCueNumber,
      });
      relativeCueNumber = renumberedRelativeSrt.nextCueNumber;
      relativeSrtParts.push(renumberedRelativeSrt.srtContents);
    }

    const absoluteSrtContents = await readTextFileIfPresent(
      transcriptionResult.absoluteSrtFilePath,
    );
    if (absoluteSrtContents.trim()) {
      const renumberedAbsoluteSrt = renumberSrtContents({
        srtContents: absoluteSrtContents,
        startingCueNumber: absoluteCueNumber,
      });
      absoluteCueNumber = renumberedAbsoluteSrt.nextCueNumber;
      absoluteSrtParts.push(renumberedAbsoluteSrt.srtContents);
    }
  }

  await fs.writeFile(textFilePath, `${textParts.join("\n\n")}\n`, "utf8");
  await fs.writeFile(
    relativeSrtFilePath,
    `${relativeSrtParts.join("\n\n")}\n`,
    "utf8",
  );
  await fs.writeFile(
    absoluteSrtFilePath,
    `${absoluteSrtParts.join("\n\n")}\n`,
    "utf8",
  );

  return {
    textFilePath,
    relativeSrtFilePath,
    absoluteSrtFilePath,
  };
}

export async function stitchSourceRecordingTranscriptsAdapter({
  outputsDirectoryPath,
  sourceRecording,
  transcriptionResults,
}) {
  const sourceRecordingBaseDirectoryPath = path.join(
    outputsDirectoryPath,
    "transcripts",
    "source-recordings",
    sourceRecording.relativeDirectoryPath,
  );
  const baseFileName = sourceRecording.fileNameWithoutExtension;

  return writeStitchedTranscriptGroup({
    textFilePath: path.join(sourceRecordingBaseDirectoryPath, `${baseFileName}.txt`),
    relativeSrtFilePath: path.join(
      sourceRecordingBaseDirectoryPath,
      `${baseFileName}.relative.srt`,
    ),
    absoluteSrtFilePath: path.join(
      sourceRecordingBaseDirectoryPath,
      `${baseFileName}.absolute.srt`,
    ),
    transcriptionResults,
  });
}

export async function stitchDateChannelTranscriptsAdapter({
  outputsDirectoryPath,
  dateStamp,
  channel,
  transcriptionResults,
}) {
  const dateChannelDirectoryPath = path.join(
    outputsDirectoryPath,
    "transcripts",
    "date-channel",
    dateStamp,
    channel,
  );
  const baseFileName = `${dateStamp}_${channel}`;

  return writeStitchedTranscriptGroup({
    textFilePath: path.join(dateChannelDirectoryPath, `${baseFileName}.txt`),
    relativeSrtFilePath: path.join(
      dateChannelDirectoryPath,
      `${baseFileName}.relative.srt`,
    ),
    absoluteSrtFilePath: path.join(
      dateChannelDirectoryPath,
      `${baseFileName}.absolute.srt`,
    ),
    transcriptionResults,
  });
}
