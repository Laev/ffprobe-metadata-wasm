/**
 * Worker 代码模板（方案 A：内联 Blob）
 * 占位符 __JS_URL__ 和 __WASM_URL__ 在运行时由主线程替换
 */
export const WORKER_CODE = `
const JS_URL = '__JS_URL__';
const WASM_URL = '__WASM_URL__';

self.Module = {
  locateFile: (path) => (path.endsWith('.wasm') ? WASM_URL : path),
  onRuntimeInitialized: () => {},
};

const initPromise = new Promise((resolve) => {
  self.Module.onRuntimeInitialized = resolve;
});

self.importScripts(JS_URL);

initPromise.then(() => {
  const Module = self.Module;
  const FS = Module.FS;
  const filename = '/work_video';

  self.onmessage = async (e) => {
    const { type, fileName, buffer } = e.data;
    if (type !== 'get_file_info' || !buffer) return;

    try {
      FS.writeFile(filename, new Uint8Array(buffer));
      const info = Module.get_file_info(filename);
      FS.unlink(filename);

      const streams = [];
      const s = info.streams;
      const n = Array.isArray(s) ? s.length : (typeof s?.size === 'function' ? s.size() : 0);
      for (let i = 0; i < n; i++) {
        const st = Array.isArray(s) ? s[i] : s.get(i);
        const tags = [];
        const t = st?.tags;
        const tn = Array.isArray(t) ? t.length : (typeof t?.size === 'function' ? t.size() : 0);
        for (let j = 0; j < tn; j++) {
          const tag = Array.isArray(t) ? t[j] : t.get(j);
          tags.push({ key: tag?.key || '', value: tag?.value || '' });
        }
        streams.push({
          id: st?.id ?? 0,
          start_time: st?.start_time ?? 0,
          duration: st?.duration ?? 0,
          codec_type: st?.codec_type ?? 0,
          codec_name: st?.codec_name ?? '',
          format: st?.format ?? '',
          bit_rate: st?.bit_rate ?? 0,
          profile: st?.profile ?? '',
          level: st?.level ?? 0,
          width: st?.width ?? 0,
          height: st?.height ?? 0,
          channels: st?.channels ?? 0,
          sample_rate: st?.sample_rate ?? 0,
          frame_size: st?.frame_size ?? 0,
          avg_frame_rate: st?.avg_frame_rate ?? 0,
          tags,
        });
      }

      const chapters = [];
      const c = info.chapters;
      const cn = Array.isArray(c) ? c.length : (typeof c?.size === 'function' ? c.size() : 0);
      for (let i = 0; i < cn; i++) {
        const ch = Array.isArray(c) ? c[i] : c.get(i);
        const tags = [];
        const t = ch?.tags;
        const tn = Array.isArray(t) ? t.length : (typeof t?.size === 'function' ? t.size() : 0);
        for (let j = 0; j < tn; j++) {
          const tag = Array.isArray(t) ? t[j] : t.get(j);
          tags.push({ key: tag?.key || '', value: tag?.value || '' });
        }
        chapters.push({
          id: ch?.id ?? 0,
          time_base: ch?.time_base ?? '',
          start: ch?.start ?? 0,
          end: ch?.end ?? 0,
          tags,
        });
      }

      self.postMessage({
        result: 'ok',
        fileInfo: {
          name: info.name ?? '',
          bit_rate: info.bit_rate ?? 0,
          duration: info.duration ?? 0,
          url: info.url ?? '',
          nb_streams: info.nb_streams ?? 0,
          flags: info.flags ?? 0,
          nb_chapters: info.nb_chapters ?? 0,
          streams,
          chapters,
        },
      });
    } catch (err) {
      try {
        FS.unlink(filename);
      } catch (_) {}
      self.postMessage({
        result: 'err',
        error: err?.message || String(err),
      });
    }
  };

  self.postMessage({
    type: 'ready',
    avformatVersion: typeof Module.avformat_version === 'function' ? Module.avformat_version() : '',
    avcodecVersion: typeof Module.avcodec_version === 'function' ? Module.avcodec_version() : '',
    avutilVersion: typeof Module.avutil_version === 'function' ? Module.avutil_version() : '',
  });
});
`;
