import { ResourceNavigatorApiClient } from "../api/ResourceNavigatorApiClient";
import { SourceRecordingModel } from "../models/SourceRecordingModel";
import { useAsyncData } from "./useAsyncData";

export function useSourceRecordings() {
  return useAsyncData<SourceRecordingModel[]>({
    load: async () =>
      (await ResourceNavigatorApiClient.listSourceRecordings()).sourceRecordings,
    dependencies: [],
    initialValue: [],
  });
}
