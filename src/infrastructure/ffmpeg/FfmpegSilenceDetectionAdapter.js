import { createSilenceEventModel } from "../../models/SilenceEventModel.js";
import { spawnCommandAdapter } from "../process/SpawnCommandAdapter.js";

const SILENCE_START_PATTERN = /silence_start:\s*(?<silenceStartSeconds>[0-9.]+)/;
const SILENCE_END_PATTERN =
  /silence_end:\s*(?<silenceEndSeconds>[0-9.]+)\s*\|\s*silence_duration:\s*(?<silenceDurationSeconds>[0-9.]+)/;

export async function detectSilenceEventsWithFfmpegAdapter({
  ffmpegCommand,
  inputFilePath,
  silenceNoiseThreshold,
  silenceMinimumDurationSeconds,
  callbacks,
}) {
  const { stderr } = await spawnCommandAdapter({
    command: ffmpegCommand,
    args: [
      "-hide_banner",
      "-nostats",
      "-i",
      inputFilePath,
      "-af",
      `silencedetect=noise=${silenceNoiseThreshold}:d=${silenceMinimumDurationSeconds}`,
      "-f",
      "null",
      "-",
    ],
    callbacks,
  });

  const silenceEvents = [];
  let activeSilenceStartSeconds = null;

  for (const stderrLine of stderr.split(/\r?\n/)) {
    const silenceStartMatch = stderrLine.match(SILENCE_START_PATTERN);
    if (silenceStartMatch?.groups) {
      activeSilenceStartSeconds = Number(
        silenceStartMatch.groups.silenceStartSeconds,
      );
      continue;
    }

    const silenceEndMatch = stderrLine.match(SILENCE_END_PATTERN);
    if (silenceEndMatch?.groups) {
      const silenceEndSeconds = Number(
        silenceEndMatch.groups.silenceEndSeconds,
      );
      const silenceDurationSeconds = Number(
        silenceEndMatch.groups.silenceDurationSeconds,
      );
      const silenceStartSeconds =
        activeSilenceStartSeconds ??
        silenceEndSeconds - silenceDurationSeconds;

      silenceEvents.push(
        createSilenceEventModel({
          silenceStartSeconds,
          silenceEndSeconds,
          silenceDurationSeconds,
        }),
      );
      activeSilenceStartSeconds = null;
    }
  }

  return silenceEvents;
}
