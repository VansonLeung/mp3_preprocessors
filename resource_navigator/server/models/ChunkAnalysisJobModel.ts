export type ChunkAnalysisJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface ChunkAnalysisJobModel {
  jobId: string;
  status: ChunkAnalysisJobStatus;
  chunkResourcePaths: string[];
  totalChunkCount: number;
  completedChunkCount: number;
  currentChunkFileName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  recentLogs: string[];
}
