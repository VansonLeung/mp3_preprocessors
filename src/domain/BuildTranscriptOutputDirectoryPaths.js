import path from "node:path";

export function buildTranscriptOutputDirectoryPaths({
  outputsDirectoryPath,
  strategyName,
  language,
  chunk,
}) {
  const sourceFolderRelativePath = path.join(
    chunk.sourceRecording.relativeDirectoryPath,
    chunk.sourceRecording.fileNameWithoutExtension,
  );

  return {
    relativeTranscriptOutputDirectoryPath: path.join(
      outputsDirectoryPath,
      "transcripts",
      "chunks",
      strategyName,
      language,
      "relative",
      sourceFolderRelativePath,
    ),
    absoluteSrtOutputDirectoryPath: path.join(
      outputsDirectoryPath,
      "transcripts",
      "chunks",
      strategyName,
      language,
      "absolute",
      sourceFolderRelativePath,
    ),
    analysisOutputDirectoryPath: path.join(
      outputsDirectoryPath,
      "analysis",
      "chunks",
      strategyName,
      language,
      sourceFolderRelativePath,
    ),
  };
}
