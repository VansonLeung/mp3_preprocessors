import { createTranscriptionResultModel } from "../../models/TranscriptionResultModel.js";
import { buildTranscriptOutputDirectoryPaths } from "../../domain/BuildTranscriptOutputDirectoryPaths.js";
import { writeMaritimeTranscriptAnalysisFilesAdapter } from "../../infrastructure/filesystem/MaritimeTranscriptAnalysisFileWriterAdapter.js";
import { analyzeMaritimeTranscriptWithLlmUseCase } from "./AnalyzeMaritimeTranscriptWithLlmUseCase.js";
import { runAsrForChunkUseCase } from "./RunAsrForChunkUseCase.js";

export const BLANK_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME =
  "blank-asr-maritime-analysis";

export async function runBlankAsrWithMaritimeLlmAnalysisStrategy({
  chunk,
  configuration,
  callbacks,
}) {
  const transcriptionResult = await runAsrForChunkUseCase({
    chunk,
    configuration,
    strategyName: BLANK_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
    language: "auto",
    callbacks,
  });
  const analysis = await analyzeMaritimeTranscriptWithLlmUseCase({
    configuration,
    strategyName: BLANK_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
    transcriptionResult,
    callbacks,
  });

  if (!analysis) {
    return transcriptionResult;
  }

  const outputDirectoryPaths = buildTranscriptOutputDirectoryPaths({
    outputsDirectoryPath: configuration.outputsDirectoryPath,
    strategyName: BLANK_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
    language: "auto",
    chunk,
  });
  const analysisFilePaths = await writeMaritimeTranscriptAnalysisFilesAdapter({
    chunk,
    strategyName: BLANK_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
    analysis,
    analysisOutputDirectoryPath: outputDirectoryPaths.analysisOutputDirectoryPath,
  });

  return createTranscriptionResultModel({
    ...transcriptionResult,
    analysisJsonFilePath: analysisFilePaths.analysisJsonFilePath,
    analysisMarkdownFilePath: analysisFilePaths.analysisMarkdownFilePath,
  });
}
