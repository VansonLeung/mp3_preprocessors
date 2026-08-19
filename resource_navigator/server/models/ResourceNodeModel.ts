export type ResourceNodeType = "directory" | "file";

export interface ResourceNodeModel {
  id: string;
  name: string;
  resourcePath: string;
  type: ResourceNodeType;
  extension: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  children?: ResourceNodeModel[];
}
