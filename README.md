# MP3 Preprocessors

Simple Node.js runner for maritime MP3 recordings.

Input filenames must look like:

```text
YYYYMMDD_HHmm_HHmm_CHANNEL.mp3
```

Example:

```text
20250721_0800_1000_BPT67.mp3
```

## 1. Prepare Config

Copy the example config:

```bash
cp .env.example .env
```

Important defaults:

```env
ENABLE_CHUNK_MERGING=true
ENABLE_TRANSCRIPTION=false
MERGED_CHUNK_MAXIMUM_DURATION_MINUTES=
```

Empty `MERGED_CHUNK_MAXIMUM_DURATION_MINUTES` means all chunks from one source MP3 are merged into one listening MP3.

## 2. Make Chunks

By default, the runner processes all MP3 files under:

```text
inputs/
```

Dry-run first:

```bash
npm run chunk-and-transcribe -- --dry-run --limit 1
```

Create chunks:

```bash
npm run chunk-and-transcribe -- --disable-transcription
```

Chunk MP3s are written to:

```text
outputs/chunks/<input-folder>/<source-mp3-name>/
```

Example:

```text
outputs/chunks/20240921_0000_0400/20240921_0000_0200_ELN14/20240921_0000_0200_ELN14__012537_079__012541_079.mp3
```

## Select Input MP3s

Select all inputs:

```bash
npm run chunk-and-transcribe -- --disable-transcription
```

Select one folder:

```bash
npm run chunk-and-transcribe -- --input inputs/20250721_0800_1200 --disable-transcription
```

Select one MP3:

```bash
npm run chunk-and-transcribe -- --input inputs/20250721_0800_1200/20250721_0800_1000_BPT67.mp3 --disable-transcription
```

Select multiple folders/files:

```bash
npm run chunk-and-transcribe -- \
  --input inputs/20250721_0800_1200 \
  --input inputs/20250605_0800_1200/20250605_0800_1000_BPT67.mp3 \
  --disable-transcription
```

Use `--limit 1` only for a quick test.

## 3. Merge Chunks For Listening

Chunk merging is enabled by default:

```env
ENABLE_CHUNK_MERGING=true
```

Run:

```bash
npm run chunk-and-transcribe -- --disable-transcription
```

Merged listening MP3s are written to:

```text
outputs/chunk-merged/
```

These merged files are for human listening/review. They are not used for Whisper transcription.

To split merged listening files into shorter files, set:

```env
MERGED_CHUNK_MAXIMUM_DURATION_MINUTES=10
```

## 4. Obtain Transcripts Of Chunks

Install `mlx-whisper` first if needed:

```bash
pip install mlx-whisper
```

Enable transcription in `.env`:

```env
ENABLE_TRANSCRIPTION=true
WHISPER_COMMAND=mlx_whisper
WHISPER_MODEL=mlx-community/whisper-large-v3-turbo
WHISPER_LANGUAGE=auto
```

Run:

```bash
npm run chunk-and-transcribe -- --enable-transcription
```

Transcribe from existing cached chunks only:

```bash
npm run chunk-and-transcribe -- --transcribe-existing-chunks
```

Transcribe cached chunks from one cached chunk folder:

```bash
npm run chunk-and-transcribe -- --transcribe-existing-chunks --input outputs/chunks/20240921_0000_0400
```

Transcribe one cached chunk:

```bash
npm run chunk-and-transcribe -- --transcribe-existing-chunks --input outputs/chunks/20240921_0000_0400/20240921_0000_0200_BPT67/20240921_0000_0200_BPT67__000000_000__000007_208.mp3
```

Chunk transcript outputs:

```text
outputs/transcripts/chunks/relative/
outputs/transcripts/chunks/absolute/
```

Stitched transcript outputs:

```text
outputs/transcripts/source-recordings/
outputs/transcripts/date-channel/
```

## Useful Small Test

Process only one source MP3:

```bash
npm run chunk-and-transcribe -- --limit 1 --disable-transcription
```

Process one source MP3 with transcription:

```bash
npm run chunk-and-transcribe -- --limit 1 --enable-transcription
```
