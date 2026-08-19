import { Empty, Tabs } from "antd";
import { AudioPreviewPanel } from "./AudioPreviewPanel";
import { RelatedResourcesPanel } from "./RelatedResourcesPanel";
import { TextFilePreviewPanel } from "./TextFilePreviewPanel";

function isAudioResource(resourcePath: string | null) {
  return resourcePath?.endsWith(".mp3") ?? false;
}

function isReadableTextResource(resourcePath: string | null) {
  return (
    resourcePath?.endsWith(".txt") ||
    resourcePath?.endsWith(".srt") ||
    resourcePath?.endsWith(".json") ||
    resourcePath?.endsWith(".md") ||
    resourcePath?.endsWith(".jsonl")
  );
}

export function ResourcePreviewPanel({
  selectedResourcePath,
  selectedChunkResourcePath,
  selectedTimelineAnalysisJsonPath,
  activeTranscriptText,
  shouldAutoPlayNext,
  onShouldAutoPlayNextChanged,
  onPlayNextRequested,
  onResourceSelected,
}: {
  selectedResourcePath: string | null;
  selectedChunkResourcePath: string | null;
  selectedTimelineAnalysisJsonPath: string | null;
  activeTranscriptText: string;
  shouldAutoPlayNext: boolean;
  onShouldAutoPlayNextChanged: (shouldAutoPlayNext: boolean) => void;
  onPlayNextRequested: () => void;
  onResourceSelected: (resourcePath: string) => void;
}) {
  const audioResourcePath = isAudioResource(selectedResourcePath)
    ? selectedResourcePath
    : selectedChunkResourcePath;
  const readableResourcePath = isReadableTextResource(selectedResourcePath)
    ? selectedResourcePath
    : null;

  if (!selectedResourcePath && !selectedChunkResourcePath) {
    return <Empty description="Select a resource or timeline row" />;
  }

  return (
    <Tabs
      className="preview-tabs"
      items={[
        {
          key: "audio",
          label: "Audio",
          children: (
            <AudioPreviewPanel
              audioResourcePath={audioResourcePath}
              analysisJsonPath={selectedTimelineAnalysisJsonPath}
              activeTranscriptText={activeTranscriptText}
              shouldAutoPlayNext={shouldAutoPlayNext}
              onShouldAutoPlayNextChanged={onShouldAutoPlayNextChanged}
              onPlayNextRequested={onPlayNextRequested}
            />
          ),
        },
        {
          key: "preview",
          label: "Preview",
          children: <TextFilePreviewPanel resourcePath={readableResourcePath} />,
        },
        {
          key: "related",
          label: "Related",
          children: (
            <RelatedResourcesPanel
              chunkResourcePath={selectedChunkResourcePath}
              onResourceSelected={onResourceSelected}
            />
          ),
        },
      ]}
    />
  );
}
