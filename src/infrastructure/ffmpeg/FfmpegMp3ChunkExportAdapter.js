import { spawnCommandAdapter } from "../process/SpawnCommandAdapter.js";

export async function exportMp3ChunkWithFfmpegAdapter({
  ffmpegCommand,
  inputFilePath,
  outputFilePath,
  chunkStartSeconds,
  chunkDurationSeconds,
  exportMp3Bitrate,
  callbacks,
}) {
  await spawnCommandAdapter({
    command: ffmpegCommand,
    args: [
      "-hide_banner",
      "-y",
      "-ss",
      String(chunkStartSeconds),
      "-t",
      String(chunkDurationSeconds),
      "-i",
      inputFilePath,
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      exportMp3Bitrate,
      outputFilePath,
    ],
    callbacks,
  });
}
