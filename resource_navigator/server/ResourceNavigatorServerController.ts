import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileSystemResourceAdapter } from "./adapters/FileSystemResourceAdapter.js";
import { SafeWorkspacePathAdapter } from "./adapters/SafeWorkspacePathAdapter.js";
import { ChunkRelationshipDelegate } from "./delegates/ChunkRelationshipDelegate.js";
import { ChunkAnalysisJobQueueDelegate } from "./delegates/ChunkAnalysisJobQueueDelegate.js";
import { ResourceTreeDelegate } from "./delegates/ResourceTreeDelegate.js";
import { SourceRecordingTimelineDelegate } from "./delegates/SourceRecordingTimelineDelegate.js";
import { createChunkAnalysisJobController } from "./controllers/ChunkAnalysisJobController.js";
import { createFileResourceController } from "./controllers/FileResourceController.js";
import { createMediaFileController } from "./controllers/MediaFileController.js";
import { createResourceTreeController } from "./controllers/ResourceTreeController.js";
import { createSourceRecordingTimelineController } from "./controllers/SourceRecordingTimelineController.js";

const currentFilePath = fileURLToPath(import.meta.url);
const resourceNavigatorDirectoryPath = path.resolve(
  path.dirname(currentFilePath),
  "..",
);
const workspaceRootDirectoryPath = path.resolve(
  resourceNavigatorDirectoryPath,
  "..",
);
const port = Number(process.env.RESOURCE_NAVIGATOR_PORT ?? 4174);

const safeWorkspacePathAdapter = new SafeWorkspacePathAdapter(
  workspaceRootDirectoryPath,
);
const fileSystemResourceAdapter = new FileSystemResourceAdapter(
  safeWorkspacePathAdapter,
);
const resourceTreeDelegate = new ResourceTreeDelegate(fileSystemResourceAdapter);
const chunkRelationshipDelegate = new ChunkRelationshipDelegate(
  fileSystemResourceAdapter,
);
const chunkAnalysisJobQueueDelegate = new ChunkAnalysisJobQueueDelegate(
  workspaceRootDirectoryPath,
  safeWorkspacePathAdapter,
);
const sourceRecordingTimelineDelegate = new SourceRecordingTimelineDelegate(
  safeWorkspacePathAdapter,
  fileSystemResourceAdapter,
);

const app = express();

app.use(express.json());
app.use(
  "/api",
  createResourceTreeController({ resourceTreeDelegate }),
  createFileResourceController({ fileSystemResourceAdapter }),
  createChunkAnalysisJobController({ chunkAnalysisJobQueueDelegate }),
  createSourceRecordingTimelineController({
    sourceRecordingTimelineDelegate,
    chunkRelationshipDelegate,
  }),
);
app.use(createMediaFileController({ fileSystemResourceAdapter }));

if (process.env.NODE_ENV === "production") {
  const frontendDistDirectoryPath = path.join(
    resourceNavigatorDirectoryPath,
    "dist",
  );
  app.use(express.static(frontendDistDirectoryPath));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(frontendDistDirectoryPath, "index.html"));
  });
}

app.use(
  (
    error: Error,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    response.status(400).json({
      error: {
        message: error.message,
      },
    });
  },
);

app.listen(port, "127.0.0.1", () => {
  console.log(`Resource navigator listening on http://127.0.0.1:${port}`);
});
