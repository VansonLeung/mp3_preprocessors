import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createMaritimeTranscriptAnalysisModel } from "../../models/MaritimeTranscriptAnalysisModel.js";
import { buildProcessingTimingModel } from "../../domain/BuildProcessingTimingModel.js";
import { buildMaritimeTranscriptAnalysisDebugContext } from "../../domain/BuildMaritimeTranscriptAnalysisDebugContext.js";
import { buildMaritimeTranscriptAnalysisPromptBiasRules } from "../../domain/BuildMaritimeTranscriptAnalysisPromptBiasRules.js";
import { parseJsonObjectFromPossiblyMessyText } from "../../domain/ParseJsonObjectFromPossiblyMessyText.js";
import { createChatCompletionWithOpenAiCompatibleLlmAdapter } from "../../infrastructure/llm/OpenAiCompatibleLlmAdapter.js";

function buildPromptChunkContext(debugContext) {
  return {
    chunkFileName: debugContext.chunkFileName,
    channel: debugContext.channel,
    recordingDateStamp: debugContext.recordingDateStamp,
    recordingTimeZone: debugContext.recordingTimeZone,
    absoluteStartTimestampLabel: debugContext.absoluteStartTimestampLabel,
    absoluteEndTimestampLabel: debugContext.absoluteEndTimestampLabel,
    absoluteStartDateTime: debugContext.absoluteStartDateTime,
    absoluteEndDateTime: debugContext.absoluteEndDateTime,
    absoluteStartUnixTimestampMilliseconds:
      debugContext.absoluteStartUnixTimestampMilliseconds,
    absoluteEndUnixTimestampMilliseconds:
      debugContext.absoluteEndUnixTimestampMilliseconds,
  };
}

function buildMaritimeAnalysisMessages({
  transcriptText,
  strategyName,
  debugContext,
}) {
  return [
    {
      role: "system",
      content:
        "You analyze maritime radio transcripts. Return only valid JSON. Do not include markdown.",
    },
    {
      role: "user",
      content: `Analyze this ASR transcript from strategy "${strategyName}".

Classify whether it contains maritime command information, trash talk, radio noise, or other non-command content.
Extract vessel information and command information where present.
If language proportions are inferable, estimate spoken English, Cantonese, and Mandarin proportions as numbers from 0 to 1.
Use the prompt bias rules as domain hints, not guaranteed corrections. Preserve uncertainty when the transcript is unclear.
Include concise evidence-based remarks for debugging the classification and extraction. Do not provide hidden chain-of-thought.
Keep every string value short. Avoid quotation marks inside JSON string values.

Classification rules:
- maritime_command: operational maritime content is present, including instruction, request, warning, position report, berth or pier report, destination, navigational movement, traffic coordination, or safety information.
- maritime_hailing_or_call_test: vessel, agency, channel, or station names are repeatedly called, acknowledged, or thanked, but no operational instruction, request, warning, position, destination, or berth information is present.
- maritime_related_no_command: maritime terms, vessel names, agency names, ports, piers, or identifiers are present, but the transcript is too incomplete to classify as hailing or command.
- trash_talk: coherent non-maritime casual conversation.
- noise_or_empty: empty, pure noise, or unintelligible content with no reliable maritime signal. Do not use this if vessel names, agency names, piers, or maritime identifiers are present.
- other: content is coherent but does not fit the above.

Classification precedence:
- If a transcript contains vessel/station/callsign/numeric identifier plus berth, pier, wharf, anchorage, position, location, destination, route, or movement information, choose maritime_command.
- Choose maritime_hailing_or_call_test only when there is no operational location, berth, destination, position, request, warning, or instruction.
- For Chinese maritime text, terms like 码头, 一号位, 泊位, 锚地, 航道, 靠, 过红灯, 出来, 转过来 are operational signals.

Set hasMaritimeCommandInformation to true only for maritime_command. Set it to false for maritime_hailing_or_call_test and maritime_related_no_command.
Do not over-extract MMSI numbers. MMSI must be exactly nine reliable digits. Shorter numbers may be callsigns, berth numbers, channel numbers, or uncertain numeric identifiers.
When reading Chinese spoken numerals, convert only the digits that are explicitly present. Example: 六幺九六八六 is 619686, a six-digit numeric identifier, not MMSI.
In Mandarin radio numerals, 幺 means 一 / digit 1. Normalize numericIdentifiers to Arabic digits when the text is clearly a spoken number, for example 幺八八 -> 188. Keep the original text in vesselNames, callsigns, or uncertainties if it may be part of a name.
Preserve uncertain raw vessel/callsign text instead of inventing translated or romanized names.
Prompt bias rules may influence classification, but they must not create extracted entities. Only include a rule in promptBiasRulesApplied when its observed text or a close variant appears in the transcript.
Do not extract words like maaf, ma de, 马德, MARDEP, Marine Department, or 海事 as callsigns or vessel names unless the transcript clearly uses them as an identifier. Put suspected agencies in agencyNames. Put weak corrections in uncertainties.
For Chinese ASR, preserve the raw entity text. Example: if the transcript says 城墙三二, extract 城墙三二; do not rewrite it as 马德 32 or an invented romanization.

Conversation structure rules:
- Analyze whether the transcript is likely a single-speaker broadcast, hailing/call test, or multi-speaker exchange.
- This is text-inferred speaker attribution, not acoustic speaker diarization.
- Do not invent turn timestamps. Use the transcript text only.
- Acknowledgements like 收到, 好的...收到, vessel-name...收到 may indicate a responding speaker.
- Repeated patterns like 海事警告... vessel...收到 may indicate a marine department broadcast followed by vessel acknowledgement.
- Split acknowledgements such as 好的，工华收到 or 广信幺八八收到 into separate speakerTurnHypotheses.
- If text looks like X海事警告警告警告, infer speakerLabel 海事 and addressedTo X when plausible; X is usually the vessel being warned, not the speaker.
- Prefer real inferred entity names as speakerLabel, such as 海事, 工华, 广信幺八八. Use generic labels only when no entity is inferable.
- Do not merge a warning broadcast and a vessel acknowledgement into one speaker turn.
- If unsure, keep speaker labels generic and lower confidence.

Chunk context:
${JSON.stringify(buildPromptChunkContext(debugContext), null, 2)}

Prompt bias rules:
${JSON.stringify(debugContext.promptBiasRules, null, 2)}

Return this JSON shape:
{
  "hasMaritimeCommandInformation": true,
  "classification": "maritime_command | maritime_hailing_or_call_test | maritime_related_no_command | trash_talk | noise_or_empty | other",
  "recommendedHumanReviewLabel": "short label for review queues",
  "vesselInformation": {
    "vesselNames": [
      "...",
      ...
    ],
    "agencyNames": [
      "...",
      ...
    ],
    "callsigns": [
      "...",
      ...
    ],
    "mmsiNumbers": [
      "...",
      ...
    ],
    "numericIdentifiers": [
      "...",
      ...
    ],
    "locations": [
      "...",
      ...
    ],
    "destinations": [
      "...",
      ...
    ]
  },
  "commandInformation": {
    "commandTypes": [
      "...",
      ...
    ],
    "instructions": [
      "...",
      ...
    ],
    "warnings": [
      "...",
      ...
    ],
    "requests": [
      "...",
      ...
    ]
  },
  "conversationStructure": {
    "isLikelyMultiSpeakerConversation": true,
    "speakerCountEstimate": 2,
    "speakerCountConfidence": 0,
    "speakerAttributionMethod": "text_inferred_not_audio_diarization",
    "conversationPattern": "single_speaker_broadcast | hailing_acknowledgement | warning_acknowledgement | multi_vessel_exchange | unknown",
    "speakerTurnHypotheses": [
      {
        "speakerLabel": "...",
        "speakerRole": "marine_department | vessel | station | unknown",
        "addressedTo": "...",
        "text": "...",
        "evidence": [
          "...",
          ...
        ],
        "confidence": 0
      }
    ],
    "uncertainties": [
      "...",
      ...
    ]
  },
  "spokenLanguageProportions": {
    "english": 0,
    "cantonese": 0,
    "mandarin": 0,
    "unknown": 1
  },
  "confidence": 0,
  "analysisDescription": "Short plain-language summary of what the transcript appears to contain.",
  "analysisRemarks": {
    "classificationReasons": [
      "...",
      ...
    ],
    "extractionReasons": [
      "...",
      ...
    ],
    "languageAssessmentReasons": [
      "...",
      ...
    ],
    "uncertainties": [
      "...",
      ...
    ],
    "promptBiasRulesApplied": [
      "...",
      ...
    ],
    "classificationBoundaryReasons": [
      "...",
      ...
    ]
  }
}

Transcript:
${transcriptText}`,
    },
  ];
}

export async function analyzeMaritimeTranscriptWithLlmUseCase({
  configuration,
  strategyName,
  transcriptionResult,
  transcriptTextOverride = null,
  callbacks,
}) {
  if (!configuration.enableLlmLayer) {
    return null;
  }

  const analysisStartedAt = new Date();
  const analysisStartMilliseconds = performance.now();
  const transcriptText =
    transcriptTextOverride ??
    (transcriptionResult.textFilePath
      ? await fs.readFile(transcriptionResult.textFilePath, "utf8")
      : "");

  const promptBiasRules = buildMaritimeTranscriptAnalysisPromptBiasRules();
  const debugContext = buildMaritimeTranscriptAnalysisDebugContext({
    chunk: transcriptionResult.chunk,
    strategyName,
    rawTranscriptText: transcriptText,
    promptBiasRules,
  });
  const llmResult = await createChatCompletionWithOpenAiCompatibleLlmAdapter({
    llmBaseUrl: configuration.llmBaseUrl,
    llmApiKey: configuration.llmApiKey,
    llmChatCompletionsPath: configuration.llmChatCompletionsPath,
    llmModel: configuration.llmModel,
    llmMaxTokens: configuration.llmMaxTokens,
    enableStreaming: configuration.llmEnableStreaming,
    messages: buildMaritimeAnalysisMessages({
      transcriptText,
      strategyName,
      debugContext,
    }),
    callbacks,
  });
  let parsedAnalysis = null;
  let parseFailure = null;

  try {
    parsedAnalysis = parseJsonObjectFromPossiblyMessyText(llmResult.content);
  } catch (error) {
    parseFailure = {
      errorName: error.name,
      errorMessage: error.message,
      rawLlmResponseText: llmResult.content,
    };
    parsedAnalysis = {
      hasMaritimeCommandInformation: false,
      classification: "other",
      vesselInformation: {},
      commandInformation: {},
      spokenLanguageProportions: null,
      conversationStructure: {
        isLikelyMultiSpeakerConversation: false,
        speakerCountEstimate: 0,
        speakerCountConfidence: 0,
        speakerAttributionMethod: "text_inferred_not_audio_diarization",
        conversationPattern: "unknown",
        speakerTurnHypotheses: [],
        uncertainties: [
          "Conversation structure is unavailable because the LLM response could not be parsed.",
        ],
      },
      confidence: 0,
      analysisDescription:
        "The LLM response could not be parsed as JSON. Inspect analysisRemarks.parseFailure.rawLlmResponseText for debugging.",
      analysisRemarks: {
        classificationReasons: [],
        extractionReasons: [],
        languageAssessmentReasons: [],
        uncertainties: [
          "LLM analysis is unavailable because the provider returned malformed or truncated JSON.",
        ],
        promptBiasRulesApplied: [],
        parseFailure,
      },
    };
  }

  const analysisCompletedAt = new Date();
  const analysisDurationMilliseconds =
    performance.now() - analysisStartMilliseconds;
  const analysisTiming = buildProcessingTimingModel({
    startedAt: analysisStartedAt,
    completedAt: analysisCompletedAt,
    durationMilliseconds: analysisDurationMilliseconds,
  });

  return createMaritimeTranscriptAnalysisModel({
    strategyName,
    model: llmResult.model,
    hasMaritimeCommandInformation:
      parsedAnalysis.hasMaritimeCommandInformation ?? false,
    classification: parsedAnalysis.classification ?? "other",
    recommendedHumanReviewLabel:
      parsedAnalysis.recommendedHumanReviewLabel ?? "",
    vesselInformation: parsedAnalysis.vesselInformation ?? {},
    commandInformation: parsedAnalysis.commandInformation ?? {},
    conversationStructure: parsedAnalysis.conversationStructure ?? null,
    spokenLanguageProportions:
      parsedAnalysis.spokenLanguageProportions ?? null,
    confidence: parsedAnalysis.confidence ?? 0,
    analysisDescription: parsedAnalysis.analysisDescription ?? "",
    analysisRemarks: parsedAnalysis.analysisRemarks ?? {},
    transcriptionTiming: transcriptionResult.transcriptionTiming ?? null,
    analysisTiming,
    debugContext,
    llmResponseText: llmResult.content,
    rawResponse: llmResult.rawResponse,
  });
}
