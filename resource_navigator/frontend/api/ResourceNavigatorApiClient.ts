import { RelatedResourceModel } from "../models/RelatedResourceModel";
import { ResourceNodeModel } from "../models/ResourceNodeModel";
import { SourceRecordingModel } from "../models/SourceRecordingModel";
import { TimelineItemModel } from "../models/TimelineItemModel";
import { ChunkAnalysisJobModel } from "../models/ChunkAnalysisJobModel";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message ?? response.statusText);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message ?? response.statusText);
  }
  return response.json() as Promise<T>;
}

export const ResourceNavigatorApiClient = {
  async listResourceRoots() {
    return fetchJson<{
      roots: Array<{ label: string; resourcePath: string }>;
    }>("/api/resource-roots");
  },

  async loadResourceTree(resourcePath: string, maxDepth = 1) {
    const query = new URLSearchParams({
      resourcePath,
      maxDepth: String(maxDepth),
    });
    return fetchJson<{ root: ResourceNodeModel }>(
      `/api/resources/tree?${query.toString()}`,
    );
  },

  async readTextFile(resourcePath: string) {
    const query = new URLSearchParams({ resourcePath });
    return fetchJson<{ resourcePath: string; contents: string }>(
      `/api/resources/file?${query.toString()}`,
    );
  },

  mediaUrl(resourcePath: string) {
    const query = new URLSearchParams({ resourcePath });
    return `/media?${query.toString()}`;
  },

  async listSourceRecordings() {
    return fetchJson<{ sourceRecordings: SourceRecordingModel[] }>(
      "/api/source-recordings",
    );
  },

  async loadSourceRecordingTimeline(sourceKey: string) {
    const query = new URLSearchParams({ sourceKey });
    return fetchJson<{ sourceKey: string; timelineItems: TimelineItemModel[] }>(
      `/api/source-recording-timeline?${query.toString()}`,
    );
  },

  async loadChunkRelatedResources(chunkResourcePath: string) {
    const query = new URLSearchParams({ chunkResourcePath });
    return fetchJson<{
      chunkResourcePath: string;
      relatedResources: RelatedResourceModel[];
    }>(`/api/chunk-related-resources?${query.toString()}`);
  },

  async createChunkAnalysisJob(chunkResourcePaths: string[]) {
    return postJson<{ job: ChunkAnalysisJobModel }>("/api/chunk-analysis-jobs", {
      chunkResourcePaths,
    });
  },

  chunkAnalysisJobEventsUrl(jobId: string) {
    return `/api/chunk-analysis-jobs/${encodeURIComponent(jobId)}/events`;
  },
};
