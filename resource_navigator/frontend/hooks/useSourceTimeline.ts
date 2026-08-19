import { ResourceNavigatorApiClient } from "../api/ResourceNavigatorApiClient";
import { TimelineItemModel } from "../models/TimelineItemModel";
import { useAsyncData } from "./useAsyncData";

export function useSourceTimeline(sourceKey: string | null, reloadToken = 0) {
  return useAsyncData<TimelineItemModel[]>({
    load: async () =>
      sourceKey
        ? (await ResourceNavigatorApiClient.loadSourceRecordingTimeline(sourceKey))
            .timelineItems
        : [],
    dependencies: [sourceKey, reloadToken],
    initialValue: [],
  });
}
