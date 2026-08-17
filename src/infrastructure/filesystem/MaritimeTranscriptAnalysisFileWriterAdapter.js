import fs from "node:fs/promises";
import path from "node:path";
import { ensureOutputDirectoryExistsAdapter } from "./OutputDirectoryCreationAdapter.js";

function formatPromptBiasRulesMarkdown(promptBiasRules) {
  if (!promptBiasRules?.length) {
    return "- None\n";
  }

  return promptBiasRules
    .map(
      (promptBiasRule) =>
        `- ${promptBiasRule.ruleName}: ${promptBiasRule.observedTranscriptText} -> ${promptBiasRule.likelyCorrectMeaning}`,
    )
    .join("\n");
}

function formatAnalysisMarkdown({ analysis }) {
  const debugContext = analysis.debugContext ?? {};
  const transcriptionTiming = analysis.transcriptionTiming ?? {};
  const analysisTiming = analysis.analysisTiming ?? {};

  return `# Maritime Transcript Analysis

- Classification: ${analysis.classification}
- Review label: ${analysis.recommendedHumanReviewLabel ?? ""}
- Has maritime command information: ${analysis.hasMaritimeCommandInformation}
- Confidence: ${analysis.confidence}
- Transcription total duration: ${
    transcriptionTiming.totalDurationSeconds ?? ""
  }s (${transcriptionTiming.totalDurationMilliseconds ?? ""} ms)
- Analysis total duration: ${
    analysisTiming.totalDurationSeconds ?? ""
  }s (${analysisTiming.totalDurationMilliseconds ?? ""} ms)
- Chunk file: ${debugContext.chunkFilePath ?? ""}
- Channel: ${debugContext.channel ?? ""}
- Absolute start: ${debugContext.absoluteStartDateTime ?? ""}
- Absolute end: ${debugContext.absoluteEndDateTime ?? ""}

## Raw Transcript Text

\`\`\`text
${debugContext.rawTranscriptText ?? ""}
\`\`\`

## Analysis Description

${analysis.analysisDescription ?? ""}

## Analysis Remarks

\`\`\`json
${JSON.stringify(analysis.analysisRemarks ?? {}, null, 2)}
\`\`\`

## Vessel Information

\`\`\`json
${JSON.stringify(analysis.vesselInformation, null, 2)}
\`\`\`

## Command Information

\`\`\`json
${JSON.stringify(analysis.commandInformation, null, 2)}
\`\`\`

## Spoken Language Proportions

\`\`\`json
${JSON.stringify(analysis.spokenLanguageProportions, null, 2)}
\`\`\`

## Prompt Bias Rules

${formatPromptBiasRulesMarkdown(debugContext.promptBiasRules)}
`;
}

export async function writeMaritimeTranscriptAnalysisFilesAdapter({
  chunk,
  strategyName,
  analysis,
  analysisOutputDirectoryPath,
}) {
  await ensureOutputDirectoryExistsAdapter({
    directoryPath: analysisOutputDirectoryPath,
  });

  const baseFileName = path.basename(chunk.outputFileName, ".mp3");
  const analysisJsonFilePath = path.join(
    analysisOutputDirectoryPath,
    `${baseFileName}.analysis.json`,
  );
  const analysisMarkdownFilePath = path.join(
    analysisOutputDirectoryPath,
    `${baseFileName}.analysis.md`,
  );

  await fs.writeFile(
    analysisJsonFilePath,
    `${JSON.stringify(analysis, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    analysisMarkdownFilePath,
    formatAnalysisMarkdown({ strategyName, analysis }),
    "utf8",
  );

  return {
    analysisJsonFilePath,
    analysisMarkdownFilePath,
  };
}
