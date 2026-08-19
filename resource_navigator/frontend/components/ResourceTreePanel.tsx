import {
  FileTextOutlined,
  FolderOpenOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Select, Spin, Tree } from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo, useState } from "react";
import { ResourceNodeModel } from "../models/ResourceNodeModel";
import { useResourceTree } from "../hooks/useResourceTree";

function convertResourceNodeToTreeNode(resourceNode: ResourceNodeModel): DataNode {
  const isDirectory = resourceNode.type === "directory";
  const isAudio = resourceNode.extension === ".mp3";
  return {
    key: resourceNode.resourcePath,
    title: resourceNode.name,
    icon: isDirectory ? (
      <FolderOpenOutlined />
    ) : isAudio ? (
      <SoundOutlined />
    ) : (
      <FileTextOutlined />
    ),
    children: resourceNode.children?.map(convertResourceNodeToTreeNode),
  };
}

export function ResourceTreePanel({
  onResourceSelected,
  shouldRenderCard = true,
}: {
  onResourceSelected: (resourcePath: string) => void;
  shouldRenderCard?: boolean;
}) {
  const [resourceRootPath, setResourceRootPath] = useState("outputs/chunks");
  const { data, isLoading, error } = useResourceTree(resourceRootPath);
  const treeData = useMemo(() => (data ? [convertResourceNodeToTreeNode(data)] : []), [data]);
  const resourceNodeByPath = useMemo(() => {
    const nodeMap = new Map<string, ResourceNodeModel>();
    function visit(resourceNode: ResourceNodeModel) {
      nodeMap.set(resourceNode.resourcePath, resourceNode);
      resourceNode.children?.forEach(visit);
    }
    if (data) {
      visit(data);
    }
    return nodeMap;
  }, [data]);

  const resourceTreeContent = (
    <>
      <div className="embedded-panel-toolbar">
        <Button size="small" onClick={() => onResourceSelected(resourceRootPath)}>
          Open
        </Button>
      </div>
      <Select
        value={resourceRootPath}
        onChange={setResourceRootPath}
        className="full-width-control"
        options={[
          { label: "Input MP3s", value: "inputs" },
          { label: "Output chunks", value: "outputs/chunks" },
          { label: "Output transcripts", value: "outputs/transcripts" },
          { label: "Output analysis", value: "outputs/analysis" },
          { label: "Output manifests", value: "outputs/manifests" },
        ]}
      />
      {isLoading ? <Spin /> : null}
      {error ? <Alert type="error" message={error} /> : null}
      <Tree
        showIcon
        treeData={treeData}
        defaultExpandAll={false}
        onSelect={(selectedKeys) => {
          const selectedKey = String(selectedKeys[0] ?? "");
          if (selectedKey) {
            const selectedResourceNode = resourceNodeByPath.get(selectedKey);
            if (selectedResourceNode?.type === "directory") {
              setResourceRootPath(selectedKey);
            }
            onResourceSelected(selectedKey);
          }
        }}
        className="resource-tree"
      />
    </>
  );

  if (!shouldRenderCard) {
    return resourceTreeContent;
  }

  return (
    <Card size="small" title="Resources" className="panel-card">
      {resourceTreeContent}
    </Card>
  );
}
