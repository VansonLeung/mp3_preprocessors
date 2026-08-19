export interface SourceRecordingModel {
  id: string;
  sourceKey: string;
  inputMp3Path: string | null;
  chunkDirectoryPath: string | null;
  dateFolder: string;
  sourceName: string;
  dateStamp: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  channel: string;
  chunkCount: number;
  analysisCount: number;
}
