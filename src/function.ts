/**
 * 核心逻辑：Worker 模式，init 幂等，getInfo 自动 init
 */
import { getWorker, sendGetFileInfo, getCachedVersions } from "./worker-factory";
import type { FileInfo, StreamInfo, ChapterInfo, Tag } from "./types";

export interface InitOptions {
  wasmUrl?: string | URL;
  wasmJsUrl?: string | URL;
}

let initPromise: Promise<void> | null = null;
let resolvedUrls: { jsUrl: string; wasmUrl: string } | null = null;

function resolveUrls(options?: InitOptions): { jsUrl: string; wasmUrl: string } {
  if (options?.wasmJsUrl && options?.wasmUrl) {
    return {
      jsUrl:
        typeof options.wasmJsUrl === "string"
          ? options.wasmJsUrl
          : options.wasmJsUrl.href,
      wasmUrl:
        typeof options.wasmUrl === "string"
          ? options.wasmUrl
          : options.wasmUrl.href,
    };
  }
  if (options?.wasmUrl) {
    const wasmStr =
      typeof options.wasmUrl === "string"
        ? options.wasmUrl
        : options.wasmUrl.href;
    return {
      wasmUrl: wasmStr,
      jsUrl: wasmStr.replace(/\.wasm$/, ".js"),
    };
  }
  if (options?.wasmJsUrl) {
    const jsStr =
      typeof options.wasmJsUrl === "string"
        ? options.wasmJsUrl
        : options.wasmJsUrl.href;
    return {
      jsUrl: jsStr,
      wasmUrl: jsStr.replace(/\.js$/, ".wasm"),
    };
  }
  try {
    const base = new URL("./ffprobe-wasm.js", import.meta.url).href;
    return {
      jsUrl: base,
      wasmUrl: base.replace(/\.js$/, ".wasm"),
    };
  } catch {
    return {
      jsUrl: "./ffprobe-wasm.js",
      wasmUrl: "./ffprobe-wasm.wasm",
    };
  }
}

async function doInit(options?: InitOptions): Promise<void> {
  const urls = resolveUrls(options);
  resolvedUrls = urls;
  await getWorker(urls);
}

/**
 * 初始化 ffprobe-wasm（幂等，可多次调用）
 * @param options wasmUrl / wasmJsUrl 可选，用于自定义 WASM 资源路径
 */
export const init = async (options?: InitOptions): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }
  initPromise = doInit(options);
  return initPromise;
};

/**
 * 将输入转换为 ArrayBuffer
 */
async function inputToArrayBuffer(input: unknown): Promise<ArrayBuffer> {
  if (input instanceof Uint8Array) {
    return input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength
    ) as ArrayBuffer;
  }
  if (input instanceof ArrayBuffer) {
    return input;
  }
  if (input instanceof Blob || input instanceof File) {
    return input.arrayBuffer() as Promise<ArrayBuffer>;
  }
  if (input instanceof URL || typeof input === "string") {
    const url = input instanceof URL ? input : new URL(input);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }
    return res.arrayBuffer() as Promise<ArrayBuffer>;
  }
  if (
    input &&
    typeof input === "object" &&
    "buffer" in input &&
    input.buffer instanceof ArrayBuffer
  ) {
    const v = input as ArrayBufferView;
    return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer;
  }
  throw new Error(
    "Invalid input type. Expected File, Blob, Uint8Array, ArrayBuffer, or URL."
  );
}

function toFileInfo(raw: Record<string, unknown>): FileInfo {
  const streams: StreamInfo[] = ((raw.streams as unknown[]) || []).map(
    (s) => ({
      id: ((s as Record<string, unknown>).id as number) ?? 0,
      startTime: ((s as Record<string, unknown>).start_time as number) ?? 0,
      duration: ((s as Record<string, unknown>).duration as number) ?? 0,
      codecType: ((s as Record<string, unknown>).codec_type as number) ?? 0,
      codecName: ((s as Record<string, unknown>).codec_name as string) ?? "",
      format: ((s as Record<string, unknown>).format as string) ?? "",
      bitRate: ((s as Record<string, unknown>).bit_rate as number) ?? 0,
      profile: ((s as Record<string, unknown>).profile as string) ?? "",
      level: ((s as Record<string, unknown>).level as number) ?? 0,
      width: ((s as Record<string, unknown>).width as number) ?? 0,
      height: ((s as Record<string, unknown>).height as number) ?? 0,
      channels: ((s as Record<string, unknown>).channels as number) ?? 0,
      sampleRate: ((s as Record<string, unknown>).sample_rate as number) ?? 0,
      frameSize: ((s as Record<string, unknown>).frame_size as number) ?? 0,
      avgFrameRate: ((s as Record<string, unknown>).avg_frame_rate as number) ?? 0,
      tags: ((s as Record<string, unknown>).tags as Tag[]) || [],
    })
  );

  return {
    name: (raw.name as string) ?? "",
    bitRate: (raw.bit_rate as number) ?? 0,
    duration: (raw.duration as number) ?? 0,
    url: (raw.url as string) ?? "",
    nbStreams: (raw.nb_streams as number) ?? 0,
    flags: (raw.flags as number) ?? 0,
    nbChapters: (raw.nb_chapters as number) ?? 0,
    streams,
    chapters: (raw.chapters as ChapterInfo[]) || [],
  };
}

/**
 * 获取视频文件元信息（首次调用时自动 init）
 */
export const getInfo = async (
  input: File | Blob | Uint8Array | ArrayBuffer | URL | string
): Promise<
  { result: "ok"; fileInfo: FileInfo } | { result: "err"; error: string }
> => {
  await init();

  const buffer = await inputToArrayBuffer(input);
  const fileName = input instanceof File ? input.name : "video";

  if (!resolvedUrls) {
    return { result: "err", error: "Worker not initialized" };
  }
  const w = await getWorker(resolvedUrls);
  const result = await sendGetFileInfo(w, fileName, buffer);

  if (result.result === "ok") {
    return {
      result: "ok",
      fileInfo: toFileInfo(result.fileInfo as Record<string, unknown>),
    };
  }
  return { result: "err", error: result.error };
};

export const libavformatVersion = (): string => {
  const v = getCachedVersions();
  if (!v) {
    throw new Error("Module not initialized. Call init() or getInfo() first.");
  }
  return v.avformatVersion;
};

export const libavcodecVersion = (): string => {
  const v = getCachedVersions();
  if (!v) {
    throw new Error("Module not initialized. Call init() or getInfo() first.");
  }
  return v.avcodecVersion;
};

export const libavutilVersion = (): string => {
  const v = getCachedVersions();
  if (!v) {
    throw new Error("Module not initialized. Call init() or getInfo() first.");
  }
  return v.avutilVersion;
};
