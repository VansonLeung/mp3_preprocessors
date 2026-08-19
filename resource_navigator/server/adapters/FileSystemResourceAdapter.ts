import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { lookup as lookupMimeType } from "mime-types";
import { ResourceNodeModel } from "../models/ResourceNodeModel.js";
import { SafeWorkspacePathAdapter } from "./SafeWorkspacePathAdapter.js";

const hiddenFileNames = new Set([".DS_Store"]);

export class FileSystemResourceAdapter {
  constructor(private readonly safeWorkspacePathAdapter: SafeWorkspacePathAdapter) {}

  async listResourceDirectory({
    resourcePath,
    maxDepth = 1,
  }: {
    resourcePath: string;
    maxDepth?: number;
  }) {
    const { absolutePath, resourcePath: safeResourcePath } =
      this.safeWorkspacePathAdapter.resolveResourcePath(resourcePath);
    return this.buildResourceNode({
      absolutePath,
      resourcePath: safeResourcePath,
      remainingDepth: maxDepth,
    });
  }

  async readTextResourceFile({ resourcePath }: { resourcePath: string }) {
    const { absolutePath } =
      this.safeWorkspacePathAdapter.resolveResourcePath(resourcePath);
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) {
      throw new Error("Resource is not a file.");
    }
    return fs.readFile(absolutePath, "utf8");
  }

  createReadStreamForResourceFile({ resourcePath }: { resourcePath: string }) {
    const { absolutePath } =
      this.safeWorkspacePathAdapter.resolveResourcePath(resourcePath);
    return {
      absolutePath,
      stream: fsSync.createReadStream(absolutePath),
      mimeType: lookupMimeType(absolutePath) || "application/octet-stream",
    };
  }

  async resourceExists(resourcePath: string) {
    try {
      const { absolutePath } =
        this.safeWorkspacePathAdapter.resolveResourcePath(resourcePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async readOptionalTextFile(resourcePath: string | null) {
    if (!resourcePath) {
      return "";
    }
    if (!(await this.resourceExists(resourcePath))) {
      return "";
    }
    return this.readTextResourceFile({ resourcePath });
  }

  private async buildResourceNode({
    absolutePath,
    resourcePath,
    remainingDepth,
  }: {
    absolutePath: string;
    resourcePath: string;
    remainingDepth: number;
  }): Promise<ResourceNodeModel> {
    const stat = await fs.stat(absolutePath);
    const isDirectory = stat.isDirectory();
    const node: ResourceNodeModel = {
      id: resourcePath,
      name: path.basename(resourcePath) || resourcePath,
      resourcePath,
      type: isDirectory ? "directory" : "file",
      extension: isDirectory ? "" : path.extname(resourcePath).toLowerCase(),
      sizeBytes: isDirectory ? null : stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };

    if (!isDirectory || remainingDepth <= 0) {
      return node;
    }

    const directoryEntries = await fs.readdir(absolutePath, {
      withFileTypes: true,
    });
    const visibleEntries = directoryEntries
      .filter((entry) => !hiddenFileNames.has(entry.name))
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });

    node.children = await Promise.all(
      visibleEntries.map((entry) =>
        this.buildResourceNode({
          absolutePath: path.join(absolutePath, entry.name),
          resourcePath: path.join(resourcePath, entry.name).split(path.sep).join("/"),
          remainingDepth: remainingDepth - 1,
        }),
      ),
    );

    return node;
  }
}
