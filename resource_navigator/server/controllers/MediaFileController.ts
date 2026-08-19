import fs from "node:fs/promises";
import { Router } from "express";
import { FileSystemResourceAdapter } from "../adapters/FileSystemResourceAdapter.js";

export function createMediaFileController({
  fileSystemResourceAdapter,
}: {
  fileSystemResourceAdapter: FileSystemResourceAdapter;
}) {
  const router = Router();

  router.get("/media", async (request, response, next) => {
    try {
      const resourcePath = String(request.query.resourcePath ?? "");
      const { absolutePath, stream, mimeType } =
        fileSystemResourceAdapter.createReadStreamForResourceFile({
          resourcePath,
        });
      const stat = await fs.stat(absolutePath);

      response.setHeader("Content-Type", mimeType);
      response.setHeader("Accept-Ranges", "bytes");
      response.setHeader("Content-Length", String(stat.size));
      stream.pipe(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
