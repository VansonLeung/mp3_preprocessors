import { Router } from "express";
import { SourceRecordingTimelineDelegate } from "../delegates/SourceRecordingTimelineDelegate.js";
import { ChunkRelationshipDelegate } from "../delegates/ChunkRelationshipDelegate.js";

export function createSourceRecordingTimelineController({
  sourceRecordingTimelineDelegate,
  chunkRelationshipDelegate,
}: {
  sourceRecordingTimelineDelegate: SourceRecordingTimelineDelegate;
  chunkRelationshipDelegate: ChunkRelationshipDelegate;
}) {
  const router = Router();

  router.get("/source-recordings", async (_request, response, next) => {
    try {
      response.json({
        sourceRecordings:
          await sourceRecordingTimelineDelegate.listSourceRecordings(),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/source-recording-timeline", async (request, response, next) => {
    try {
      const sourceKey = String(request.query.sourceKey ?? "");
      response.json({
        sourceKey,
        timelineItems:
          await sourceRecordingTimelineDelegate.buildTimelineForSourceKey(
            sourceKey,
          ),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/chunk-related-resources", async (request, response, next) => {
    try {
      const chunkResourcePath = String(request.query.chunkResourcePath ?? "");
      response.json({
        chunkResourcePath,
        relatedResources:
          await chunkRelationshipDelegate.buildRelatedResourcesForChunkResourcePath(
            chunkResourcePath,
          ),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
