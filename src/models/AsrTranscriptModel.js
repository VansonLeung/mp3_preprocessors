export function createAsrTranscriptModel({
  provider,
  model,
  language,
  text,
  relativeSrtContents = null,
  rawResponse = null,
}) {
  return Object.freeze({
    provider,
    model,
    language,
    text,
    relativeSrtContents,
    rawResponse,
  });
}
