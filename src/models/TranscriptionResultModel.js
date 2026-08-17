export function createTranscriptionResultModel({
  chunk,
  strategyName,
  asrProvider,
  language,
  textFilePath,
  relativeSrtFilePath,
  absoluteSrtFilePath,
  analysisJsonFilePath = null,
  analysisMarkdownFilePath = null,
  childTranscriptionResults = [],
  transcriptionTiming = null,
  whisperOutputDirectoryPath,
}) {
  return Object.freeze({
    chunk,
    strategyName,
    asrProvider,
    language,
    textFilePath,
    relativeSrtFilePath,
    absoluteSrtFilePath,
    analysisJsonFilePath,
    analysisMarkdownFilePath,
    childTranscriptionResults,
    transcriptionTiming,
    whisperOutputDirectoryPath,
  });
}
