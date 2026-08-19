import { Badge, Card, Input, List, Spin, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { SourceRecordingModel } from "../models/SourceRecordingModel";
import { useSourceRecordings } from "../hooks/useSourceRecordings";

export function SourceRecordingSelectorPanel({
  selectedSourceKey,
  onSourceRecordingSelected,
  shouldRenderCard = true,
}: {
  selectedSourceKey: string | null;
  onSourceRecordingSelected: (sourceRecording: SourceRecordingModel) => void;
  shouldRenderCard?: boolean;
}) {
  const { data, isLoading } = useSourceRecordings();
  const [searchText, setSearchText] = useState("");
  const filteredSourceRecordings = useMemo(
    () => {
      const searchKeywords = searchText
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      return data
        .filter((sourceRecording) => {
          if (searchKeywords.length === 0) {
            return true;
          }

          const searchableText = [
            sourceRecording.sourceKey,
            sourceRecording.dateFolder,
            sourceRecording.sourceName,
            sourceRecording.dateStamp,
            sourceRecording.scheduledStartTime,
            sourceRecording.scheduledEndTime,
            sourceRecording.channel,
            String(sourceRecording.chunkCount),
            String(sourceRecording.analysisCount),
          ]
            .join(" ")
            .toLowerCase();

          return searchKeywords.every((keyword) =>
            searchableText.includes(keyword),
          );
        })
        .slice(0, 400);
    },
    [data, searchText],
  );

  const selectorContent = (
    <>
      <Input.Search
        placeholder="Search date, source, channel"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        allowClear
      />
      {isLoading ? <Spin /> : null}
      <List
        size="small"
        dataSource={filteredSourceRecordings}
        className="source-recording-list"
        renderItem={(sourceRecording) => (
          <List.Item
            className={
              selectedSourceKey === sourceRecording.sourceKey
                ? "selected-list-item"
                : ""
            }
            onClick={() => onSourceRecordingSelected(sourceRecording)}
          >
            <List.Item.Meta
              title={
                <Typography.Text ellipsis>
                  {sourceRecording.sourceName}
                </Typography.Text>
              }
              description={
                <>
                  <Tag>{sourceRecording.channel}</Tag>
                  <Tag>{sourceRecording.chunkCount} chunks</Tag>
                  <Badge
                    count={`${sourceRecording.analysisCount} analysis`}
                    color={sourceRecording.analysisCount > 0 ? "purple" : "default"}
                    className="source-recording-analysis-badge"
                  />
                  <Typography.Text type="secondary">
                    {sourceRecording.dateFolder}
                  </Typography.Text>
                </>
              }
            />
          </List.Item>
        )}
      />
    </>
  );

  if (!shouldRenderCard) {
    return selectorContent;
  }

  return (
    <Card size="small" title="Source MP3 Timeline" className="panel-card">
      {selectorContent}
    </Card>
  );
}
