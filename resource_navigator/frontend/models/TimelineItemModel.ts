export interface TimelineItemModel {
  id: string;
  chunkResourcePath: string;
  chunkFileName: string;
  sourceKey: string;
  absoluteStartLabel: string;
  absoluteEndLabel: string;
  absoluteStartSeconds: number;
  absoluteEndSeconds: number;
  durationSeconds: number;
  textPreview: string;
  transcriptTextPath: string | null;
  relativeSrtPath: string | null;
  absoluteSrtPath: string | null;
  analysisJsonPath: string | null;
  analysisMarkdownPath: string | null;
}
