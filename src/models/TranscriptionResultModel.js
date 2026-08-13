export function createTranscriptionResultModel({
  chunk,
  textFilePath,
  relativeSrtFilePath,
  absoluteSrtFilePath,
  whisperOutputDirectoryPath,
}) {
  return Object.freeze({
    chunk,
    textFilePath,
    relativeSrtFilePath,
    absoluteSrtFilePath,
    whisperOutputDirectoryPath,
  });
}
