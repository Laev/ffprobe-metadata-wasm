/**
 * ffprobe-metadata-wasm 对外 API 入口
 * 仅用于预检测视频元信息，Worker 模式，无 SharedArrayBuffer 依赖
 */
export {
  init,
  getInfo,
  libavformatVersion,
  libavcodecVersion,
  libavutilVersion,
} from "./function";

export type { FileInfo, StreamInfo, ChapterInfo, Tag } from "./types";
