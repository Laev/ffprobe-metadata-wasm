import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync, existsSync, mkdirSync } from "fs";

// 确保 dist 目录在 public 中可访问（开发环境）
if (!existsSync("public/dist")) {
  mkdirSync("public", { recursive: true });
  if (existsSync("dist/ffprobe-metadata-wasm.wasm")) {
    mkdirSync("public/dist", { recursive: true });
    copyFileSync(
      "dist/ffprobe-metadata-wasm.wasm",
      "public/dist/ffprobe-metadata-wasm.wasm"
    );
  }
  if (existsSync("dist/ffprobe-metadata-wasm.js")) {
    copyFileSync(
      "dist/ffprobe-metadata-wasm.js",
      "public/dist/ffprobe-metadata-wasm.js"
    );
  }
}

export default defineConfig({
  build: {
    emptyOutDir: false, // 保留 Docker 复制的 WASM 和 tsc 生成的 .d.ts
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "vite-plugin": resolve(__dirname, "src/vite-plugin.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["fs", "path", "url", "node:fs", "node:path", "node:url"],
      output: {
        // 确保 WASM 文件被正确复制
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".wasm")) {
            return "ffprobe-metadata-wasm.wasm";
          }
          return assetInfo.name || "asset";
        },
      },
    },
    // lib 构建不需要复制 public（wasm 已在 dist/ 中），否则会生成 dist/dist/ 重复
    copyPublicDir: false,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  // 开发服务器配置
  server: {
    fs: {
      // 允许访问项目根目录
      allow: [".."],
    },
  },
  // 确保 WASM 文件被正确处理
  assetsInclude: ["**/*.wasm"],
});
