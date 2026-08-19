export interface RelatedResourceModel {
  label: string;
  kind: "audio" | "transcript" | "srt" | "analysis" | "json" | "markdown";
  resourcePath: string;
  exists: boolean;
}
