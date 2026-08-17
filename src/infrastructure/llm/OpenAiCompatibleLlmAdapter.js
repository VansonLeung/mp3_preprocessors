import { buildProviderUrlAdapter } from "../http/BuildProviderUrlAdapter.js";
import { readServerSentEventsResponseAdapter } from "../http/ReadServerSentEventsResponseAdapter.js";

function extractContentFromChatCompletionResponse(jsonResponse) {
  return jsonResponse.choices?.[0]?.message?.content ?? "";
}

function extractContentDeltaFromChatCompletionChunk(streamingChunk) {
  return streamingChunk.choices?.[0]?.delta?.content ?? "";
}

export async function createChatCompletionWithOpenAiCompatibleLlmAdapter({
  llmBaseUrl,
  llmApiKey,
  llmChatCompletionsPath,
  llmModel,
  llmMaxTokens,
  enableStreaming,
  messages,
  callbacks,
}) {
  const response = await fetch(
    buildProviderUrlAdapter({
      baseUrl: llmBaseUrl,
      endpointPath: llmChatCompletionsPath,
    }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(llmApiKey ? { Authorization: `Bearer ${llmApiKey}` } : {}),
        Accept: enableStreaming ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify({
        model: llmModel,
        messages,
        max_tokens: llmMaxTokens,
        stream: enableStreaming,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `LLM request failed with status ${response.status}: ${await response.text()}`,
    );
  }

  if (!enableStreaming) {
    const jsonResponse = await response.json();
    return {
      model: llmModel,
      content: extractContentFromChatCompletionResponse(jsonResponse),
      rawResponse: jsonResponse,
    };
  }

  let streamedContent = "";
  const rawStreamingChunks = [];

  await readServerSentEventsResponseAdapter({
    response,
    callbacks,
    onServerSentEvent({ data }) {
      if (!data || data === "[DONE]") {
        return;
      }

      const streamingChunk = JSON.parse(data);
      rawStreamingChunks.push(streamingChunk);
      const contentDelta =
        extractContentDeltaFromChatCompletionChunk(streamingChunk);

      if (contentDelta) {
        streamedContent += contentDelta;
        callbacks?.onLlmStreamTextDelta?.({ contentDelta });
      }
    },
  });

  return {
    model: llmModel,
    content: streamedContent,
    rawResponse: rawStreamingChunks,
  };
}
