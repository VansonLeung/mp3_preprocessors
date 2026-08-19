import fs from "node:fs/promises";
import path from "node:path";
import { createAsrTranscriptModel } from "../../models/AsrTranscriptModel.js";
import { formatSecondsAsSrtTimestamp } from "../../domain/FormatSecondsAsSrtTimestamp.js";
import { buildProviderUrlAdapter } from "../http/BuildProviderUrlAdapter.js";
import { readServerSentEventsResponseAdapter } from "../http/ReadServerSentEventsResponseAdapter.js";

function extractTextFromAsrJsonResponse(jsonResponse) {
  return (
    jsonResponse.text ??
    jsonResponse.transcript ??
    jsonResponse.choices?.[0]?.message?.content ??
    ""
  );
}

function extractSrtFromAsrJsonResponse(jsonResponse) {
  if (jsonResponse.srt) {
    return jsonResponse.srt;
  }

  if (!Array.isArray(jsonResponse.segments)) {
    return null;
  }

  return jsonResponse.segments
    .map((segment, index) => {
      const startSeconds = Number(segment.start);
      const endSeconds = Number(segment.end);

      if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
        return null;
      }

      return `${index + 1}
${formatSecondsAsSrtTimestamp(startSeconds)} --> ${formatSecondsAsSrtTimestamp(
        endSeconds,
      )}
${segment.text ?? ""}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function extractTextDeltaFromAsrStreamingChunk(streamingChunk) {
  return (
    streamingChunk.delta ??
    streamingChunk.text ??
    streamingChunk.transcript ??
    streamingChunk.choices?.[0]?.delta?.content ??
    ""
  );
}

export async function transcribeAudioWithOpenAiCompatibleAsrAdapter({
  asrBaseUrl,
  asrApiKey,
  asrTranscriptionsPath,
  asrModel,
  asrResponseFormat,
  asrPrompt,
  asrHotwords,
  asrVocabulary,
  audioFilePath,
  language,
  enableStreaming,
  callbacks,
}) {
  const audioFileBuffer = await fs.readFile(audioFilePath);
  const requestBody = new FormData();

  requestBody.append("model", asrModel);
  requestBody.append(
    "file",
    new Blob([audioFileBuffer], { type: "audio/mpeg" }),
    path.basename(audioFilePath),
  );
  requestBody.append("response_format", asrResponseFormat);

  if (asrPrompt) {
    requestBody.append("prompt", asrPrompt);
  }

  if (asrHotwords) {
    requestBody.append("hotwords", asrHotwords);
  }

  if (asrVocabulary) {
    requestBody.append("vocabulary", asrVocabulary);
  }

  if (language && language !== "auto") {
    requestBody.append("language", language);
  }

  if (enableStreaming) {
    requestBody.append("stream", "true");
  }

  const response = await fetch(
    buildProviderUrlAdapter({
      baseUrl: asrBaseUrl,
      endpointPath: asrTranscriptionsPath,
    }),
    {
      method: "POST",
      headers: {
        ...(asrApiKey ? { Authorization: `Bearer ${asrApiKey}` } : {}),
        Accept: enableStreaming ? "text/event-stream" : "application/json",
      },
      body: requestBody,
    },
  );

  if (!response.ok) {
    throw new Error(
      `ASR request failed with status ${response.status}: ${await response.text()}`,
    );
  }

  if (!enableStreaming) {
    const jsonResponse = await response.json();
    return createAsrTranscriptModel({
      provider: "openai-compatible",
      model: asrModel,
      language,
      text: extractTextFromAsrJsonResponse(jsonResponse),
      relativeSrtContents: extractSrtFromAsrJsonResponse(jsonResponse),
      rawResponse: jsonResponse,
    });
  }

  let streamedText = "";
  const rawStreamingChunks = [];

  await readServerSentEventsResponseAdapter({
    response,
    callbacks,
    onServerSentEvent({ data }) {
      if (!data || data === "[DONE]") {
        return;
      }

      try {
        const streamingChunk = JSON.parse(data);
        rawStreamingChunks.push(streamingChunk);
        const textDelta = extractTextDeltaFromAsrStreamingChunk(streamingChunk);
        if (textDelta) {
          streamedText += textDelta;
          callbacks?.onAsrStreamTextDelta?.({ language, textDelta });
        }
      } catch {
        streamedText += data;
        callbacks?.onAsrStreamTextDelta?.({ language, textDelta: data });
      }
    },
  });

  return createAsrTranscriptModel({
    provider: "openai-compatible",
    model: asrModel,
    language,
    text: streamedText,
    rawResponse: rawStreamingChunks,
  });
}
