import { Alert, Collapse, Descriptions, Empty, Space, Spin, Tag, Typography } from "antd";
import { ResourceNavigatorApiClient } from "../api/ResourceNavigatorApiClient";
import { useAsyncData } from "../hooks/useAsyncData";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyScalar(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }

  return String(value);
}

function renderTags(values: unknown, emptyText = "None") {
  if (!Array.isArray(values) || values.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }

  return (
    <Space size={[4, 4]} wrap>
      {values.map((value, index) => (
        <Tag key={`${String(value)}-${index}`}>{stringifyScalar(value)}</Tag>
      ))}
    </Space>
  );
}

function renderPercentage(value: unknown) {
  if (typeof value !== "number") {
    return stringifyScalar(value);
  }

  return `${Math.round(value * 100)}%`;
}

function renderReasonList(values: unknown) {
  if (!Array.isArray(values) || values.length === 0) {
    return <Typography.Text type="secondary">None</Typography.Text>;
  }

  return (
    <ul className="analysis-reason-list">
      {values.map((value, index) => (
        <li key={`${String(value)}-${index}`}>{stringifyScalar(value)}</li>
      ))}
    </ul>
  );
}

function parseAnalysisJson(contents: string) {
  return JSON.parse(contents || "{}") as JsonObject;
}

export function MaritimeAnalysisSummaryPanel({
  analysisJsonPath,
}: {
  analysisJsonPath: string | null;
}) {
  const { data, isLoading, error } = useAsyncData<string>({
    load: async () =>
      analysisJsonPath
        ? (await ResourceNavigatorApiClient.readTextFile(analysisJsonPath)).contents
        : "",
    dependencies: [analysisJsonPath],
    initialValue: "",
  });

  if (!analysisJsonPath) {
    return (
      <div className="analysis-summary-panel">
        <Empty description="No related analysis JSON for this timeline row" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="analysis-summary-panel">
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-summary-panel">
        <Alert type="error" message={error} />
      </div>
    );
  }

  let analysis: JsonObject;
  try {
    analysis = parseAnalysisJson(data);
  } catch (parseError) {
    return (
      <div className="analysis-summary-panel">
        <Alert
          type="error"
          message="Analysis JSON could not be parsed"
          description={parseError instanceof Error ? parseError.message : String(parseError)}
        />
        <pre className="analysis-raw-json">{data}</pre>
      </div>
    );
  }

  const vesselInformation = isJsonObject(analysis.vesselInformation)
    ? analysis.vesselInformation
    : {};
  const commandInformation = isJsonObject(analysis.commandInformation)
    ? analysis.commandInformation
    : {};
  const conversationStructure = isJsonObject(analysis.conversationStructure)
    ? analysis.conversationStructure
    : {};
  const spokenLanguageProportions = isJsonObject(analysis.spokenLanguageProportions)
    ? analysis.spokenLanguageProportions
    : {};
  const analysisRemarks = isJsonObject(analysis.analysisRemarks)
    ? analysis.analysisRemarks
    : {};
  const debugContext = isJsonObject(analysis.debugContext) ? analysis.debugContext : {};

  const prettyJson = JSON.stringify(analysis, null, 2);

  return (
    <div className="analysis-summary-panel">
      <Typography.Title level={5}>Analysis</Typography.Title>
      <Typography.Paragraph className="analysis-description">
        {stringifyScalar(analysis.analysisDescription)}
      </Typography.Paragraph>

      <Descriptions size="small" bordered column={1}>
        <Descriptions.Item label="Classification">
          <Tag color={analysis.hasMaritimeCommandInformation ? "green" : "default"}>
            {stringifyScalar(analysis.classification)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Maritime Command">
          {stringifyScalar(analysis.hasMaritimeCommandInformation)}
        </Descriptions.Item>
        <Descriptions.Item label="Confidence">
          {renderPercentage(analysis.confidence)}
        </Descriptions.Item>
        <Descriptions.Item label="Human Review Label">
          {stringifyScalar(analysis.recommendedHumanReviewLabel)}
        </Descriptions.Item>
        <Descriptions.Item label="Channel">
          {stringifyScalar(debugContext.channel)}
        </Descriptions.Item>
        <Descriptions.Item label="Absolute Time">
          {stringifyScalar(debugContext.absoluteStartDateTime)} to{" "}
          {stringifyScalar(debugContext.absoluteEndDateTime)}
        </Descriptions.Item>
        <Descriptions.Item label="Vessels">
          {renderTags(vesselInformation.vesselNames)}
        </Descriptions.Item>
        <Descriptions.Item label="Agencies">
          {renderTags(vesselInformation.agencyNames)}
        </Descriptions.Item>
        <Descriptions.Item label="Callsigns">
          {renderTags(vesselInformation.callsigns)}
        </Descriptions.Item>
        <Descriptions.Item label="Numeric IDs">
          {renderTags(vesselInformation.numericIdentifiers)}
        </Descriptions.Item>
        <Descriptions.Item label="Locations">
          {renderTags(vesselInformation.locations)}
        </Descriptions.Item>
        <Descriptions.Item label="Command Types">
          {renderTags(commandInformation.commandTypes)}
        </Descriptions.Item>
        <Descriptions.Item label="Instructions">
          {renderReasonList(commandInformation.instructions)}
        </Descriptions.Item>
        <Descriptions.Item label="Warnings">
          {renderReasonList(commandInformation.warnings)}
        </Descriptions.Item>
        <Descriptions.Item label="Requests">
          {renderReasonList(commandInformation.requests)}
        </Descriptions.Item>
        <Descriptions.Item label="Multi-Speaker">
          {stringifyScalar(conversationStructure.isLikelyMultiSpeakerConversation)}
        </Descriptions.Item>
        <Descriptions.Item label="Speaker Estimate">
          {stringifyScalar(conversationStructure.speakerCountEstimate)}
        </Descriptions.Item>
        <Descriptions.Item label="Language Mix">
          <Space size={[4, 4]} wrap>
            <Tag>English {renderPercentage(spokenLanguageProportions.english)}</Tag>
            <Tag>Cantonese {renderPercentage(spokenLanguageProportions.cantonese)}</Tag>
            <Tag>Mandarin {renderPercentage(spokenLanguageProportions.mandarin)}</Tag>
            <Tag>Unknown {renderPercentage(spokenLanguageProportions.unknown)}</Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Classification Reasons">
          {renderReasonList(analysisRemarks.classificationReasons)}
        </Descriptions.Item>
        <Descriptions.Item label="Uncertainties">
          {renderReasonList(analysisRemarks.uncertainties)}
        </Descriptions.Item>
      </Descriptions>

      <Collapse
        className="analysis-raw-json-collapse"
        defaultActiveKey={["raw-json"]}
        items={[
          {
            key: "raw-json",
            label: "Raw JSON",
            children: <pre className="analysis-raw-json">{prettyJson}</pre>,
          },
        ]}
      />
    </div>
  );
}
