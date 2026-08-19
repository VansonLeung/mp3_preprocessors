import { Alert, Card, Empty, Spin, Typography } from "antd";
import { ResourceNavigatorApiClient } from "../api/ResourceNavigatorApiClient";
import { useAsyncData } from "../hooks/useAsyncData";

export function TextFilePreviewPanel({
  resourcePath,
}: {
  resourcePath: string | null;
}) {
  const { data, isLoading, error } = useAsyncData<string>({
    load: async () =>
      resourcePath
        ? (await ResourceNavigatorApiClient.readTextFile(resourcePath)).contents
        : "",
    dependencies: [resourcePath],
    initialValue: "",
  });

  if (!resourcePath) {
    return <Empty description="Select a readable resource" />;
  }

  if (isLoading) {
    return <Spin />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  const looksLikeJson = resourcePath.endsWith(".json");
  let displayedText = data;
  if (looksLikeJson) {
    try {
      displayedText = JSON.stringify(JSON.parse(data || "{}"), null, 2);
    } catch {
      displayedText = data;
    }
  }

  return (
    <Card
      size="small"
      title={resourcePath.endsWith(".md") ? "Markdown" : "Text"}
      className="preview-card"
    >
      <Typography.Text className="resource-path" copyable>
        {resourcePath}
      </Typography.Text>
      <pre className="text-preview">{displayedText}</pre>
    </Card>
  );
}
