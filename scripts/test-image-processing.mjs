// Browser capability simulations only; upload fetches are intercepted.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import regularEncoder from '@jsquash/webp/codec/enc/webp_enc.js';
import { defaultOptions } from '@jsquash/webp/meta.js';
import sharp from 'sharp';

const compiled = await build({ entryPoints: ['client/src/lib/image-utils.ts'], bundle: true, write: false,
  format: 'cjs', platform: 'browser', define: { 'import.meta.env.VITE_API_BASE_URL': '""' },
  plugins: [{ name: 'fake-fallback', setup(build) {
    build.onResolve({ filter: /webp-encoder$/ }, () => ({ path: 'webp-encoder', namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const encodeWebpPixels=(...args)=>globalThis.fallback(...args);' }));
  } }],
});
const bytes = new TextEncoder().encode('RIFF1234WEBPfixture');
const webp = () => new Blob([bytes], { type: 'image/webp' });
function browser(mode = 'native', dimensions = [2400, 4800]) {
  const canvases = [];
  let created = 0, revoked = 0, fallbackCalls = 0, uploaded = 0;
  const module = { exports: {} };
  const context = { module, exports: module.exports, Blob, File, FormData, Uint8Array, console,
    URL: { createObjectURL: () => { created++; return 'blob:local-fixture'; }, revokeObjectURL: () => revoked++ },
    Image: class {
      naturalWidth = dimensions[0]; naturalHeight = dimensions[1];
      set src(value) { queueMicrotask(() => mode === 'decode-error' ? this.onerror?.() : this.onload?.()); }
    },
    document: { createElement(name) {
      assert.equal(name, 'canvas');
      const canvas = { width: 0, height: 0,
        getContext: () => mode === 'no-context' ? null : {
          drawImage() { if (mode === 'draw-error') throw new Error('Allocation failed'); },
          getImageData: () => ({ width: canvas.width, height: canvas.height, data: new Uint8ClampedArray(4) }),
        },
        toBlob(callback, type) {
          assert.equal(type, 'image/webp');
          if (mode === 'throw') throw new Error('Unsupported encoder');
          queueMicrotask(() => callback(mode === 'native' ? webp() : mode === 'null' ? null : new Blob(['PNG'], { type: 'image/png' })));
        } };
      canvases.push(canvas);
      return canvas;
    } },
    fallback(pixels, quality) {
      fallbackCalls++;
      assert.equal(pixels.width, 600); assert.equal(pixels.height, 1200); assert.equal(quality, 0.8);
      if (mode === 'fallback-error') throw new Error('WASM unavailable');
      return webp();
    },
    async fetch(url, options) {
      uploaded++;
      assert.equal(url, '/api/media');
      assert.equal(options.credentials, 'include');
      assert(options.body.get('file') instanceof File);
      return new Response(JSON.stringify({ url: '/uploads/media/local.webp' }), { headers: { 'Content-Type': 'application/json' } });
    },
  };
  runInNewContext(compiled.outputFiles[0].text, context);
  return { ...module.exports, canvases, stats: () => ({ created, revoked, fallbackCalls, uploaded }) };
}
const source = new File(['photo fixture'], 'photo.PNG', { type: 'image/png' });
for (const mode of ['native', 'png', 'null', 'throw']) {
  const app = browser(mode);
  const file = await app.compressImage(source, 1200);
  assert.equal(file.type, 'image/webp'); assert.equal(file.name, 'photo.webp');
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
  assert.equal(app.stats().fallbackCalls, mode === 'native' ? 0 : 1);
  assert.equal(app.stats().created, app.stats().revoked);
  assert(app.canvases.every(c => c.width === 0 && c.height === 0), 'release canvas memory');
  assert.deepEqual(await app.uploadMedia(file, { optimized: true }), { url: '/uploads/media/local.webp' });
  assert.equal(app.stats().created, 1, 'optimized uploads must not decode/encode again');
}
for (const mode of ['decode-error', 'no-context', 'draw-error', 'fallback-error']) {
  const app = browser(mode);
  await assert.rejects(app.compressImage(source, 1200), /зураг|Зург|Зураг|Зургийг/);
  assert.equal(app.stats().created, app.stats().revoked);
  assert(app.canvases.every(c => c.width === 0 && c.height === 0));
}
let app = browser('native', [100, 100]);
const optimized = new File([bytes], 'existing.webp', { type: 'image/webp' });
assert.equal(await app.compressImage(optimized, 1200), optimized);
assert.equal(app.canvases.length, 0);
app = browser();
await assert.rejects(app.compressImage(new File(['text'], 'readme.txt', { type: 'text/plain' })), /зургийн файл/);
await assert.rejects(app.uploadMedia(new File(['not WebP'], 'fake.webp', { type: 'image/webp' }), { optimized: true }), /WebP/);
assert.equal(app.stats().uploaded, 0, 'invalid optimized files cannot bypass the upload guard');
console.log('PASS: native WebP, Safari PNG fallback, null/throw encoding, portrait bounds, actual WebP signature, optimized upload reuse, decode/draw/codec errors and object URL/canvas cleanup. No real image uploaded.');

// Older devices without WASM SIMD must still generate a decodable image.
const codec = await regularEncoder({ wasmBinary: await readFile('node_modules/@jsquash/webp/codec/enc/webp_enc.wasm'), noInitialRun: true });
const encoded = codec.encode(new Uint8Array(32 * 48 * 4).fill(200), 32, 48, { ...defaultOptions, quality: 80 });
assert(encoded);
const metadata = await sharp(encoded).metadata();
assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 32); assert.equal(metadata.height, 48);
console.log('PASS: real non-SIMD WebAssembly encoder produces a decodable WebP without a browser/native WebP codec');
