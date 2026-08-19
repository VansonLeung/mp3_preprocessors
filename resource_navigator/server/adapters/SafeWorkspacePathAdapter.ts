import path from "node:path";

const allowedTopLevelDirectories = new Set(["inputs", "outputs"]);

export class SafeWorkspacePathAdapter {
  constructor(private readonly workspaceRootDirectoryPath: string) {}

  getWorkspaceRootDirectoryPath() {
    return this.workspaceRootDirectoryPath;
  }

  resolveResourcePath(resourcePath: string) {
    const normalizedResourcePath = this.normalizeResourcePath(resourcePath);
    const absolutePath = path.resolve(
      this.workspaceRootDirectoryPath,
      normalizedResourcePath,
    );
    const relativeToWorkspace = path.relative(
      this.workspaceRootDirectoryPath,
      absolutePath,
    );

    if (
      relativeToWorkspace.startsWith("..") ||
      path.isAbsolute(relativeToWorkspace)
    ) {
      throw new Error(`Unsafe resource path: ${resourcePath}`);
    }

    const topLevelDirectory = normalizedResourcePath.split(path.sep)[0];
    if (!allowedTopLevelDirectories.has(topLevelDirectory)) {
      throw new Error(`Resource path is outside allowed roots: ${resourcePath}`);
    }

    return {
      absolutePath,
      resourcePath: normalizedResourcePath.split(path.sep).join("/"),
    };
  }

  normalizeResourcePath(resourcePath: string) {
    const withoutLeadingSlash = resourcePath.replace(/^\/+/, "");
    return path.normalize(withoutLeadingSlash);
  }
}
