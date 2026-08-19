import { Button, Card, Empty, Switch, Typography } from "antd";
import { ResourceNavigatorApiClient } from "../api/ResourceNavigatorApiClient";
import { MaritimeAnalysisSummaryPanel } from "./MaritimeAnalysisSummaryPanel";

export function AudioPreviewPanel({
  audioResourcePath,
  analysisJsonPath,
  activeTranscriptText,
  shouldAutoPlayNext,
  onShouldAutoPlayNextChanged,
  onPlayNextRequested,
}: {
  audioResourcePath: string | null;
  analysisJsonPath: string | null;
  activeTranscriptText: string;
  shouldAutoPlayNext: boolean;
  onShouldAutoPlayNextChanged: (shouldAutoPlayNext: boolean) => void;
  onPlayNextRequested: () => void;
}) {
  if (!audioResourcePath) {
    return <Empty description="Select an MP3 file or timeline chunk" />;
  }

  return (
    <Card size="small" title="Audio" className="preview-card">
      <Typography.Text className="resource-path" copyable>
        {audioResourcePath}
      </Typography.Text>
      <audio
        controls
        autoPlay
        src={ResourceNavigatorApiClient.mediaUrl(audioResourcePath)}
        className="audio-player"
        onEnded={() => {
          if (shouldAutoPlayNext) {
            onPlayNextRequested();
          }
        }}
      />
      <div className="audio-actions">
        <Switch
          checked={shouldAutoPlayNext}
          onChange={onShouldAutoPlayNextChanged}
        />
        <Typography.Text>Auto-select next transcript</Typography.Text>
        <Button size="small" onClick={onPlayNextRequested}>
          Next
        </Button>
      </div>
      <Typography.Paragraph className="active-transcript-sentence">
        {activeTranscriptText || "No transcript text available for this chunk."}
      </Typography.Paragraph>
      <MaritimeAnalysisSummaryPanel analysisJsonPath={analysisJsonPath} />
    </Card>
  );
}
