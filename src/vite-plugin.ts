/**
 * Vite 插件：自动将 ffprobe-metadata-wasm 的 WASM 资源复制到 public 目录，
 * 使消费者无需手动配置即可在开发和生产环境使用。
 *
 * 使用方式：在 vite.config.ts 中添加
 *   import { ffprobeMetadataWasm } from 'ffprobe-metadata-wasm/vite'
 *   plugins: [ffprobeMetadataWasm()]
 */
import type { Plugin } from "vite";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const WASM_FILES = [
  "ffprobe-metadata-wasm.wasm",
  "ffprobe-metadata-wasm.js",
] as const;

/** 插件运行在 node_modules/ffprobe-metadata-wasm/dist/vite-plugin.js，__dirname 即 dist */
function getWasmSourceDir(): string | null {
  const dir = __dirname;
  return existsSync(join(dir, "ffprobe-metadata-wasm.wasm")) ? dir : null;
}

export function ffprobeMetadataWasm(): Plugin {
  return {
    name: "vite-plugin-ffprobe-metadata-wasm",
    enforce: "pre",
    configResolved(config) {
      const srcDir = getWasmSourceDir();
      if (!srcDir) return;

      // config.publicDir 已由 Vite 解析为绝对路径
      const destDir =
        typeof config.publicDir === "string"
          ? config.publicDir
          : join(process.cwd(), "public");

      for (const name of WASM_FILES) {
        const src = join(srcDir, name);
        if (existsSync(src)) {
          if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
          }
          const dest = join(destDir, name);
          copyFileSync(src, dest);
        }
      }
    },
  };
}
