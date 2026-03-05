/**
 * Worker 工厂：创建 Worker、封装 postMessage 通信
 */
import { WORKER_CODE } from "./worker-code";

export interface WorkerUrls {
  jsUrl: string;
  wasmUrl: string;
}

let workerInstance: Worker | null = null;
let workerReady: Promise<Worker> | null = null;
let cachedVersions: {
  avformatVersion: string;
  avcodecVersion: string;
  avutilVersion: string;
} | null = null;

export function getCachedVersions() {
  return cachedVersions;
}

export function setCachedVersions(v: {
  avformatVersion: string;
  avcodecVersion: string;
  avutilVersion: string;
}) {
  cachedVersions = v;
}

/**
 * 创建 Worker 实例（单例，带 URL 注入）
 */
export function createWorker(urls: WorkerUrls): Worker {
  const code = WORKER_CODE.replace("__JS_URL__", urls.jsUrl).replace(
    "__WASM_URL__",
    urls.wasmUrl
  );
  const blob = new Blob([code], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  const w = new Worker(blobUrl);
  URL.revokeObjectURL(blobUrl);
  return w;
}

/**
 * 获取已初始化的 Worker，若未初始化则先创建
 */
export function getWorker(urls: WorkerUrls): Promise<Worker> {
  if (workerInstance && workerReady) {
    return workerReady;
  }

  workerReady = new Promise<Worker>((resolve, reject) => {
    const w = createWorker(urls);
    workerInstance = w;

    const timeoutId = setTimeout(() => {
      w.terminate();
      workerInstance = null;
      workerReady = null;
      reject(
        new Error(
          `FFprobe Worker 初始化超时（30秒）。请检查 WASM 资源是否可访问：\n  - wasm: ${urls.wasmUrl}\n  - js: ${urls.jsUrl}\n若为 404，Vite 项目请添加 ffprobeMetadataWasm() 插件并确保文件已复制到 public/。`
        )
      );
    }, 30000);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "ready") {
        clearTimeout(timeoutId);
        w.removeEventListener("message", onMessage);
        if (e.data.avformatVersion != null) {
          setCachedVersions({
            avformatVersion: e.data.avformatVersion || "",
            avcodecVersion: e.data.avcodecVersion || "",
            avutilVersion: e.data.avutilVersion || "",
          });
        }
        resolve(w);
      }
    };
    w.addEventListener("message", onMessage);
  });

  return workerReady;
}

/**
 * 向 Worker 发送 get_file_info 请求
 */
export function sendGetFileInfo(
  w: Worker,
  fileName: string,
  buffer: ArrayBuffer
): Promise<
  | { result: "ok"; fileInfo: Record<string, unknown> }
  | { result: "err"; error: string }
> {
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      w.removeEventListener("message", handler);
      const data = e.data;
      if (data.result === "ok" && data.fileInfo) {
        resolve({ result: "ok", fileInfo: data.fileInfo });
      } else if (data.result === "err") {
        resolve({ result: "err", error: data.error || "未知错误" });
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "get_file_info", fileName, buffer }, [buffer]);
  });
}
