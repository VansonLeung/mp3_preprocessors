import path from "node:path";
import { FileSystemResourceAdapter } from "../adapters/FileSystemResourceAdapter.js";
import { RelatedResourceModel } from "../models/RelatedResourceModel.js";

const chunkFileNamePattern =
  /^(?<sourceName>\d{8}_\d{4}_\d{4}_[A-Z0-9]+)__(?<start>\d{6}_\d{3})__(?<end>\d{6}_\d{3})\.mp3$/;

export class ChunkRelationshipDelegate {
  constructor(private readonly fileSystemResourceAdapter: FileSystemResourceAdapter) {}

  async buildRelatedResourcesForChunkResourcePath(chunkResourcePath: string) {
    const parsedChunk = this.parseChunkResourcePath(chunkResourcePath);
    const baseName = path.basename(chunkResourcePath, ".mp3");
    const sourceFolder = `${parsedChunk.dateFolder}/${parsedChunk.sourceName}`;
    const relatedResources: RelatedResourceModel[] = [
      {
        label: "Chunk MP3",
        kind: "audio",
        resourcePath: chunkResourcePath,
        exists: true,
      },
      {
        label: "Transcript TXT",
        kind: "transcript",
        resourcePath: `outputs/transcripts/chunks/blank-asr-maritime-analysis/auto/relative/${sourceFolder}/${baseName}.txt`,
        exists: false,
      },
      {
        label: "Relative SRT",
        kind: "srt",
        resourcePath: `outputs/transcripts/chunks/blank-asr-maritime-analysis/auto/relative/${sourceFolder}/${baseName}.srt`,
        exists: false,
      },
      {
        label: "Absolute SRT",
        kind: "srt",
        resourcePath: `outputs/transcripts/chunks/blank-asr-maritime-analysis/auto/absolute/${sourceFolder}/${baseName}.absolute.srt`,
        exists: false,
      },
      {
        label: "Analysis JSON",
        kind: "json",
        resourcePath: `outputs/analysis/chunks/blank-asr-maritime-analysis/auto/${sourceFolder}/${baseName}.analysis.json`,
        exists: false,
      },
      {
        label: "Analysis Markdown",
        kind: "markdown",
        resourcePath: `outputs/analysis/chunks/blank-asr-maritime-analysis/auto/${sourceFolder}/${baseName}.analysis.md`,
        exists: false,
      },
    ];

    return Promise.all(
      relatedResources.map(async (resource) => ({
        ...resource,
        exists:
          resource.exists ||
          (await this.fileSystemResourceAdapter.resourceExists(
            resource.resourcePath,
          )),
      })),
    );
  }

  parseChunkResourcePath(chunkResourcePath: string) {
    const parts = chunkResourcePath.split("/");
    const fileName = parts.at(-1) ?? "";
    const sourceName = parts.at(-2) ?? "";
    const dateFolder = parts.at(-3) ?? "";
    const matchedFileName = fileName.match(chunkFileNamePattern);

    if (!matchedFileName?.groups) {
      throw new Error(`Invalid chunk file path: ${chunkResourcePath}`);
    }

    return {
      sourceKey: `${dateFolder}/${sourceName}`,
      dateFolder,
      sourceName,
      startLabel: matchedFileName.groups.start,
      endLabel: matchedFileName.groups.end,
    };
  }
}
