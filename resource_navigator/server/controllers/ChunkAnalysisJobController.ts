import { Router } from "express";
import { ChunkAnalysisJobQueueDelegate } from "../delegates/ChunkAnalysisJobQueueDelegate.js";

export function createChunkAnalysisJobController({
  chunkAnalysisJobQueueDelegate,
}: {
  chunkAnalysisJobQueueDelegate: ChunkAnalysisJobQueueDelegate;
}) {
  const router = Router();

  router.post("/chunk-analysis-jobs", (request, response, next) => {
    try {
      response.json({
        job: chunkAnalysisJobQueueDelegate.createChunkAnalysisJob({
          chunkResourcePaths: request.body?.chunkResourcePaths ?? [],
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/chunk-analysis-jobs/:jobId", (request, response, next) => {
    try {
      response.json({
        job: chunkAnalysisJobQueueDelegate.getChunkAnalysisJob(
          request.params.jobId,
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/chunk-analysis-jobs/:jobId/events",
    (request, response, next) => {
      try {
        const jobId = request.params.jobId;
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        const writeJobEvent = (job: unknown) => {
          response.write(`event: job\n`);
          response.write(`data: ${JSON.stringify(job)}\n\n`);
        };
        const unsubscribe =
          chunkAnalysisJobQueueDelegate.subscribeToChunkAnalysisJob({
            jobId,
            listener: writeJobEvent,
          });

        writeJobEvent(chunkAnalysisJobQueueDelegate.getChunkAnalysisJob(jobId));
        request.on("close", unsubscribe);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
