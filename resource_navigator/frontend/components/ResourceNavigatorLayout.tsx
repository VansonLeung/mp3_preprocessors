import { Layout, Typography } from "antd";
import { useCallback, useMemo, useState } from "react";
import { SourceRecordingModel } from "../models/SourceRecordingModel";
import { TimelineItemModel } from "../models/TimelineItemModel";
import { NavigationTabsPanel } from "./NavigationTabsPanel";
import { ResourcePreviewPanel } from "./ResourcePreviewPanel";
import { SourceTimelinePanel } from "./SourceTimelinePanel";

export function ResourceNavigatorLayout() {
  const [selectedResourcePath, setSelectedResourcePath] = useState<string | null>(
    null,
  );
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(null);
  const [selectedChunkResourcePath, setSelectedChunkResourcePath] = useState<
    string | null
  >(null);
  const [selectedTimelineItem, setSelectedTimelineItem] =
    useState<TimelineItemModel | null>(null);
  const [visibleTimelineItems, setVisibleTimelineItems] = useState<
    TimelineItemModel[]
  >([]);
  const [shouldAutoPlayNext, setShouldAutoPlayNext] = useState(false);

  function handleSourceRecordingSelected(sourceRecording: SourceRecordingModel) {
    setSelectedSourceKey(sourceRecording.sourceKey);
    setSelectedResourcePath(
      sourceRecording.inputMp3Path ?? sourceRecording.chunkDirectoryPath,
    );
    setSelectedChunkResourcePath(null);
    setSelectedTimelineItem(null);
  }

  function handleTimelineItemSelected(timelineItem: TimelineItemModel) {
    setSelectedChunkResourcePath(timelineItem.chunkResourcePath);
    setSelectedTimelineItem(timelineItem);
    setSelectedResourcePath(
      timelineItem.analysisMarkdownPath ??
        timelineItem.analysisJsonPath ??
        timelineItem.transcriptTextPath ??
        timelineItem.chunkResourcePath,
    );
  }

  function handleResourceSelected(resourcePath: string) {
    setSelectedResourcePath(resourcePath);
    if (resourcePath.endsWith(".mp3") && resourcePath.includes("outputs/chunks/")) {
      setSelectedChunkResourcePath(resourcePath);
      setSelectedTimelineItem(
        visibleTimelineItems.find(
          (timelineItem) => timelineItem.chunkResourcePath === resourcePath,
        ) ?? null,
      );
    }
  }

  const activeTranscriptText = useMemo(() => {
    if (
      selectedTimelineItem &&
      selectedTimelineItem.chunkResourcePath === selectedChunkResourcePath
    ) {
      return selectedTimelineItem.textPreview;
    }

    return (
      visibleTimelineItems.find(
        (timelineItem) =>
          timelineItem.chunkResourcePath === selectedChunkResourcePath,
      )?.textPreview ?? ""
    );
  }, [selectedChunkResourcePath, selectedTimelineItem, visibleTimelineItems]);

  const handleVisibleTimelineItemsChanged = useCallback(
    (timelineItems: TimelineItemModel[]) => {
      setVisibleTimelineItems(timelineItems);
    },
    [],
  );

  const handlePlayNextRequested = useCallback(() => {
    if (visibleTimelineItems.length === 0) {
      return;
    }

    const currentIndex = visibleTimelineItems.findIndex(
      (timelineItem) =>
        timelineItem.chunkResourcePath === selectedChunkResourcePath,
    );
    const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
    const nextTimelineItem = visibleTimelineItems[nextIndex];

    if (nextTimelineItem) {
      handleTimelineItemSelected(nextTimelineItem);
    }
  }, [selectedChunkResourcePath, visibleTimelineItems]);

  return (
    <Layout className="app-shell">
      <Layout.Header className="app-header">
        <Typography.Title level={4} className="app-title">
          Maritime Resource Navigator
        </Typography.Title>
        <Typography.Text className="app-subtitle">
          Browse MP3s, chunks, transcripts, analysis, and source timelines
        </Typography.Text>
      </Layout.Header>
      <Layout.Content className="app-content">
        <section className="left-column">
          <NavigationTabsPanel
            selectedSourceKey={selectedSourceKey}
            onSourceRecordingSelected={handleSourceRecordingSelected}
            onResourceSelected={handleResourceSelected}
          />
        </section>
        <section className="middle-column">
          <SourceTimelinePanel
            sourceKey={selectedSourceKey}
            selectedChunkResourcePath={selectedChunkResourcePath}
            onTimelineItemSelected={handleTimelineItemSelected}
            onVisibleTimelineItemsChanged={handleVisibleTimelineItemsChanged}
          />
        </section>
        <section className="right-column">
          <ResourcePreviewPanel
            selectedResourcePath={selectedResourcePath}
            selectedChunkResourcePath={selectedChunkResourcePath}
            selectedTimelineAnalysisJsonPath={selectedTimelineItem?.analysisJsonPath ?? null}
            activeTranscriptText={activeTranscriptText}
            shouldAutoPlayNext={shouldAutoPlayNext}
            onShouldAutoPlayNextChanged={setShouldAutoPlayNext}
            onPlayNextRequested={handlePlayNextRequested}
            onResourceSelected={handleResourceSelected}
          />
        </section>
      </Layout.Content>
    </Layout>
  );
}
