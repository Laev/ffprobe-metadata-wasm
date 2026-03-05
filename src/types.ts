export type FileInfo = {
  name: string;
  bitRate: number;
  duration: number;
  url: string;
  nbStreams: number;
  flags: number;
  nbChapters: number;
  streams: StreamInfo[];
  chapters: ChapterInfo[];
};

export type StreamInfo = {
  id: number;
  startTime: number;
  duration: number;
  codecType: number;
  codecName: string;
  format: string;
  bitRate: number;
  profile: string;
  level: number;
  width: number;
  height: number;
  channels: number;
  sampleRate: number;
  frameSize: number;
  avgFrameRate: number;
  tags: Tag[];
};

export type ChapterInfo = {
  id: number;
  timeBase: string;
  start: number;
  end: number;
  tags: Tag[];
};

export type Tag = {
  key: string;
  value: string;
};
