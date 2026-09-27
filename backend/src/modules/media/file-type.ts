/**
 * Minimal magic-byte file type detection for the upload allowlist.
 * Pure (no I/O) so it can be unit-tested directly.
 */
export interface DetectedFileType {
  ext: 'jpg' | 'png' | 'webp' | 'gif' | 'pdf';
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'application/pdf';
}

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

function ascii(s: string): number[] {
  return Array.from(s, (c) => c.charCodeAt(0));
}

/** Returns the detected allowlisted type, or null for anything else (SVG, HTML, JS, ...). */
export function detectFileType(buf: Buffer): DetectedFileType | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { ext: 'jpg', mime: 'image/jpeg' };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: 'png', mime: 'image/png' };
  if (startsWith(buf, ascii('GIF87a')) || startsWith(buf, ascii('GIF89a'))) return { ext: 'gif', mime: 'image/gif' };
  if (startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WEBP'), 8)) return { ext: 'webp', mime: 'image/webp' };
  if (startsWith(buf, ascii('%PDF-'))) return { ext: 'pdf', mime: 'application/pdf' };
  return null;
}

/** Extensions served inline as images from /uploads; everything else is forced to download. */
export const INLINE_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
