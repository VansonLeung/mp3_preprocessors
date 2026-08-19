import { Router } from "express";
import { FileSystemResourceAdapter } from "../adapters/FileSystemResourceAdapter.js";

export function createFileResourceController({
  fileSystemResourceAdapter,
}: {
  fileSystemResourceAdapter: FileSystemResourceAdapter;
}) {
  const router = Router();

  router.get("/resources/file", async (request, response, next) => {
    try {
      const resourcePath = String(request.query.resourcePath ?? "");
      const contents = await fileSystemResourceAdapter.readTextResourceFile({
        resourcePath,
      });
      response.json({ resourcePath, contents });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
