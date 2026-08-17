import { createTranscriptionResultModel } from "../../models/TranscriptionResultModel.js";
import { buildTranscriptOutputDirectoryPaths } from "../../domain/BuildTranscriptOutputDirectoryPaths.js";
import { writeMaritimeTranscriptAnalysisFilesAdapter } from "../../infrastructure/filesystem/MaritimeTranscriptAnalysisFileWriterAdapter.js";
import { analyzeMaritimeTranscriptWithLlmUseCase } from "./AnalyzeMaritimeTranscriptWithLlmUseCase.js";
import { runAsrForChunkUseCase } from "./RunAsrForChunkUseCase.js";
import fs from "node:fs/promises";

export const MULTI_LANGUAGE_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME =
  "multilingual-asr-maritime-analysis";

const MULTILINGUAL_ASR_LANGUAGES = ["auto", "en", "zh", "yue"];

async function buildCombinedTranscriptTextForMultilingualAnalysis({
  childTranscriptionResults,
}) {
  const transcriptSections = [];

  for (const transcriptionResult of childTranscriptionResults) {
    const transcriptText = transcriptionResult.textFilePath
      ? await fs.readFile(transcriptionResult.textFilePath, "utf8")
      : "";
    transcriptSections.push(`## ASR language: ${transcriptionResult.language}

${transcriptText.trim()}`);
  }

  return transcriptSections.join("\n\n");
}

export async function runMultiLanguageAsrWithMaritimeLlmAnalysisStrategy({
  chunk,
  configuration,
  callbacks,
}) {
  const childTranscriptionResults = [];

  for (const language of MULTILINGUAL_ASR_LANGUAGES) {
    childTranscriptionResults.push(
      await runAsrForChunkUseCase({
        chunk,
        configuration,
        strategyName:
          MULTI_LANGUAGE_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
        language,
        callbacks,
      }),
    );
  }

  const primaryTranscriptionResult = childTranscriptionResults[0];
  const combinedTranscriptText =
    await buildCombinedTranscriptTextForMultilingualAnalysis({
      childTranscriptionResults,
    });
  const analysis = await analyzeMaritimeTranscriptWithLlmUseCase({
    configuration,
    strategyName: MULTI_LANGUAGE_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
    transcriptionResult: primaryTranscriptionResult,
    transcriptTextOverride: combinedTranscriptText,
    callbacks,
  });
  let analysisFilePaths = {
    analysisJsonFilePath: null,
    analysisMarkdownFilePath: null,
  };

  if (analysis) {
    const outputDirectoryPaths = buildTranscriptOutputDirectoryPaths({
      outputsDirectoryPath: configuration.outputsDirectoryPath,
      strategyName:
        MULTI_LANGUAGE_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
      language: "combined",
      chunk,
    });
    analysisFilePaths = await writeMaritimeTranscriptAnalysisFilesAdapter({
      chunk,
      strategyName:
        MULTI_LANGUAGE_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
      analysis,
      analysisOutputDirectoryPath:
        outputDirectoryPaths.analysisOutputDirectoryPath,
    });
  }

  return createTranscriptionResultModel({
    ...primaryTranscriptionResult,
    strategyName: MULTI_LANGUAGE_ASR_WITH_MARITIME_LLM_ANALYSIS_STRATEGY_NAME,
    language: "combined",
    analysisJsonFilePath: analysisFilePaths.analysisJsonFilePath,
    analysisMarkdownFilePath: analysisFilePaths.analysisMarkdownFilePath,
    childTranscriptionResults,
  });
}
