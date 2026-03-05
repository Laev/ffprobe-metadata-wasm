# ffprobe-metadata-wasm

[English](README.en.md) | **中文**

> 基于 WebAssembly 的视频/音频元信息预检测库，Worker 模式，无需 SharedArrayBuffer

基于 [alfg/ffprobe-wasm](https://github.com/alfg/ffprobe-wasm) 精简，仅保留元信息探测能力，移除 SharedArrayBuffer 依赖，提升浏览器兼容性。

## 特性

- **无需 SharedArrayBuffer** - 使用 Worker 加载 WASM，兼容性更好
- **无需特殊 HTTP 头** - 不需要 Cross-Origin-Embedder-Policy
- **首次调用自动 init** - `getInfo` 首次调用时自动加载 WASM，无需显式初始化
- **支持自定义 WASM URL** - 可从 CDN 或自托管加载
- **支持多种输入** - File, Blob, Uint8Array, ArrayBuffer, URL
- **TypeScript 支持** - 完整类型定义

## 安装

```bash
npm install ffprobe-metadata-wasm
```

## 使用

### 基础用法

```typescript
import { getInfo } from 'ffprobe-metadata-wasm';

// 首次调用自动加载 WASM，无需显式 init
const result = await getInfo(videoFile);

if (result.result === 'ok') {
  const { fileInfo } = result;
  console.log('格式:', fileInfo.name);
  console.log('时长:', fileInfo.duration / 1_000_000, '秒');
  console.log('分辨率:', fileInfo.streams[0].width, 'x', fileInfo.streams[0].height);
  console.log('帧率:', fileInfo.streams[0].avgFrameRate, 'fps');
} else {
  console.error('错误:', result.error);
}
```

### 显式初始化与自定义 WASM URL

```typescript
import { init, getInfo } from 'ffprobe-metadata-wasm';

// 自定义 WASM 资源路径（如从 CDN 加载）
await init({
  wasmUrl: 'https://unpkg.com/ffprobe-metadata-wasm@0.1.0/dist/ffprobe-wasm.wasm',
  wasmJsUrl: 'https://unpkg.com/ffprobe-metadata-wasm@0.1.0/dist/ffprobe-wasm.js',
});

// init 幂等，可多次调用
await init(); // 无操作

const result = await getInfo(file);
```

### 版本信息

```typescript
import { libavformatVersion, libavcodecVersion, libavutilVersion } from 'ffprobe-metadata-wasm';

// 需在 getInfo 或 init 之后调用
console.log('libavformat:', libavformatVersion());
```

## API

### `init(options?)`

初始化 WASM 模块（幂等，可多次调用）。

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.wasmUrl` | `string \| URL` | WASM 文件 URL |
| `options.wasmJsUrl` | `string \| URL` | Emscripten JS 文件 URL |

### `getInfo(input)`

获取视频/音频文件元信息。首次调用时自动执行 init。

| 参数 | 类型 | 说明 |
|------|------|------|
| `input` | `File \| Blob \| Uint8Array \| ArrayBuffer \| URL \| string` | 输入源 |

**返回**: `{ result: 'ok', fileInfo: FileInfo }` | `{ result: 'err', error: string }`

### 类型定义

```typescript
interface FileInfo {
  name: string;        // 格式名称
  bitRate: number;    // 比特率 (bps)
  duration: number;   // 时长 (微秒)
  nbStreams: number;
  streams: StreamInfo[];
  chapters: ChapterInfo[];
}

interface StreamInfo {
  id: number;
  codecType: number;   // 0=视频, 1=音频
  codecName: string;
  width: number;
  height: number;
  avgFrameRate: number;
  channels: number;
  sampleRate: number;
  // ...
}
```

## 开发

### 环境要求

- Node.js 18+
- Docker（可选，用于构建 WASM）

### 构建 WASM（需 Docker）

```bash
yarn build:wasm
```

### 构建包

```bash
yarn build
```

### 本地预览

```bash
yarn build:wasm  # 首次需构建 WASM
yarn build
yarn dev
```

访问 http://localhost:5173/example/ 查看预览页。

### 项目结构

```
ffprobe-metadata-wasm/
├── src/
│   ├── index.ts          # 对外 API
│   ├── function.ts       # 核心逻辑（Worker 模式）
│   ├── worker-code.ts    # Worker 内联代码
│   ├── worker-factory.ts # Worker 创建与通信
│   ├── types.ts
│   └── ffprobe-wasm-wrapper.cpp  # C++ 封装
├── dist/                 # 构建输出
│   ├── index.js
│   ├── ffprobe-wasm.js
│   └── ffprobe-wasm.wasm
├── example/              # 预览页（不随包发布）
├── Dockerfile
├── Makefile
└── .github/workflows/
```

## 浏览器兼容性

支持所有支持 Web Worker 和 WebAssembly 的现代浏览器：

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## 与 alfg/ffprobe-wasm 的区别

| 项目 | ffprobe-metadata-wasm | alfg/ffprobe-wasm |
|------|------------------------|-------------------|
| SharedArrayBuffer | 不需要 | 需要 |
| 特殊 HTTP 头 | 不需要 | 需要 |
| 功能 | 仅元信息探测 | 元信息 + 帧提取 |
| 加载方式 | Worker | 主线程 / Worker |

## 发布

- **构建验证**：push 到 main/master 或 PR 时自动运行
- **npm 发布**：创建 GitHub Release 时自动发布（需配置 `NPM_TOKEN`）
- **GitHub Pages**：push 到 main/master 时自动部署预览页（需在仓库设置中启用 Pages）

## 许可证

MIT

## 相关链接

- [alfg/ffprobe-wasm](https://github.com/alfg/ffprobe-wasm) - 原始项目
- [FFmpeg](https://ffmpeg.org/) - 多媒体框架
- [Emscripten](https://emscripten.org/) - WebAssembly 工具链
