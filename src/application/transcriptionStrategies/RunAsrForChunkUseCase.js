import { performance } from "node:perf_hooks";
import { transcribeAudioWithOpenAiCompatibleAsrAdapter } from "../../infrastructure/asr/OpenAiCompatibleAsrAdapter.js";
import { writeAsrTranscriptFilesAdapter } from "../../infrastructure/filesystem/AsrTranscriptFileWriterAdapter.js";
import { transcribeMp3ChunkWithMlxWhisperAdapter } from "../../infrastructure/whisper/MlxWhisperTranscriptionAdapter.js";
import { buildTranscriptOutputDirectoryPaths } from "../../domain/BuildTranscriptOutputDirectoryPaths.js";
import { buildProcessingTimingModel } from "../../domain/BuildProcessingTimingModel.js";
import { createTranscriptionResultModel } from "../../models/TranscriptionResultModel.js";

function addTranscriptionTimingToResult({
  transcriptionResult,
  transcriptionStartedAt,
  transcriptionStartMilliseconds,
}) {
  const transcriptionCompletedAt = new Date();
  const transcriptionDurationMilliseconds =
    performance.now() - transcriptionStartMilliseconds;

  return createTranscriptionResultModel({
    ...transcriptionResult,
    transcriptionTiming: buildProcessingTimingModel({
      startedAt: transcriptionStartedAt,
      completedAt: transcriptionCompletedAt,
      durationMilliseconds: transcriptionDurationMilliseconds,
    }),
  });
}

export async function runAsrForChunkUseCase({
  chunk,
  configuration,
  strategyName,
  language,
  callbacks,
}) {
  const transcriptionStartedAt = new Date();
  const transcriptionStartMilliseconds = performance.now();
  const outputDirectoryPaths = buildTranscriptOutputDirectoryPaths({
    outputsDirectoryPath: configuration.outputsDirectoryPath,
    strategyName,
    language,
    chunk,
  });

  if (configuration.asrProvider === "openai-compatible") {
    const asrTranscript = await transcribeAudioWithOpenAiCompatibleAsrAdapter({
      asrBaseUrl: configuration.asrBaseUrl,
      asrApiKey: configuration.asrApiKey,
      asrTranscriptionsPath: configuration.asrTranscriptionsPath,
      asrModel: configuration.asrModel,
      asrResponseFormat: configuration.asrResponseFormat,
      asrPrompt: configuration.asrPrompt,
      asrHotwords: configuration.asrHotwords,
      asrVocabulary: configuration.asrVocabulary,
      audioFilePath: chunk.outputFilePath,
      language,
      enableStreaming: configuration.asrEnableStreaming,
      callbacks,
    });

    const transcriptionResult = await writeAsrTranscriptFilesAdapter({
      chunk,
      strategyName,
      asrTranscript,
      transcriptOutputDirectoryPath:
        outputDirectoryPaths.relativeTranscriptOutputDirectoryPath,
      absoluteSrtOutputDirectoryPath:
        outputDirectoryPaths.absoluteSrtOutputDirectoryPath,
    });

    return addTranscriptionTimingToResult({
      transcriptionResult,
      transcriptionStartedAt,
      transcriptionStartMilliseconds,
    });
  }

  const transcriptionResult = await transcribeMp3ChunkWithMlxWhisperAdapter({
    whisperCommand: configuration.whisperCommand,
    whisperModel: configuration.whisperModel,
    whisperLanguage: language,
    strategyName,
    chunk,
    transcriptOutputDirectoryPath:
      outputDirectoryPaths.relativeTranscriptOutputDirectoryPath,
    absoluteSrtOutputDirectoryPath:
      outputDirectoryPaths.absoluteSrtOutputDirectoryPath,
    callbacks,
  });

  return addTranscriptionTimingToResult({
    transcriptionResult,
    transcriptionStartedAt,
    transcriptionStartMilliseconds,
  });
}
