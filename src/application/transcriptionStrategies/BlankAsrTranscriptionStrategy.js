import { runAsrForChunkUseCase } from "./RunAsrForChunkUseCase.js";

export const BLANK_ASR_TRANSCRIPTION_STRATEGY_NAME = "blank-asr";

export async function runBlankAsrTranscriptionStrategy({
  chunk,
  configuration,
  callbacks,
}) {
  return runAsrForChunkUseCase({
    chunk,
    configuration,
    strategyName: BLANK_ASR_TRANSCRIPTION_STRATEGY_NAME,
    language: "auto",
    callbacks,
  });
}
