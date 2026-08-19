import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Progress,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResourceNavigatorApiClient } from "../api/ResourceNavigatorApiClient";
import { ChunkAnalysisJobModel } from "../models/ChunkAnalysisJobModel";
import { TimelineItemModel } from "../models/TimelineItemModel";
import { useSourceTimeline } from "../hooks/useSourceTimeline";

function buildTimelineColumns({
  shouldExpandTranscript,
}: {
  shouldExpandTranscript: boolean;
}): ColumnsType<TimelineItemModel> {
  return [
    {
      title: "Start",
      dataIndex: "absoluteStartLabel",
      width: 110,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: "End",
      dataIndex: "absoluteEndLabel",
      width: 110,
    },
    {
      title: "Duration",
      dataIndex: "durationSeconds",
      width: 90,
      render: (value: number) => `${value.toFixed(1)}s`,
    },
    {
      title: "Transcript",
      dataIndex: "textPreview",
      render: (value: string) => (
        <Typography.Paragraph
          className={
            shouldExpandTranscript
              ? "timeline-transcript-expanded"
              : "timeline-transcript-collapsed"
          }
          ellipsis={shouldExpandTranscript ? false : { rows: 1 }}
        >
          {value || "No transcript yet"}
        </Typography.Paragraph>
      ),
    },
  ];
}

export function SourceTimelinePanel({
  sourceKey,
  selectedChunkResourcePath,
  onTimelineItemSelected,
  onVisibleTimelineItemsChanged,
}: {
  sourceKey: string | null;
  selectedChunkResourcePath: string | null;
  onTimelineItemSelected: (timelineItem: TimelineItemModel) => void;
  onVisibleTimelineItemsChanged: (timelineItems: TimelineItemModel[]) => void;
}) {
  const [timelineReloadToken, setTimelineReloadToken] = useState(0);
  const { data, isLoading } = useSourceTimeline(sourceKey, timelineReloadToken);
  const [keywordSearchText, setKeywordSearchText] = useState("");
  const [shouldExpandTranscript, setShouldExpandTranscript] = useState(false);
  const [selectedChunkResourcePaths, setSelectedChunkResourcePaths] = useState<
    string[]
  >([]);
  const [analysisJob, setAnalysisJob] = useState<ChunkAnalysisJobModel | null>(
    null,
  );
  const [analysisJobError, setAnalysisJobError] = useState<string | null>(null);
  const analysisJobEventSourceRef = useRef<EventSource | null>(null);
  const filteredTimelineItems = useMemo(() => {
    const normalizedSearchText = keywordSearchText.trim().toLowerCase();
    if (!normalizedSearchText) {
      return data;
    }

    return data.filter((timelineItem) =>
      [
        timelineItem.chunkFileName,
        timelineItem.absoluteStartLabel,
        timelineItem.absoluteEndLabel,
        timelineItem.textPreview,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearchText),
    );
  }, [data, keywordSearchText]);
  const columns = useMemo(
    () => buildTimelineColumns({ shouldExpandTranscript }),
    [shouldExpandTranscript],
  );

  useEffect(() => {
    onVisibleTimelineItemsChanged(filteredTimelineItems);
  }, [filteredTimelineItems, onVisibleTimelineItemsChanged]);

  useEffect(() => {
    setSelectedChunkResourcePaths([]);
  }, [sourceKey]);

  useEffect(
    () => () => {
      analysisJobEventSourceRef.current?.close();
    },
    [],
  );

  useEffect(() => {
    window.setTimeout(() => {
      document
        .querySelector(".selected-table-row")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 50);
  }, [selectedChunkResourcePath, filteredTimelineItems]);

  if (!sourceKey) {
    return <Empty description="Select a source MP3 timeline" />;
  }

  const isAnalysisJobRunning =
    analysisJob?.status === "queued" || analysisJob?.status === "running";
  const analysisJobPercent =
    analysisJob && analysisJob.totalChunkCount > 0
      ? Math.round(
          (analysisJob.completedChunkCount / analysisJob.totalChunkCount) * 100,
        )
      : 0;

  async function startAnalysisJob(chunkResourcePaths: string[]) {
    if (chunkResourcePaths.length === 0 || isAnalysisJobRunning) {
      return;
    }

    setAnalysisJobError(null);
    const { job } =
      await ResourceNavigatorApiClient.createChunkAnalysisJob(chunkResourcePaths);
    setAnalysisJob(job);
    analysisJobEventSourceRef.current?.close();
    const eventSource = new EventSource(
      ResourceNavigatorApiClient.chunkAnalysisJobEventsUrl(job.jobId),
    );
    analysisJobEventSourceRef.current = eventSource;
    eventSource.addEventListener("job", (event) => {
      const nextJob = JSON.parse((event as MessageEvent).data);
      setAnalysisJob(nextJob);
      if (nextJob.status === "completed" || nextJob.status === "failed") {
        eventSource.close();
        setTimelineReloadToken((currentToken) => currentToken + 1);
      }
    });
    eventSource.onerror = () => {
      setAnalysisJobError("Analysis progress stream disconnected.");
      eventSource.close();
    };
  }

  return (
    <Card
      size="small"
      title={sourceKey}
      className="panel-card"
      extra={
        <div className="timeline-toolbar">
          <Space size={6}>
            <Button
              size="small"
              disabled={!selectedChunkResourcePath || isAnalysisJobRunning}
              onClick={() =>
                selectedChunkResourcePath
                  ? void startAnalysisJob([selectedChunkResourcePath])
                  : undefined
              }
            >
              Analyze Active
            </Button>
            <Button
              size="small"
              type="primary"
              disabled={
                selectedChunkResourcePaths.length === 0 || isAnalysisJobRunning
              }
              onClick={() => void startAnalysisJob(selectedChunkResourcePaths)}
            >
              Analyze Selected
            </Button>
          </Space>
          <Input.Search
            allowClear
            size="small"
            placeholder="Keyword"
            value={keywordSearchText}
            onChange={(event) => setKeywordSearchText(event.target.value)}
            className="timeline-search"
          />
          <Switch
            size="small"
            checked={shouldExpandTranscript}
            onChange={setShouldExpandTranscript}
          />
          <Typography.Text type="secondary">Expand</Typography.Text>
        </div>
      }
    >
      {analysisJob ? (
        <Alert
          className="analysis-job-alert"
          type={
            analysisJob.status === "failed"
              ? "error"
              : analysisJob.status === "completed"
                ? "success"
                : "info"
          }
          showIcon
          message={`Analysis job ${analysisJob.status}: ${analysisJob.completedChunkCount}/${analysisJob.totalChunkCount}`}
          description={
            <>
              <Progress
                size="small"
                percent={analysisJobPercent}
                status={analysisJob.status === "failed" ? "exception" : undefined}
              />
              <Typography.Text type="secondary">
                {analysisJob.currentChunkFileName ?? analysisJob.errorMessage}
              </Typography.Text>
              {analysisJob.recentLogs.length > 0 ? (
                <pre className="analysis-job-log">
                  {analysisJob.recentLogs.slice(-6).join("\n")}
                </pre>
              ) : null}
            </>
          }
        />
      ) : null}
      {analysisJobError ? (
        <Alert
          className="analysis-job-alert"
          type="warning"
          showIcon
          message={analysisJobError}
        />
      ) : null}
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={filteredTimelineItems}
        columns={columns}
        pagination={false}
        scroll={{ y: "calc(100vh - 265px)" }}
        rowSelection={{
          selectedRowKeys: selectedChunkResourcePaths,
          onChange: (selectedRowKeys) =>
            setSelectedChunkResourcePaths(selectedRowKeys.map(String)),
        }}
        rowClassName={(timelineItem) =>
          timelineItem.chunkResourcePath === selectedChunkResourcePath
            ? "selected-table-row"
            : ""
        }
        onRow={(timelineItem) => ({
          onClick: () => onTimelineItemSelected(timelineItem),
        })}
      />
    </Card>
  );
}
