import { Button, Card, Empty, List, Tag } from "antd";
import { RelatedResourceModel } from "../models/RelatedResourceModel";
import { useRelatedResources } from "../hooks/useRelatedResources";

function renderKindColor(kind: RelatedResourceModel["kind"]) {
  if (kind === "audio") {
    return "blue";
  }
  if (kind === "analysis" || kind === "json" || kind === "markdown") {
    return "purple";
  }
  return "green";
}

export function RelatedResourcesPanel({
  chunkResourcePath,
  onResourceSelected,
}: {
  chunkResourcePath: string | null;
  onResourceSelected: (resourcePath: string) => void;
}) {
  const { data, isLoading } = useRelatedResources(chunkResourcePath);

  if (!chunkResourcePath) {
    return <Empty description="Select a chunk to see related resources" />;
  }

  return (
    <Card size="small" title="Related Resources" className="preview-card">
      <List
        size="small"
        loading={isLoading}
        dataSource={data}
        renderItem={(resource) => (
          <List.Item
            actions={[
              <Button
                key="open"
                size="small"
                disabled={!resource.exists}
                onClick={() => onResourceSelected(resource.resourcePath)}
              >
                Open
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <>
                  <Tag color={renderKindColor(resource.kind)}>{resource.kind}</Tag>
                  {resource.label}
                </>
              }
              description={resource.exists ? resource.resourcePath : "Not found"}
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
