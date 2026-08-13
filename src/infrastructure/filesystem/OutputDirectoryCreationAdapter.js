import fs from "node:fs/promises";

export async function ensureOutputDirectoryExistsAdapter({ directoryPath }) {
  await fs.mkdir(directoryPath, { recursive: true });
}
