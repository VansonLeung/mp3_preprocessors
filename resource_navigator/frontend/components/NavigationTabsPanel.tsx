import { Card, Tabs } from "antd";
import { SourceRecordingModel } from "../models/SourceRecordingModel";
import { ResourceTreePanel } from "./ResourceTreePanel";
import { SourceRecordingSelectorPanel } from "./SourceRecordingSelectorPanel";

export function NavigationTabsPanel({
  selectedSourceKey,
  onSourceRecordingSelected,
  onResourceSelected,
}: {
  selectedSourceKey: string | null;
  onSourceRecordingSelected: (sourceRecording: SourceRecordingModel) => void;
  onResourceSelected: (resourcePath: string) => void;
}) {
  return (
    <Card size="small" className="panel-card navigation-tabs-card">
      <Tabs
        defaultActiveKey="source-mp3-timeline"
        className="navigation-tabs"
        items={[
          {
            key: "source-mp3-timeline",
            label: "Source MP3 Timeline",
            children: (
              <SourceRecordingSelectorPanel
                selectedSourceKey={selectedSourceKey}
                onSourceRecordingSelected={onSourceRecordingSelected}
                shouldRenderCard={false}
              />
            ),
          },
          {
            key: "resources",
            label: "Resources",
            children: (
              <ResourceTreePanel
                onResourceSelected={onResourceSelected}
                shouldRenderCard={false}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
