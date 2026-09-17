import { resolve, sep } from 'node:path';

/**
 * The only files the panel may ever write.
 *
 * An allowlist rather than a traversal check: a traversal check has to be
 * right about every trick, an allowlist has to be right once.
 */
const ALLOWED = new Set([
  'src/styles/layout.generated.css',
  'index.html',
  'projects.html',
  'music.html',
  'workshop.html',
  'projects/cache-it.html',
]);

/** Absolute path for an allowed target, or throw. Never returns for anything else. */
export function resolveWriteTarget(rel: string): string {
  const normalised = rel.split(/[\\/]/).join('/');
  if (!ALLOWED.has(normalised)) {
    throw new Error(`Refusing to write: "${rel}" is not an allowed panel target`);
  }
  return resolve(process.cwd(), ...normalised.split('/')).split('/').join(sep);
}

/**
 * The one directory (never a subdirectory of it) a dropped image may be
 * written into.
 */
export const IMAGE_DIR = 'assets/img';

/**
 * Cap on a single image's DECODED byte size. 10 MiB is generous for an
 * unedited phone photo (the actual use case — "judge a test photo before
 * generating") or a hand-exported hero PNG, while still bounding how much a
 * single dropped file can grow the request and the repo. This project's own
 * generated images (assets/img/*.webp) are all under 300 KB; a phone photo
 * is the outlier this number is sized for. Enforced here on the server —
 * see plugin.ts's MAX_BODY_BYTES doc comment for the request-wide cap this
 * composes with. imageEditing.ts applies the same number in the browser
 * too, purely as a courtesy so the pending count never promises a save the
 * server will refuse; the number here is the one that actually matters.
 */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Extensions the panel will ever write into assets/img/, matched against an
 * already-lowercased candidate. A dropped file with any other extension is
 * rejected outright (see deriveSafeImageFilename) rather than re-encoded or
 * retyped — silently relabelling someone's .heic as .png would misrepresent
 * what the file actually is.
 */
const ALLOWED_IMAGE_EXTENSIONS = new Set(['webp', 'png', 'jpg', 'jpeg', 'avif']);

/**
 * Windows device names that are reserved regardless of extension — `con.png`
 * still opens the CON device, not a file called `con.png`. Checked against
 * the name with its extension stripped, case-insensitively; every candidate
 * this module ever produces is already lowercase, so a plain Set lookup is
 * enough.
 */
const RESERVED_DEVICE_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Strict filename allowlist for anything written into assets/img/:
 * lowercase letters, digits and hyphens, exactly one dot, and an extension
 * from ALLOWED_IMAGE_EXTENSIONS. Nothing here is sanitised into shape — a
 * name that fails this is rejected outright, never coerced, on the same
 * theory this file already opens with: an allowlist only has to be right
 * once.
 *
 * The character class alone is what rules out a path separator (`/` or `\`
 * are not in it), `..` (only one literal dot is permitted at all, so two
 * adjacent dots can never appear), a leading dot (the name must START with
 * an ASCII letter or digit), a trailing dot or space (the name must END with
 * one of the fixed extension strings — nothing, including a dot or space,
 * can follow it), a NUL byte, and a colon (a Windows alternate-data-stream
 * separator) — none of those characters appear in `[a-z0-9-]` or in the
 * extension alternation. RESERVED_DEVICE_NAMES catches the one thing the
 * pattern can't: `con.png` matches this pattern fine but is a real device
 * name on Windows regardless of what extension follows it.
 */
const IMAGE_FILENAME_RE = /^[a-z0-9][a-z0-9-]*\.(webp|png|jpe?g|avif)$/;

export function isValidImageFilename(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0 || name.length > 200) return false;
  if (!IMAGE_FILENAME_RE.test(name)) return false;
  const base = name.slice(0, name.lastIndexOf('.'));
  return !RESERVED_DEVICE_NAMES.has(base);
}

/**
 * Absolute path for a filename inside assets/img/, or throw. Mirrors
 * resolveWriteTarget's contract exactly, for a directory instead of a fixed
 * file: validate first, resolve second, never return for anything that
 * fails validation.
 */
export function resolveImageWriteTarget(filename: string): string {
  if (!isValidImageFilename(filename)) {
    throw new Error(`Refusing to write: "${filename}" is not a safe image filename`);
  }
  const dir = resolve(process.cwd(), 'assets', 'img');
  const abs = resolve(dir, filename);
  // Defense in depth, matching the allowlist's own stated philosophy: even
  // though the pattern above should already make this unreachable, confirm
  // the resolved path is actually a direct child of assets/img/ before ever
  // handing it back to a caller that will write to it.
  if (resolve(abs, '..') !== dir) {
    throw new Error(`Refusing to write: "${filename}" escapes ${IMAGE_DIR}`);
  }
  return abs;
}

/**
 * Turn an arbitrary, untrusted original filename into a safe candidate for
 * assets/img/ — lowercased, slugified, single-dotted. Throws if the
 * ORIGINAL extension is not one this panel will ever write: that is a real
 * rejection, not something to coerce into shape (see ALLOWED_IMAGE_EXTENSIONS's
 * doc comment).
 *
 * The result is collision-free against nothing by itself — pickAvailableFilename
 * (images.ts) is what guarantees an existing file is never overwritten.
 */
export function deriveSafeImageFilename(original: string): string {
  const dot = original.lastIndexOf('.');
  const ext = dot >= 0 ? original.slice(dot + 1).toLowerCase() : '';
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error(`Refusing to save "${original}": ".${ext || '(no extension)'}" is not one of webp/png/jpg/jpeg/avif`);
  }
  const stem = dot >= 0 ? original.slice(0, dot) : original;
  const slug =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'image';
  return `${slug}.${ext}`;
}
