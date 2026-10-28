// Loaded only when the browser cannot encode WebP itself (notably iOS Safari).
// Both codecs are served from our own versioned assets, never a third-party API.
import encode, { init } from '@jsquash/webp/encode.js';
import regularWasm from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import simdWasm from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';

let ready: Promise<unknown> | undefined;

export async function encodeWebpPixels(pixels: ImageData, quality: number): Promise<Blob> {
  if (!ready) {
    ready = init({ locateFile: (name: string) => name.includes('_simd') ? simdWasm : regularWasm })
      .catch(error => { ready = undefined; throw error; });
  }
  await ready;
  const bytes = await encode(pixels, { quality: Math.round(quality * 100) });
  return new Blob([bytes], { type: 'image/webp' });
}
