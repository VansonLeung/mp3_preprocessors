import fs from "node:fs/promises";
import path from "node:path";
import { convertChunkRelativeSrtToAbsoluteClockSrt } from "../../domain/ConvertChunkRelativeSrtToAbsoluteClockSrt.js";
import { ensureOutputDirectoryExistsAdapter } from "./OutputDirectoryCreationAdapter.js";

export async function writeChunkAbsoluteSrtFileAdapter({
  relativeSrtFilePath,
  absoluteSrtFilePath,
  chunk,
}) {
  if (!relativeSrtFilePath) {
    return null;
  }

  const relativeSrtContents = await fs.readFile(relativeSrtFilePath, "utf8");
  const absoluteSrtContents = convertChunkRelativeSrtToAbsoluteClockSrt({
    relativeSrtContents,
    sourceRecording: chunk.sourceRecording,
    chunkStartSeconds: chunk.chunkStartSeconds,
  });

  await ensureOutputDirectoryExistsAdapter({
    directoryPath: path.dirname(absoluteSrtFilePath),
  });
  await fs.writeFile(absoluteSrtFilePath, absoluteSrtContents, "utf8");

  return absoluteSrtFilePath;
}
