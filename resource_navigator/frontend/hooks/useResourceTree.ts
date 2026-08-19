import { ResourceNavigatorApiClient } from "../api/ResourceNavigatorApiClient";
import { ResourceNodeModel } from "../models/ResourceNodeModel";
import { useAsyncData } from "./useAsyncData";

export function useResourceTree(resourcePath: string) {
  return useAsyncData<ResourceNodeModel | null>({
    load: async () =>
      (await ResourceNavigatorApiClient.loadResourceTree(resourcePath, 2)).root,
    dependencies: [resourcePath],
    initialValue: null,
  });
}
