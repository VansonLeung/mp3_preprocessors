import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnCommandAdapter } from "../process/SpawnCommandAdapter.js";
import { ensureOutputDirectoryExistsAdapter } from "../filesystem/OutputDirectoryCreationAdapter.js";

function escapeConcatFilePathForFfmpeg(filePath) {
  return filePath.replaceAll("'", "'\\''");
}

async function writeSilentMp3File({
  ffmpegCommand,
  temporaryDirectoryPath,
  silenceDurationSeconds,
  exportMp3Bitrate,
  callbacks,
}) {
  const silentMp3FilePath = path.join(temporaryDirectoryPath, "silence.mp3");

  await spawnCommandAdapter({
    command: ffmpegCommand,
    args: [
      "-hide_banner",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-t",
      String(silenceDurationSeconds),
      "-codec:a",
      "libmp3lame",
      "-b:a",
      exportMp3Bitrate,
      silentMp3FilePath,
    ],
    callbacks,
  });

  return silentMp3FilePath;
}

export async function concatenateMp3ChunksWithFfmpegAdapter({
  ffmpegCommand,
  mergedChunk,
  exportMp3Bitrate,
  insertedSilenceSeconds,
  reencodeAudio,
  callbacks,
}) {
  await ensureOutputDirectoryExistsAdapter({
    directoryPath: path.dirname(mergedChunk.outputFilePath),
  });

  const temporaryDirectoryPath = await fs.mkdtemp(
    path.join(os.tmpdir(), "maritime-chunk-concat-"),
  );
  const insertedSilenceMp3FilePath =
    insertedSilenceSeconds > 0
      ? await writeSilentMp3File({
          ffmpegCommand,
          temporaryDirectoryPath,
          silenceDurationSeconds: insertedSilenceSeconds,
          exportMp3Bitrate,
          callbacks,
        })
      : null;
  const concatListFilePath = path.join(temporaryDirectoryPath, "concat-list.txt");
  const concatFileLines = [];

  for (const [
    componentChunkIndex,
    componentChunk,
  ] of mergedChunk.componentChunks.entries()) {
    concatFileLines.push(
      `file '${escapeConcatFilePathForFfmpeg(componentChunk.outputFilePath)}'`,
    );

    if (
      insertedSilenceMp3FilePath &&
      componentChunkIndex < mergedChunk.componentChunks.length - 1
    ) {
      concatFileLines.push(
        `file '${escapeConcatFilePathForFfmpeg(insertedSilenceMp3FilePath)}'`,
      );
    }
  }

  await fs.writeFile(
    concatListFilePath,
    `${concatFileLines.join("\n")}\n`,
    "utf8",
  );

  const codecArgs = reencodeAudio
    ? ["-codec:a", "libmp3lame", "-b:a", exportMp3Bitrate]
    : ["-codec", "copy"];

  try {
    await spawnCommandAdapter({
      command: ffmpegCommand,
      args: [
        "-hide_banner",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListFilePath,
        "-vn",
        ...codecArgs,
        mergedChunk.outputFilePath,
      ],
      callbacks,
    });
  } finally {
    await fs.rm(temporaryDirectoryPath, { recursive: true, force: true });
  }
}
