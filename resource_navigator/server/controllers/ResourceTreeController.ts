import { Router } from "express";
import { ResourceTreeDelegate } from "../delegates/ResourceTreeDelegate.js";

export function createResourceTreeController({
  resourceTreeDelegate,
}: {
  resourceTreeDelegate: ResourceTreeDelegate;
}) {
  const router = Router();

  router.get("/resource-roots", (_request, response, next) => {
    try {
      response.json({ roots: resourceTreeDelegate.listAllowedRoots() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/resources/tree", async (request, response, next) => {
    try {
      const resourcePath = String(request.query.resourcePath ?? "outputs");
      const maxDepth = Number(request.query.maxDepth ?? 1);
      response.json({
        root: await resourceTreeDelegate.listResourceTree({
          resourcePath,
          maxDepth: Number.isFinite(maxDepth) ? maxDepth : 1,
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
