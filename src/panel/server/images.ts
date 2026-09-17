import { existsSync } from 'node:fs';
import { IMAGE_DIR, MAX_IMAGE_BYTES, deriveSafeImageFilename, resolveImageWriteTarget } from './paths';

/** One dropped image, as sent by the client. `beforeSrc` is the `<img src>`
    value the panel loaded — the stale check for the HTML patch that repoints
    it. `data` is base64. */
export interface ImageUpload {
  /** Which HTML file's frame this belongs to. */
  path: string;
  /** The frame's data-label. */
  label: string;
  /** The original filename, before it is turned into something safe to write. */
  fileName: string;
  data: string;
  beforeSrc: string;
}

export interface ResolvedImageWrite {
  label: string;
  absPath: string;
  buffer: Buffer;
  /** Root-relative src to patch into the HTML, e.g. "/assets/img/photo.webp" —
      matches how every existing <img src> in this site's HTML is written. */
  src: string;
}

/**
 * The next name in assets/img/ that is free, trying `candidate` first and
 * then `<stem>-2<ext>`, `<stem>-3<ext>`, … An existing file is never
 * overwritten — these are generated art the owner paid for.
 *
 * `reserved` threads name choices across every image in the SAME save
 * request: `existsSync` alone only sees what is already on disk, which
 * would let two images dropped in one batch both resolve to the same
 * not-yet-written name.
 */
function pickAvailableFilename(candidate: string, reserved: Set<string>): string {
  const dot = candidate.lastIndexOf('.');
  const stem = candidate.slice(0, dot);
  const ext = candidate.slice(dot); // includes the leading dot
  let name = candidate;
  let n = 2;
  while (reserved.has(name) || existsSync(resolveImageWriteTarget(name))) {
    name = `${stem}-${n}${ext}`;
    n += 1;
  }
  reserved.add(name);
  return name;
}

/**
 * Validate and resolve one dropped image into a ready-to-write buffer plus
 * the src it should patch into the HTML. Throws — without writing anything —
 * on an oversized payload or a rejected filename, so the caller can resolve
 * every image in a batch before writing any of them, the same discipline
 * the HTML patcher applies to text patches.
 */
export function resolveImageUpload(upload: ImageUpload, reserved: Set<string>): ResolvedImageWrite {
  const buffer = Buffer.from(upload.data, 'base64');
  if (buffer.length === 0) {
    throw new Error(`Refusing to save "${upload.fileName}": it decoded to 0 bytes`);
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `Refusing to save "${upload.fileName}": ${buffer.length} bytes is over the ${MAX_IMAGE_BYTES}-byte per-image cap`,
    );
  }
  const safeName = deriveSafeImageFilename(upload.fileName);
  const finalName = pickAvailableFilename(safeName, reserved);
  return {
    label: upload.label,
    absPath: resolveImageWriteTarget(finalName),
    buffer,
    src: `/${IMAGE_DIR}/${finalName}`,
  };
}
