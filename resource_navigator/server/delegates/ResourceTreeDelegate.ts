import { FileSystemResourceAdapter } from "../adapters/FileSystemResourceAdapter.js";

export class ResourceTreeDelegate {
  constructor(private readonly fileSystemResourceAdapter: FileSystemResourceAdapter) {}

  listAllowedRoots() {
    return [
      { label: "Input MP3s", resourcePath: "inputs" },
      { label: "Output chunks", resourcePath: "outputs/chunks" },
      { label: "Output transcripts", resourcePath: "outputs/transcripts" },
      { label: "Output analysis", resourcePath: "outputs/analysis" },
      { label: "Output manifests", resourcePath: "outputs/manifests" },
    ];
  }

  async listResourceTree({
    resourcePath,
    maxDepth,
  }: {
    resourcePath: string;
    maxDepth: number;
  }) {
    return this.fileSystemResourceAdapter.listResourceDirectory({
      resourcePath,
      maxDepth,
    });
  }
}
