function clampNumber(value, minimumValue, maximumValue) {
  return Math.min(Math.max(value, minimumValue), maximumValue);
}

function roundSeconds(value) {
  return Math.round(value * 1000) / 1000;
}

function calculateNonSilentSpansFromSilenceEvents({
  silenceEvents,
  durationSeconds,
}) {
  const sortedSilenceEvents = [...silenceEvents]
    .filter(
      (silenceEvent) =>
        silenceEvent.silenceEndSeconds > 0 &&
        silenceEvent.silenceStartSeconds < durationSeconds,
    )
    .sort((left, right) => left.silenceStartSeconds - right.silenceStartSeconds);

  const nonSilentSpans = [];
  let cursorSeconds = 0;

  for (const silenceEvent of sortedSilenceEvents) {
    const silenceStartSeconds = clampNumber(
      silenceEvent.silenceStartSeconds,
      0,
      durationSeconds,
    );
    const silenceEndSeconds = clampNumber(
      silenceEvent.silenceEndSeconds,
      0,
      durationSeconds,
    );

    if (silenceStartSeconds > cursorSeconds) {
      nonSilentSpans.push({
        startSeconds: cursorSeconds,
        endSeconds: silenceStartSeconds,
      });
    }

    cursorSeconds = Math.max(cursorSeconds, silenceEndSeconds);
  }

  if (cursorSeconds < durationSeconds) {
    nonSilentSpans.push({
      startSeconds: cursorSeconds,
      endSeconds: durationSeconds,
    });
  }

  return nonSilentSpans.filter(
    (nonSilentSpan) => nonSilentSpan.endSeconds > nonSilentSpan.startSeconds,
  );
}

function mergeSpansAcrossShortGaps({ spans, shortSpeechMergeGapSeconds }) {
  const mergedSpans = [];

  for (const span of spans) {
    const lastMergedSpan = mergedSpans.at(-1);

    if (
      lastMergedSpan &&
      span.startSeconds - lastMergedSpan.endSeconds <= shortSpeechMergeGapSeconds
    ) {
      lastMergedSpan.endSeconds = span.endSeconds;
      continue;
    }

    mergedSpans.push({ ...span });
  }

  return mergedSpans;
}

function expandSpanToMinimumDuration({
  span,
  durationSeconds,
  minimumChunkDurationSeconds,
}) {
  const currentDurationSeconds = span.endSeconds - span.startSeconds;

  if (currentDurationSeconds >= minimumChunkDurationSeconds) {
    return span;
  }

  const missingDurationSeconds =
    minimumChunkDurationSeconds - currentDurationSeconds;
  const leftExpansionSeconds = missingDurationSeconds / 2;
  const rightExpansionSeconds = missingDurationSeconds - leftExpansionSeconds;

  let startSeconds = clampNumber(
    span.startSeconds - leftExpansionSeconds,
    0,
    durationSeconds,
  );
  let endSeconds = clampNumber(
    span.endSeconds + rightExpansionSeconds,
    0,
    durationSeconds,
  );

  if (endSeconds - startSeconds < minimumChunkDurationSeconds) {
    if (startSeconds === 0) {
      endSeconds = clampNumber(
        startSeconds + minimumChunkDurationSeconds,
        0,
        durationSeconds,
      );
    } else if (endSeconds === durationSeconds) {
      startSeconds = clampNumber(
        endSeconds - minimumChunkDurationSeconds,
        0,
        durationSeconds,
      );
    }
  }

  return { startSeconds, endSeconds };
}

function applyChunkPadding({
  span,
  durationSeconds,
  chunkPaddingSeconds,
}) {
  return {
    startSeconds: clampNumber(
      span.startSeconds - chunkPaddingSeconds,
      0,
      durationSeconds,
    ),
    endSeconds: clampNumber(
      span.endSeconds + chunkPaddingSeconds,
      0,
      durationSeconds,
    ),
  };
}

function mergeOverlappingChunkBoundaries(chunkBoundaries) {
  const mergedChunkBoundaries = [];

  for (const chunkBoundary of chunkBoundaries) {
    const lastMergedChunkBoundary = mergedChunkBoundaries.at(-1);

    if (
      lastMergedChunkBoundary &&
      chunkBoundary.startSeconds <= lastMergedChunkBoundary.endSeconds
    ) {
      lastMergedChunkBoundary.endSeconds = Math.max(
        lastMergedChunkBoundary.endSeconds,
        chunkBoundary.endSeconds,
      );
      continue;
    }

    mergedChunkBoundaries.push({ ...chunkBoundary });
  }

  return mergedChunkBoundaries;
}

function splitChunkBoundaryByMaximumDuration({
  chunkBoundary,
  maximumChunkDurationSeconds,
}) {
  const chunkBoundaryDurationSeconds =
    chunkBoundary.endSeconds - chunkBoundary.startSeconds;

  if (chunkBoundaryDurationSeconds <= maximumChunkDurationSeconds) {
    return [chunkBoundary];
  }

  const chunkCount = Math.ceil(
    chunkBoundaryDurationSeconds / maximumChunkDurationSeconds,
  );
  const targetChunkDurationSeconds = chunkBoundaryDurationSeconds / chunkCount;
  const splitChunkBoundaries = [];

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const startSeconds =
      chunkBoundary.startSeconds + targetChunkDurationSeconds * chunkIndex;
    const endSeconds =
      chunkIndex === chunkCount - 1
        ? chunkBoundary.endSeconds
        : chunkBoundary.startSeconds +
          targetChunkDurationSeconds * (chunkIndex + 1);

    splitChunkBoundaries.push({ startSeconds, endSeconds });
  }

  return splitChunkBoundaries;
}

export function calculateChunkBoundariesFromSilenceEvents({
  silenceEvents,
  durationSeconds,
  minimumChunkDurationSeconds,
  maximumChunkDurationSeconds,
  chunkPaddingSeconds,
  shortSpeechMergeGapSeconds,
}) {
  const nonSilentSpans = calculateNonSilentSpansFromSilenceEvents({
    silenceEvents,
    durationSeconds,
  });

  const mergedNonSilentSpans = mergeSpansAcrossShortGaps({
    spans: nonSilentSpans,
    shortSpeechMergeGapSeconds,
  });

  const paddedAndExpandedChunkBoundaries = mergedNonSilentSpans.map((span) => {
    const paddedSpan = applyChunkPadding({
      span,
      durationSeconds,
      chunkPaddingSeconds,
    });

    return expandSpanToMinimumDuration({
      span: paddedSpan,
      durationSeconds,
      minimumChunkDurationSeconds,
    });
  });

  return mergeOverlappingChunkBoundaries(paddedAndExpandedChunkBoundaries)
    .flatMap((chunkBoundary) =>
      splitChunkBoundaryByMaximumDuration({
        chunkBoundary,
        maximumChunkDurationSeconds,
      }),
    )
    .filter((chunkBoundary) => chunkBoundary.endSeconds > chunkBoundary.startSeconds)
    .map((chunkBoundary) => ({
      startSeconds: roundSeconds(chunkBoundary.startSeconds),
      endSeconds: roundSeconds(chunkBoundary.endSeconds),
      durationSeconds: roundSeconds(
        chunkBoundary.endSeconds - chunkBoundary.startSeconds,
      ),
    }));
}
