import { ResourceNavigatorApiClient } from "../api/ResourceNavigatorApiClient";
import { RelatedResourceModel } from "../models/RelatedResourceModel";
import { useAsyncData } from "./useAsyncData";

export function useRelatedResources(chunkResourcePath: string | null) {
  return useAsyncData<RelatedResourceModel[]>({
    load: async () =>
      chunkResourcePath
        ? (
            await ResourceNavigatorApiClient.loadChunkRelatedResources(
              chunkResourcePath,
            )
          ).relatedResources
        : [],
    dependencies: [chunkResourcePath],
    initialValue: [],
  });
}
