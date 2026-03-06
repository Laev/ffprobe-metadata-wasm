# ffprobe-metadata-wasm

**English** | [中文](README.md)

> WebAssembly-based video/audio metadata probe library. Worker mode, no SharedArrayBuffer required.

A streamlined fork of [alfg/ffprobe-wasm](https://github.com/alfg/ffprobe-wasm) that keeps only metadata probing, removes SharedArrayBuffer dependency, and improves browser compatibility.

## Features

- **No SharedArrayBuffer** - Uses Worker to load WASM, better compatibility
- **No special HTTP headers** - No Cross-Origin-Embedder-Policy needed
- **Auto init on first call** - `getInfo` loads WASM automatically, no explicit init required
- **Custom WASM URL** - Load from CDN or self-hosted
- **Multiple input types** - File, Blob, Uint8Array, ArrayBuffer, URL
- **TypeScript support** - Full type definitions

## Installation

```bash
npm install ffprobe-metadata-wasm
```

## Usage

### Vite projects (recommended, zero config)

Add the plugin and use directly in dev and production:

```typescript
// vite.config.ts
import { ffprobeMetadataWasm } from 'ffprobe-metadata-wasm/vite';

export default defineConfig({
  plugins: [ffprobeMetadataWasm()],
});
```

```typescript
// Use anywhere without init
import { getInfo } from 'ffprobe-metadata-wasm';

const result = await getInfo(videoFile);
```

### Non-Vite or unbundled scenarios

The package resolves wasm paths via `import.meta.url`. **Note**: After bundling, this often fails and causes 404. If you see init timeout or wasm load failure:

1. **Copy wasm files** to an accessible location (e.g. `public/` or build output)
2. **Call `init({ wasmUrl, wasmJsUrl })`** with explicit URLs

```typescript
import { init, getInfo } from 'ffprobe-metadata-wasm';

// Ensure ffprobe-metadata-wasm.wasm / ffprobe-metadata-wasm.js are deployed, then init
await init({
  wasmUrl: '/ffprobe-metadata-wasm.wasm',   // or CDN, relative path, etc.
  wasmJsUrl: '/ffprobe-metadata-wasm.js',
});

const result = await getInfo(videoFile);

if (result.result === 'ok') {
  const { fileInfo } = result;
  console.log('Format:', fileInfo.name);
  console.log('Duration:', fileInfo.duration / 1_000_000, 'seconds');
  console.log('Resolution:', fileInfo.streams[0].width, 'x', fileInfo.streams[0].height);
  console.log('Frame rate:', fileInfo.streams[0].avgFrameRate, 'fps');
} else {
  console.error('Error:', result.error);
}
```

Wasm files are in `node_modules/ffprobe-metadata-wasm/dist/`.

### Explicit init and custom WASM URL

```typescript
import { init, getInfo } from 'ffprobe-metadata-wasm';

// Custom WASM paths (e.g. from CDN)
await init({
  wasmUrl: 'https://unpkg.com/ffprobe-metadata-wasm@0.1.0/dist/ffprobe-metadata-wasm.wasm',
  wasmJsUrl: 'https://unpkg.com/ffprobe-metadata-wasm@0.1.0/dist/ffprobe-metadata-wasm.js',
});

// init is idempotent, safe to call multiple times
await init(); // no-op

const result = await getInfo(file);
```

### Troubleshooting

| Symptom | Possible cause | Solution |
|---------|----------------|----------|
| Init timeout / WASM 404 | Vite project without plugin | Add `ffprobeMetadataWasm()` to `vite.config.ts` |
| Init timeout / WASM 404 | Non-Vite or wrong path | Use `init({ wasmUrl, wasmJsUrl })` with accessible URLs |
| 404 on subpath deploy | base config mismatch | Plugin uses `import.meta.env.BASE_URL`; ensure Vite `base` is correct |

Timeout errors include the attempted URLs for debugging.

### Version info

```typescript
import { libavformatVersion, libavcodecVersion, libavutilVersion } from 'ffprobe-metadata-wasm';

// Call after getInfo or init
console.log('libavformat:', libavformatVersion());
```

## API

### `init(options?)`

Initialize WASM module (idempotent, safe to call multiple times).

| Parameter | Type | Description |
|-----------|------|--------------|
| `options.wasmUrl` | `string \| URL` | WASM file URL |
| `options.wasmJsUrl` | `string \| URL` | Emscripten JS file URL |

### `getInfo(input)`

Get video/audio metadata. Auto-runs init on first call.

| Parameter | Type | Description |
|-----------|------|--------------|
| `input` | `File \| Blob \| Uint8Array \| ArrayBuffer \| URL \| string` | Input source |

**Returns**: `{ result: 'ok', fileInfo: FileInfo }` | `{ result: 'err', error: string }`

### Type definitions

```typescript
interface FileInfo {
  name: string;        // Format name
  bitRate: number;    // Bit rate (bps)
  duration: number;   // Duration (microseconds)
  nbStreams: number;
  streams: StreamInfo[];
  chapters: ChapterInfo[];
}

interface StreamInfo {
  id: number;
  codecType: number;   // 0=video, 1=audio
  codecName: string;
  width: number;
  height: number;
  avgFrameRate: number;
  channels: number;
  sampleRate: number;
  // ...
}
```

## Development

### Requirements

- Node.js 18+
- Docker (required for a full build, to generate WASM)

### Build WASM (requires Docker)

```bash
yarn build:wasm
```

### Build JS/types artifacts

```bash
yarn build:lib
```

### Build full package

```bash
yarn build
```

### Local preview

```bash
yarn build
yarn dev
```

Visit http://localhost:5173/example/ for the preview page.

### Project structure

```
ffprobe-metadata-wasm/
├── src/
│   ├── index.ts          # Public API
│   ├── function.ts       # Core logic (Worker mode)
│   ├── worker-code.ts    # Worker inline code
│   ├── worker-factory.ts # Worker creation and messaging
│   ├── vite-plugin.ts    # Vite plugin (optional)
│   ├── types.ts
│   └── ffprobe-wasm-wrapper.cpp  # C++ wrapper
├── dist/                 # Build output
│   ├── index.js
│   ├── vite-plugin.js
│   ├── ffprobe-metadata-wasm.js
│   └── ffprobe-metadata-wasm.wasm
├── example/              # Preview page (not published)
├── Dockerfile
├── Makefile
└── .github/workflows/
```

## Browser compatibility

Works in all modern browsers that support Web Workers and WebAssembly:

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## Differences from alfg/ffprobe-wasm

| Feature | ffprobe-metadata-wasm | alfg/ffprobe-wasm |
|---------|------------------------|-------------------|
| SharedArrayBuffer | Not required | Required |
| Special HTTP headers | Not required | Required |
| Features | Metadata only | Metadata + frame extraction |
| Loading | Worker | Main thread / Worker |

## Release

- **Build check**: Runs on push to main/master or on PR
- **npm publish**: Auto-publishes on GitHub Release (requires `NPM_TOKEN`)
- **GitHub Pages**: Auto-deploys preview on push to main/master (enable Pages in repo settings)

## License

MIT

## Links

- [alfg/ffprobe-wasm](https://github.com/alfg/ffprobe-wasm) - Original project
- [FFmpeg](https://ffmpeg.org/) - Multimedia framework
- [Emscripten](https://emscripten.org/) - WebAssembly toolchain
