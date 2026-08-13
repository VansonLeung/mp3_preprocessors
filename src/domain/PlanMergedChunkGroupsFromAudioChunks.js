function calculateMergedChunkDurationSeconds(componentChunks) {
  if (componentChunks.length === 0) {
    return 0;
  }

  return (
    componentChunks.at(-1).chunkEndSeconds - componentChunks[0].chunkStartSeconds
  );
}

export function planMergedChunkGroupsFromAudioChunks({
  chunks,
  mergedChunkMaximumDurationSeconds,
}) {
  if (chunks.length === 0) {
    return [];
  }

  if (mergedChunkMaximumDurationSeconds === null) {
    return [chunks];
  }

  const mergedChunkGroups = [];
  let activeMergedChunkGroup = [];

  for (const chunk of chunks) {
    const candidateMergedChunkGroup = [...activeMergedChunkGroup, chunk];
    const candidateDurationSeconds = calculateMergedChunkDurationSeconds(
      candidateMergedChunkGroup,
    );

    if (
      activeMergedChunkGroup.length > 0 &&
      candidateDurationSeconds > mergedChunkMaximumDurationSeconds
    ) {
      mergedChunkGroups.push(activeMergedChunkGroup);
      activeMergedChunkGroup = [chunk];
      continue;
    }

    activeMergedChunkGroup = candidateMergedChunkGroup;
  }

  if (activeMergedChunkGroup.length > 0) {
    mergedChunkGroups.push(activeMergedChunkGroup);
  }

  return mergedChunkGroups;
}
