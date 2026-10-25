import { HTTPException } from 'hono/http-exception';

/** Persist URLs only. Inline images must pass through the file upload endpoint. */
export function containsInlineImage(value: unknown): boolean {
  if (typeof value === 'string') return /data\s*:\s*image\//i.test(value);
  if (Array.isArray(value)) return value.some(containsInlineImage);
  if (value && typeof value === 'object') return Object.values(value).some(containsInlineImage);
  return false;
}

export async function validateImageFile(file: File): Promise<void> {
  if (!file.size || file.size > 5 * 1024 * 1024) {
    throw new HTTPException(413, { message: 'Image must be between 1 byte and 5 MB' });
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signature = new TextDecoder('ascii').decode(bytes);
  if (file.type !== 'image/webp' || !signature.startsWith('RIFF') || signature.slice(8, 12) !== 'WEBP') {
    throw new HTTPException(415, { message: 'Upload an optimized WebP image file' });
  }
}
