import fs from "node:fs/promises";
import path from "node:path";

async function recursivelyFindMp3FilePaths(directoryPath) {
  const directoryEntries = await fs.readdir(directoryPath, {
    withFileTypes: true,
  });

  const discoveredFilePaths = [];

  for (const directoryEntry of directoryEntries) {
    const entryPath = path.join(directoryPath, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      discoveredFilePaths.push(...(await recursivelyFindMp3FilePaths(entryPath)));
      continue;
    }

    if (directoryEntry.isFile() && directoryEntry.name.endsWith(".mp3")) {
      discoveredFilePaths.push(entryPath);
    }
  }

  return discoveredFilePaths;
}

export async function discoverMaritimeRecordingInputFilesAdapter({
  inputsDirectoryPath,
  selectedInputPaths = [],
}) {
  if (selectedInputPaths.length === 0) {
    const discoveredFilePaths =
      await recursivelyFindMp3FilePaths(inputsDirectoryPath);

    return discoveredFilePaths.sort((left, right) => left.localeCompare(right));
  }

  const discoveredFilePaths = [];

  for (const selectedInputPath of selectedInputPaths) {
    const resolvedSelectedInputPath = path.isAbsolute(selectedInputPath)
      ? selectedInputPath
      : path.resolve(process.cwd(), selectedInputPath);
    const selectedInputStats = await fs.stat(resolvedSelectedInputPath);

    if (selectedInputStats.isDirectory()) {
      discoveredFilePaths.push(
        ...(await recursivelyFindMp3FilePaths(resolvedSelectedInputPath)),
      );
      continue;
    }

    if (
      selectedInputStats.isFile() &&
      resolvedSelectedInputPath.endsWith(".mp3")
    ) {
      discoveredFilePaths.push(resolvedSelectedInputPath);
      continue;
    }

    throw new Error(
      `Selected input must be an MP3 file or directory: ${selectedInputPath}`,
    );
  }

  return [...new Set(discoveredFilePaths)].sort((left, right) =>
    left.localeCompare(right),
  );
}
