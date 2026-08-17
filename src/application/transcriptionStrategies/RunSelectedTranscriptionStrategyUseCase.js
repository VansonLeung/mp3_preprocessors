import {
  BLANK_ASR_TRANSCRIPTION_STRATEGY_NAME,
  runBlankAsrTranscriptionStrategy,
} from "./BlankAsrTranscriptionStrategy.js";
import {
  BLANK_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
  runBlankAsrWithMaritimeLlmAnalysisStrategy,
} from "./BlankAsrWithMaritimeLlmAnalysisStrategy.js";
import {
  MULTI_LANGUAGE_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
  runMultiLanguageAsrWithMaritimeLlmAnalysisStrategy,
} from "./MultiLanguageAsrWithMaritimeLlmAnalysisStrategy.js";

export async function runSelectedTranscriptionStrategyUseCase({
  chunk,
  configuration,
  callbacks,
}) {
  if (configuration.transcriptionStrategy === BLANK_ASR_TRANSCRIPTION_STRATEGY_NAME) {
    return runBlankAsrTranscriptionStrategy({ chunk, configuration, callbacks });
  }

  if (
    configuration.transcriptionStrategy ===
    BLANK_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME
  ) {
    return runBlankAsrWithMaritimeLlmAnalysisStrategy({
      chunk,
      configuration,
      callbacks,
    });
  }

  if (
    configuration.transcriptionStrategy ===
    MULTI_LANGUAGE_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME
  ) {
    return runMultiLanguageAsrWithMaritimeLlmAnalysisStrategy({
      chunk,
      configuration,
      callbacks,
    });
  }

  throw new Error(
    `Unknown transcription strategy: ${configuration.transcriptionStrategy}`,
  );
}
