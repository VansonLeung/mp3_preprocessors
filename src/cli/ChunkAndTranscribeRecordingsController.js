#!/usr/bin/env node

import { loadEnvironmentConfiguration } from "../config/LoadEnvironmentConfiguration.js";
import { createConsoleProgressCallbacks } from "../callbacks/ConsoleProgressCallbacks.js";
import { processAllMaritimeRecordingsUseCase } from "../application/ProcessAllMaritimeRecordingsUseCase.js";
import { transcribeExistingChunksUseCase } from "../application/TranscribeExistingChunksUseCase.js";

function printUsageAndExit() {
  console.log(`Usage:
  npm run chunk-and-transcribe -- [options]

Options:
  --input <path>             Select one MP3 file or one directory. Can be repeated.
  --strategy <name>          Override TRANSCRIPTION_STRATEGY for this run.
  --transcribe-existing-chunks
                             Transcribe MP3s already present in outputs/chunks.
  --dry-run                  Detect silence and write a manifest without exporting chunks.
  --limit <number>           Process only the first N discovered MP3 files.
  --enable-transcription     Override ENABLE_TRANSCRIPTION=true for this run.
  --disable-transcription    Override ENABLE_TRANSCRIPTION=false for this run.
  --verbose                  Print ffmpeg/ffprobe/whisper output.
  --help                     Show this help text.
`);
  process.exit(0);
}

function parseControllerArguments(argv) {
  const parsedArguments = {
    dryRun: false,
    limit: null,
    selectedInputPaths: [],
    transcribeExistingChunks: false,
    transcriptionStrategyOverride: null,
    enableTranscriptionOverride: null,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help") {
      printUsageAndExit();
    } else if (argument === "--dry-run") {
      parsedArguments.dryRun = true;
    } else if (argument === "--verbose") {
      parsedArguments.verbose = true;
    } else if (argument === "--transcribe-existing-chunks") {
      parsedArguments.transcribeExistingChunks = true;
    } else if (argument === "--strategy") {
      const transcriptionStrategy = argv[index + 1];
      if (!transcriptionStrategy) {
        throw new Error("--strategy requires a strategy name.");
      }

      parsedArguments.transcriptionStrategyOverride = transcriptionStrategy;
      index += 1;
    } else if (argument === "--enable-transcription") {
      parsedArguments.enableTranscriptionOverride = true;
    } else if (argument === "--disable-transcription") {
      parsedArguments.enableTranscriptionOverride = false;
    } else if (argument === "--input") {
      const selectedInputPath = argv[index + 1];
      if (!selectedInputPath) {
        throw new Error("--input requires a file or directory path.");
      }

      parsedArguments.selectedInputPaths.push(selectedInputPath);
      index += 1;
    } else if (argument === "--limit") {
      const rawLimit = argv[index + 1];
      if (!rawLimit) {
        throw new Error("--limit requires a number.");
      }

      const parsedLimit = Number(rawLimit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        throw new Error("--limit must be a positive integer.");
      }

      parsedArguments.limit = parsedLimit;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return parsedArguments;
}

async function runChunkAndTranscribeRecordingsController() {
  const controllerArguments = parseControllerArguments(process.argv.slice(2));
  const workspaceDirectoryPath = process.cwd();
  const loadedConfiguration = loadEnvironmentConfiguration({
    workspaceDirectoryPath,
  });
  const configuration = Object.freeze({
    ...loadedConfiguration,
    ...(controllerArguments.enableTranscriptionOverride === null
      ? {}
      : {
          enableTranscription:
            controllerArguments.enableTranscriptionOverride,
        }),
    ...(controllerArguments.transcriptionStrategyOverride === null
      ? {}
      : {
          transcriptionStrategy:
            controllerArguments.transcriptionStrategyOverride,
        }),
  });

  const callbacks = createConsoleProgressCallbacks({
    verbose: controllerArguments.verbose,
  });

  if (controllerArguments.transcribeExistingChunks) {
    await transcribeExistingChunksUseCase({
      configuration,
      limit: controllerArguments.limit,
      selectedInputPaths: controllerArguments.selectedInputPaths,
      callbacks,
    });
    return;
  }

  await processAllMaritimeRecordingsUseCase({
    configuration,
    limit: controllerArguments.limit,
    selectedInputPaths: controllerArguments.selectedInputPaths,
    dryRun: controllerArguments.dryRun,
    callbacks,
  });
}

runChunkAndTranscribeRecordingsController().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
