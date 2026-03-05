import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync, existsSync, mkdirSync } from "fs";

// 确保 dist 目录在 public 中可访问（开发环境）
if (!existsSync("public/dist")) {
  mkdirSync("public", { recursive: true });
  if (existsSync("dist/ffprobe-wasm.wasm")) {
    mkdirSync("public/dist", { recursive: true });
    copyFileSync("dist/ffprobe-wasm.wasm", "public/dist/ffprobe-wasm.wasm");
  }
  if (existsSync("dist/ffprobe-wasm.js")) {
    copyFileSync("dist/ffprobe-wasm.js", "public/dist/ffprobe-wasm.js");
  }
}

export default defineConfig({
  build: {
    emptyOutDir: false, // 保留 Docker 复制的 WASM 和 tsc 生成的 .d.ts
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "FFprobeWasm",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: [],
      output: {
        // 确保 WASM 文件被正确复制
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".wasm")) {
            return "ffprobe-wasm.wasm";
          }
          return assetInfo.name || "asset";
        },
      },
    },
    copyPublicDir: true,
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
