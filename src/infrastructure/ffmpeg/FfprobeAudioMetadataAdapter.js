import { spawnCommandAdapter } from "../process/SpawnCommandAdapter.js";

export async function readAudioMetadataWithFfprobeAdapter({
  ffprobeCommand,
  inputFilePath,
  callbacks,
}) {
  const { stdout } = await spawnCommandAdapter({
    command: ffprobeCommand,
    args: [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=sample_rate,channels",
      "-of",
      "json",
      inputFilePath,
    ],
    callbacks,
  });

  const parsedMetadata = JSON.parse(stdout);
  const firstAudioStream = parsedMetadata.streams?.[0] ?? {};
  const durationSeconds = Number(parsedMetadata.format?.duration);

  if (!Number.isFinite(durationSeconds)) {
    throw new Error(`Unable to read duration for ${inputFilePath}`);
  }

  return {
    durationSeconds,
    sampleRate: Number(firstAudioStream.sample_rate) || null,
    channelCount: Number(firstAudioStream.channels) || null,
  };
}
