import fs from "node:fs/promises";
import path from "node:path";
import { createTranscriptionResultModel } from "../../models/TranscriptionResultModel.js";
import { writeChunkAbsoluteSrtFileAdapter } from "./ChunkAbsoluteSrtFileWriterAdapter.js";
import { ensureOutputDirectoryExistsAdapter } from "./OutputDirectoryCreationAdapter.js";

export async function writeAsrTranscriptFilesAdapter({
  chunk,
  strategyName,
  asrTranscript,
  transcriptOutputDirectoryPath,
  absoluteSrtOutputDirectoryPath,
}) {
  await ensureOutputDirectoryExistsAdapter({
    directoryPath: transcriptOutputDirectoryPath,
  });

  const baseFileName = path.basename(chunk.outputFileName, ".mp3");
  const textFilePath = path.join(transcriptOutputDirectoryPath, `${baseFileName}.txt`);
  const relativeSrtFilePath = asrTranscript.relativeSrtContents
    ? path.join(transcriptOutputDirectoryPath, `${baseFileName}.srt`)
    : null;

  await fs.writeFile(textFilePath, `${asrTranscript.text.trim()}\n`, "utf8");

  if (relativeSrtFilePath) {
    await fs.writeFile(
      relativeSrtFilePath,
      `${asrTranscript.relativeSrtContents.trim()}\n`,
      "utf8",
    );
  }

  const absoluteSrtFilePath = await writeChunkAbsoluteSrtFileAdapter({
    relativeSrtFilePath,
    absoluteSrtFilePath: path.join(
      absoluteSrtOutputDirectoryPath,
      `${baseFileName}.absolute.srt`,
    ),
    chunk,
  });

  return createTranscriptionResultModel({
    chunk,
    strategyName,
    asrProvider: asrTranscript.provider,
    language: asrTranscript.language,
    textFilePath,
    relativeSrtFilePath,
    absoluteSrtFilePath,
    whisperOutputDirectoryPath: transcriptOutputDirectoryPath,
  });
}
