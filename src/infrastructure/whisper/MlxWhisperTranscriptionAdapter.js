import fs from "node:fs/promises";
import path from "node:path";
import { createTranscriptionResultModel } from "../../models/TranscriptionResultModel.js";
import { spawnCommandAdapter } from "../process/SpawnCommandAdapter.js";
import { ensureOutputDirectoryExistsAdapter } from "../filesystem/OutputDirectoryCreationAdapter.js";
import { writeChunkAbsoluteSrtFileAdapter } from "../filesystem/ChunkAbsoluteSrtFileWriterAdapter.js";

async function findGeneratedTranscriptionFilePath({
  whisperOutputDirectoryPath,
  chunkOutputFileName,
  extension,
}) {
  const expectedFilePath = path.join(
    whisperOutputDirectoryPath,
    `${path.basename(chunkOutputFileName, ".mp3")}.${extension}`,
  );

  try {
    await fs.access(expectedFilePath);
    return expectedFilePath;
  } catch {
    return null;
  }
}

export async function transcribeMp3ChunkWithMlxWhisperAdapter({
  whisperCommand,
  whisperModel,
  whisperLanguage,
  chunk,
  transcriptOutputDirectoryPath,
  absoluteSrtOutputDirectoryPath,
  callbacks,
}) {
  await ensureOutputDirectoryExistsAdapter({
    directoryPath: transcriptOutputDirectoryPath,
  });

  const args = [
    chunk.outputFilePath,
    "--model",
    whisperModel,
    "--output-name",
    path.basename(chunk.outputFileName, ".mp3"),
    "--output-dir",
    transcriptOutputDirectoryPath,
    "--output-format",
    "all",
    "--verbose",
    "False",
  ];

  if (whisperLanguage && whisperLanguage !== "auto") {
    args.push("--language", whisperLanguage);
  }

  await spawnCommandAdapter({
    command: whisperCommand,
    args,
    callbacks,
  });

  const relativeSrtFilePath = await findGeneratedTranscriptionFilePath({
    whisperOutputDirectoryPath: transcriptOutputDirectoryPath,
    chunkOutputFileName: chunk.outputFileName,
    extension: "srt",
  });
  const absoluteSrtFilePath = await writeChunkAbsoluteSrtFileAdapter({
    relativeSrtFilePath,
    absoluteSrtFilePath: path.join(
      absoluteSrtOutputDirectoryPath,
      `${path.basename(chunk.outputFileName, ".mp3")}.absolute.srt`,
    ),
    chunk,
  });

  return createTranscriptionResultModel({
    chunk,
    textFilePath: await findGeneratedTranscriptionFilePath({
      whisperOutputDirectoryPath: transcriptOutputDirectoryPath,
      chunkOutputFileName: chunk.outputFileName,
      extension: "txt",
    }),
    relativeSrtFilePath,
    absoluteSrtFilePath,
    whisperOutputDirectoryPath: transcriptOutputDirectoryPath,
  });
}
