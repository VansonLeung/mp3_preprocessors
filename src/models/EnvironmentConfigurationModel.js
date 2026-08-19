import path from "node:path";
import { buildDefaultMaritimeAsrPromptText } from "../domain/BuildDefaultMaritimeAsrPromptText.js";

function parseBooleanEnvironmentValue(rawValue, defaultValue) {
  if (rawValue === undefined || rawValue === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(rawValue).toLowerCase());
}

function parseNumberEnvironmentValue(rawValue, defaultValue, variableName) {
  if (rawValue === undefined || rawValue === "") {
    return defaultValue;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${variableName} must be a finite number.`);
  }

  return parsedValue;
}

function parseNullableNumberEnvironmentValue(rawValue, variableName) {
  if (rawValue === undefined || rawValue === "") {
    return null;
  }

  return parseNumberEnvironmentValue(rawValue, null, variableName);
}

function resolveWorkspaceRelativePath(workspaceDirectoryPath, configuredPath) {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(workspaceDirectoryPath, configuredPath);
}

export function createEnvironmentConfigurationModel({
  environmentVariables,
  workspaceDirectoryPath,
}) {
  const inputsDirectory = environmentVariables.INPUTS_DIRECTORY ?? "inputs";
  const outputsDirectory = environmentVariables.OUTPUTS_DIRECTORY ?? "outputs";

  const configuration = {
    workspaceDirectoryPath,
    inputsDirectoryPath: resolveWorkspaceRelativePath(
      workspaceDirectoryPath,
      inputsDirectory,
    ),
    outputsDirectoryPath: resolveWorkspaceRelativePath(
      workspaceDirectoryPath,
      outputsDirectory,
    ),
    ffmpegCommand: environmentVariables.FFMPEG_COMMAND ?? "ffmpeg",
    ffprobeCommand: environmentVariables.FFPROBE_COMMAND ?? "ffprobe",
    silenceNoiseThreshold:
      environmentVariables.SILENCE_NOISE_THRESHOLD ?? "-45dB",
    silenceMinimumDurationSeconds: parseNumberEnvironmentValue(
      environmentVariables.SILENCE_MINIMUM_DURATION_SECONDS,
      2,
      "SILENCE_MINIMUM_DURATION_SECONDS",
    ),
    minimumChunkDurationSeconds: parseNumberEnvironmentValue(
      environmentVariables.MINIMUM_CHUNK_DURATION_SECONDS,
      4,
      "MINIMUM_CHUNK_DURATION_SECONDS",
    ),
    maximumChunkDurationSeconds: parseNumberEnvironmentValue(
      environmentVariables.MAXIMUM_CHUNK_DURATION_SECONDS,
      60,
      "MAXIMUM_CHUNK_DURATION_SECONDS",
    ),
    chunkPaddingSeconds: parseNumberEnvironmentValue(
      environmentVariables.CHUNK_PADDING_SECONDS,
      0.35,
      "CHUNK_PADDING_SECONDS",
    ),
    shortSpeechMergeGapSeconds: parseNumberEnvironmentValue(
      environmentVariables.SHORT_SPEECH_MERGE_GAP_SECONDS,
      3,
      "SHORT_SPEECH_MERGE_GAP_SECONDS",
    ),
    exportMp3Bitrate: environmentVariables.EXPORT_MP3_BITRATE ?? "64k",
    enableChunkMerging: parseBooleanEnvironmentValue(
      environmentVariables.ENABLE_CHUNK_MERGING,
      true,
    ),
    mergedChunkMaximumDurationMinutes: parseNullableNumberEnvironmentValue(
      environmentVariables.MERGED_CHUNK_MAXIMUM_DURATION_MINUTES,
      "MERGED_CHUNK_MAXIMUM_DURATION_MINUTES",
    ),
    mergedChunkInsertSilenceSeconds: parseNumberEnvironmentValue(
      environmentVariables.MERGED_CHUNK_INSERT_SILENCE_SECONDS,
      0,
      "MERGED_CHUNK_INSERT_SILENCE_SECONDS",
    ),
    mergedChunkReencodeAudio: parseBooleanEnvironmentValue(
      environmentVariables.MERGED_CHUNK_REENCODE_AUDIO,
      true,
    ),
    enableTranscription: parseBooleanEnvironmentValue(
      environmentVariables.ENABLE_TRANSCRIPTION,
      false,
    ),
    transcriptionStrategy:
      environmentVariables.TRANSCRIPTION_STRATEGY ?? "blank-asr",
    whisperCommand: environmentVariables.WHISPER_COMMAND ?? "mlx_whisper",
    whisperModel:
      environmentVariables.WHISPER_MODEL ??
      "mlx-community/whisper-large-v3-turbo",
    whisperLanguage: environmentVariables.WHISPER_LANGUAGE ?? "auto",
    asrProvider: environmentVariables.ASR_PROVIDER ?? "mlx-whisper",
    asrBaseUrl: environmentVariables.ASR_BASE_URL ?? "",
    asrApiKey: environmentVariables.ASR_API_KEY ?? "",
    asrTranscriptionsPath:
      environmentVariables.ASR_TRANSCRIPTIONS_PATH ?? "/audio/transcriptions",
    asrModel: environmentVariables.ASR_MODEL ?? "",
    asrResponseFormat:
      environmentVariables.ASR_RESPONSE_FORMAT ?? "verbose_json",
    asrEnableStreaming: parseBooleanEnvironmentValue(
      environmentVariables.ASR_ENABLE_STREAMING,
      false,
    ),
    asrPrompt:
      environmentVariables.ASR_PROMPT === undefined
        ? buildDefaultMaritimeAsrPromptText()
        : environmentVariables.ASR_PROMPT,
    asrHotwords: environmentVariables.ASR_HOTWORDS ?? "",
    asrVocabulary: environmentVariables.ASR_VOCABULARY ?? "",
    llmBaseUrl: environmentVariables.LLM_BASE_URL ?? "",
    llmApiKey: environmentVariables.LLM_API_KEY ?? "",
    llmChatCompletionsPath:
      environmentVariables.LLM_CHAT_COMPLETIONS_PATH ?? "/chat/completions",
    llmModel: environmentVariables.LLM_MODEL ?? "",
    llmMaxTokens: parseNumberEnvironmentValue(
      environmentVariables.LLM_MAX_TOKENS,
      512,
      "LLM_MAX_TOKENS",
    ),
    llmEnableStreaming: parseBooleanEnvironmentValue(
      environmentVariables.LLM_ENABLE_STREAMING,
      true,
    ),
    enableLlmLayer: parseBooleanEnvironmentValue(
      environmentVariables.ENABLE_LLM_LAYER,
      false,
    ),
  };

  if (configuration.minimumChunkDurationSeconds <= 0) {
    throw new Error("MINIMUM_CHUNK_DURATION_SECONDS must be greater than 0.");
  }

  if (
    configuration.maximumChunkDurationSeconds <
    configuration.minimumChunkDurationSeconds
  ) {
    throw new Error(
      "MAXIMUM_CHUNK_DURATION_SECONDS must be greater than or equal to MINIMUM_CHUNK_DURATION_SECONDS.",
    );
  }

  if (
    configuration.mergedChunkMaximumDurationMinutes !== null &&
    configuration.mergedChunkMaximumDurationMinutes <= 0
  ) {
    throw new Error(
      "MERGED_CHUNK_MAXIMUM_DURATION_MINUTES must be empty or greater than 0.",
    );
  }

  if (configuration.mergedChunkInsertSilenceSeconds < 0) {
    throw new Error(
      "MERGED_CHUNK_INSERT_SILENCE_SECONDS must be greater than or equal to 0.",
    );
  }

  if (configuration.llmMaxTokens <= 0) {
    throw new Error("LLM_MAX_TOKENS must be greater than 0.");
  }

  return Object.freeze(configuration);
}
