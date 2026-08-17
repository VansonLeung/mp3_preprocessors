# Coding Practice

This project is a Node.js batch-processing CLI for maritime MP3 recordings.

The code should stay easy to extend, especially for replacing ASR providers, adding LLM analysis, and trying different transcription strategies.

## Main Principles

- Keep responsibilities separated.
- Use verbose filenames and verbose function names.
- Prefer plain functions and plain data models over classes.
- Keep external tools behind adapters.
- Keep business logic in pure domain functions where possible.
- Use callbacks for progress reporting instead of mixing logging into core logic.
- Keep output paths predictable and traceable back to the source MP3.

## Folder Roles

```text
src/
  cli/
  application/
  domain/
  infrastructure/
  models/
  callbacks/
  config/
```

## Controllers

Controllers are CLI entrypoints.

Use `*Controller.js` filenames only for files that parse user input, load configuration, create callbacks, and call use cases.

Example:

```text
src/cli/ChunkAndTranscribeRecordingsController.js
```

Controllers should stay thin. They should not contain ffmpeg logic, ASR logic, LLM prompts, filename parsing rules, or output formatting rules.

## Use Cases

Use cases coordinate application workflows.

Use `*UseCase.js` filenames for orchestration code.

Examples:

```text
src/application/ProcessAllMaritimeRecordingsUseCase.js
src/application/ProcessOneMaritimeRecordingUseCase.js
src/application/CreateSilenceBasedChunkPlanUseCase.js
src/application/TranscribeExistingChunksUseCase.js
```

Use cases may call domain functions, models, adapters, and callbacks.

Use cases should describe workflow steps, not low-level implementation details.

## Models

Models are plain data factories.

Use `*Model.js` filenames for data shapes that are passed between layers.

Examples:

```text
src/models/MaritimeRecordingModel.js
src/models/MaritimeAudioChunkModel.js
src/models/TranscriptionResultModel.js
```

Models should avoid behavior-heavy methods. Prefer frozen plain objects.

## Domain Functions

Domain files contain pure parsing, formatting, and calculation logic.

Examples:

```text
src/domain/ParseMaritimeRecordingFileName.js
src/domain/FormatChunkedMaritimeRecordingFileName.js
src/domain/CalculateChunkBoundariesFromSilenceEvents.js
```

Domain functions should not call ffmpeg, read files, write files, call APIs, or log progress.

Good domain functions are easy to test with only input objects and return values.

Domain-specific prompt hints should live in dedicated domain files, not inline inside provider adapters.

Example:

```text
src/domain/BuildMaritimeTranscriptAnalysisPromptBiasRules.js
```

These hints should be treated as soft analysis bias. They are useful for recurring maritime ASR mishearings, but prompts should still ask the LLM to preserve uncertainty.

## Adapters

Adapters talk to the outside world.

Use `*Adapter.js` filenames for ffmpeg, ffprobe, filesystem, process spawning, ASR, LLM, and any external API.

Examples:

```text
src/infrastructure/ffmpeg/FfmpegSilenceDetectionAdapter.js
src/infrastructure/ffmpeg/FfmpegMp3ChunkExportAdapter.js
src/infrastructure/whisper/MlxWhisperTranscriptionAdapter.js
src/infrastructure/filesystem/ProcessingManifestWriterAdapter.js
```

Adapters should hide external command/API details from the rest of the app.

If an ASR or LLM provider changes later, the change should mostly happen inside new adapter files, not inside controllers or domain code.

## Callbacks

Callbacks are progress hooks.

Use callbacks for status messages such as:

```text
onRecordingStarted
onSilenceDetectionCompleted
onChunkPlanCreated
onChunkExported
onTranscriptionCompleted
onRecordingFailed
```

Core logic should call callbacks but should not directly print progress unless it is inside a callback implementation.

Console logging belongs in:

```text
src/callbacks/ConsoleProgressCallbacks.js
```

## Configuration

Runtime options should come from `.env`, `.env.example`, or CLI flags.

Examples:

```text
SILENCE_NOISE_THRESHOLD
ENABLE_CHUNK_MERGING
ENABLE_TRANSCRIPTION
ASR_MODEL
LLM_MODEL
```

Configuration loading and validation belongs in:

```text
src/config/LoadEnvironmentConfiguration.js
src/models/EnvironmentConfigurationModel.js
```

Do not hardcode provider credentials, model names, or output roots inside use cases.

## Output Layout

Outputs should be traceable to source MP3s.

Chunked MP3s should use:

```text
outputs/chunks/<input-folder>/<source-mp3-name>/<chunk-file-name>.mp3
```

Example:

```text
outputs/chunks/20240921_0000_0400/20240921_0000_0200_ELN14/20240921_0000_0200_ELN14__012537_079__012541_079.mp3
```

Merged listening MP3s should use:

```text
outputs/chunk-merged/<input-folder>/<merged-file-name>.mp3
```

Merged listening MP3s are for human review. They should not be treated as timestamp-preserving ASR inputs.

## Manifests

Manifest files should record what was produced and how outputs map back to inputs.

Use JSONL for append-friendly, machine-readable records:

```text
outputs/manifests/
```

Manifest records should include source paths, output paths, layer names, chunk timing, and transcript/analysis paths when available.

## Transcription Strategy Direction

Future transcription logic should be replaceable by strategy.

Suggested future folder:

```text
src/application/transcriptionStrategies/
```

Suggested future strategy files:

```text
BlankAsrTranscriptionStrategy.js
BlankAsrWithMaritimeLlmAnalysisStrategy.js
MultiLanguageAsrWithMaritimeLlmAnalysisStrategy.js
```

Each strategy should return a common result model so downstream storage and manifests do not depend on one ASR or LLM provider.

Provider-specific ASR and LLM code should live in adapters, for example:

```text
src/infrastructure/asr/OpenAiCompatibleAsrAdapter.js
src/infrastructure/asr/MlxWhisperAsrAdapter.js
src/infrastructure/llm/OpenAiCompatibleLlmAdapter.js
```

Streaming and SSE parsing should stay in HTTP/provider adapters, not in strategy files.

Strategy files should ask adapters for complete results and may receive progress through callbacks.

## Naming

Prefer names that explain the file role and action.

Good:

```text
CreateSilenceBasedChunkPlanUseCase.js
ParseChunkedMaritimeRecordingFileName.js
FfmpegMergedMp3ChunkConcatAdapter.js
```

Avoid vague names:

```text
utils.js
helpers.js
processor.js
service.js
```

## Implementation Style

- Use `async/await` for asynchronous workflow.
- Use `path.join` and `path.relative` for filesystem paths.
- Use structured parsing for filenames and command output.
- Keep comments short and only where they clarify non-obvious logic.
- Avoid unrelated refactors during feature work.
- Keep generated outputs under `outputs/`.
- Keep credentials out of source files.

## Practical Rule

When adding a feature, first decide its role:

```text
CLI input?          Controller
Workflow?           UseCase
Pure calculation?   Domain
External tool/API?  Adapter
Data shape?         Model
Progress output?    Callback
Runtime setting?    Config
```

Then place and name the file accordingly.
