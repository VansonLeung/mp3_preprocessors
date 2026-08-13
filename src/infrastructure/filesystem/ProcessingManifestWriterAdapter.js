import fs from "node:fs/promises";
import path from "node:path";
import { ensureOutputDirectoryExistsAdapter } from "./OutputDirectoryCreationAdapter.js";

export async function writeProcessingManifestFileAdapter({
  outputsDirectoryPath,
  manifestRecords,
}) {
  const manifestsDirectoryPath = path.join(outputsDirectoryPath, "manifests");
  await ensureOutputDirectoryExistsAdapter({
    directoryPath: manifestsDirectoryPath,
  });

  const manifestFilePath = path.join(
    manifestsDirectoryPath,
    `processing-manifest-${new Date().toISOString().replaceAll(":", "")}.jsonl`,
  );

  const manifestContents = manifestRecords
    .map((manifestRecord) => JSON.stringify(manifestRecord))
    .join("\n");

  await fs.writeFile(manifestFilePath, `${manifestContents}\n`, "utf8");

  return manifestFilePath;
}
