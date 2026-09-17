import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { resolveWriteTarget } from './paths';
import { patchHtml, patchImageSrc, isStaleTextError, type TextPatch, type ImageSrcPatch } from './htmlPatcher';
import { resolveImageUpload, type ImageUpload, type ResolvedImageWrite } from './images';

interface SaveFile {
  path: string;
  contents: string;
}

interface SavePayload {
  files: SaveFile[];
  patches?: Array<{ path: string } & TextPatch>;
  images?: ImageUpload[];
}

/**
 * Hard cap on the request body. HTML/CSS text alone was comfortable at 2
 * MiB; a dropped image needs far more, so this now composes with
 * MAX_IMAGE_BYTES (paths.ts) rather than replacing it: base64 inflates raw
 * bytes by ~4/3, and more than one frame's image can be pending in a single
 * Save (e.g. a hero's three parallax layers all replaced before saving
 * once), so 32 MiB gives headroom for a couple of near-cap images plus the
 * usual text payload without being large enough to let the dev server's
 * memory grow unbounded.
 */
export const MAX_BODY_BYTES = 32 * 1024 * 1024;

/** A stalled or malicious client should not hold the handler open forever. */
const REQUEST_TIMEOUT_MS = 10_000;

function isSaveFile(value: unknown): value is SaveFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SaveFile).path === 'string' &&
    typeof (value as SaveFile).contents === 'string'
  );
}

function isTextPatchEntry(value: unknown): value is { path: string } & TextPatch {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { path: unknown }).path === 'string' &&
    typeof (value as { id: unknown }).id === 'string' &&
    typeof (value as { before: unknown }).before === 'string' &&
    typeof (value as { after: unknown }).after === 'string'
  );
}

function isImageUploadEntry(value: unknown): value is ImageUpload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ImageUpload).path === 'string' &&
    typeof (value as ImageUpload).label === 'string' &&
    typeof (value as ImageUpload).fileName === 'string' &&
    typeof (value as ImageUpload).data === 'string' &&
    typeof (value as ImageUpload).beforeSrc === 'string'
  );
}

/**
 * A same-origin gate for the CSRF case the Content-Type check alone doesn't
 * cover. `Origin` is a header page script cannot set on a real cross-origin
 * request, so — unlike the JSON body — it can be trusted. `Host` is set by
 * the browser/networking stack from the actual connection target, also not
 * by page script; comparing against it (rather than a hardcoded port) means
 * this keeps working whichever port the dev server is pinned to. No
 * `Origin` header at all (curl, and some browsers omit it for same-origin
 * requests) is treated as same-origin: the header's whole purpose is
 * flagging cross-origin requests, so its absence is not a signal of one.
 *
 * `[::1]` is here because it is a real way to reach the dev server —
 * it is in Vite's own default host list, and browsing the site at
 * `http://[::1]:5174` otherwise sent an Origin this gate rejected, failing
 * every Save with "Origin not allowed".
 */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

function isAllowedOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  if (!host) return false;
  // Only a trailing `:<digits>` is a port — an IPv6 host is bracketed
  // (`[::1]:5174`), so the colons inside the address never match here.
  const port = /:(\d+)$/.exec(host)?.[1];
  const suffix = port ? `:${port}` : '';
  return LOOPBACK_HOSTS.some((h) => origin === `http://${h}${suffix}`);
}

/**
 * The `/__panel/save` request handler, extracted from `configureServer` so it
 * can be exercised directly against plain req/res doubles in tests, without
 * booting Vite or touching the real filesystem.
 */
export function handleSaveRequest(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('{"ok":false,"error":"POST only"}');
    req.resume(); // drain so the socket isn't left stalled with an unread body
    return;
  }

  // A cross-site page can trigger a same-origin, credential-free POST as a
  // CORS "simple request" only when its Content-Type is on a small safelist
  // that excludes application/json. Requiring it here means a cross-origin
  // attempt needs a preflight — and since this endpoint sends no
  // Access-Control-Allow-Origin, the browser refuses to follow up with the
  // real request.
  const contentType = req.headers['content-type'] ?? '';
  if (!/^application\/json/i.test(contentType)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Content-Type must be application/json' }));
    req.resume();
    return;
  }

  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) {
    res.statusCode = 403;
    res.end(JSON.stringify({ ok: false, error: 'Origin not allowed' }));
    req.resume();
    return;
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  let settled = false;

  const bail = (status: number, error: string): void => {
    if (settled) return;
    settled = true;
    res.statusCode = status;
    res.end(JSON.stringify({ ok: false, error }));
    req.destroy();
  };

  req.setTimeout(REQUEST_TIMEOUT_MS, () => bail(408, 'Request timed out'));
  req.on('error', () => bail(400, 'Request error'));

  req.on('data', (chunk: Buffer) => {
    if (settled) return;
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_BODY_BYTES) {
      bail(413, 'Request body too large');
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (settled) return;
    settled = true;

    // Buffer.concat first, decode once: chunk boundaries fall at the socket's
    // highWaterMark and can split a multi-byte UTF-8 character mid-sequence.
    // Decoding chunk-by-chunk (the previous `body += chunk`) turns a
    // straddling character into replacement characters.
    let payload: unknown;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      return;
    }

    let targets: Array<{ abs: string; contents: string }>;
    // Declared outside the try so the write loop below (and, on success, the
    // response) can see what images were resolved without re-doing the work.
    const resolvedImages: ResolvedImageWrite[] = [];
    // Declared outside the try so the failure response can report which text
    // edits conflicted. The client offers to discard exactly these, which is
    // the only way out of a stale-file wedge: reloading restores the same
    // stale edit from localStorage and 400s again forever.
    const stale: Array<{ path: string; id: string }> = [];
    const staleMessages: string[] = [];
    try {
      if (typeof payload !== 'object' || payload === null || !Array.isArray((payload as SavePayload).files)) {
        throw new Error('Payload must be { files: Array<{ path: string; contents: string }> }');
      }
      // Validate every entry in the same pass as resolving it, before any
      // I/O: a malformed entry anywhere in the array aborts the whole
      // request, same as an entry naming a disallowed path.
      targets = (payload as SavePayload).files.map((f: unknown) => {
        if (!isSaveFile(f)) {
          throw new Error('Each file entry needs a string "path" and a string "contents"');
        }
        return { abs: resolveWriteTarget(f.path), contents: f.contents };
      });

      const rawPatches = (payload as SavePayload).patches;
      if (rawPatches !== undefined && !Array.isArray(rawPatches)) {
        throw new Error('"patches" must be an array when present');
      }
      // A path already covered by a whole-file write in `files` must not also
      // be a patch target: the patch reads its "current" contents from disk,
      // not from the pending `files` entry, so whichever of the two lands
      // last in `targets` would silently discard the other's write.
      const fileAbsPaths = new Set(targets.map((t) => t.abs));
      // Group patches per file, apply them all in memory, and let any
      // failure throw before a single write happens.
      const patched = new Map<string, string>();
      for (const p of rawPatches ?? []) {
        if (!isTextPatchEntry(p)) {
          throw new Error('Each patch entry needs string "path", "id", "before" and "after"');
        }
        const abs = resolveWriteTarget(p.path);
        if (fileAbsPaths.has(abs)) {
          throw new Error(
            `Refusing to save: "${p.path}" is targeted by both a whole-file write and a text patch in the same request`,
          );
        }
        const current = patched.get(abs) ?? readFileSync(abs, 'utf8');
        try {
          patched.set(abs, patchHtml(current, [{ id: p.id, before: p.before, after: p.after }]));
        } catch (patchErr) {
          // A stale patch is recorded and the batch keeps validating, so one
          // discard round clears every conflict at once. Any other failure is
          // a shape or structure problem and still aborts immediately.
          if (!isStaleTextError(patchErr)) throw patchErr;
          for (const id of patchErr.staleIds) stale.push({ path: p.path, id });
          staleMessages.push(patchErr.message);
        }
      }
      if (stale.length > 0) throw new Error(staleMessages.join('\n\n'));

      // Images: each is validated and resolved — byte cap, filename
      // derivation, collision-free naming — BEFORE anything is written,
      // same discipline as the text/CSS validation above. A stale src (the
      // on-disk value not matching what the panel loaded) throws immediately
      // and aborts the whole request. Unlike a stale TEXT edit there is no
      // discard-and-keep-going recovery offered here: re-dropping a file
      // costs nothing, so "reload, then drop it again" is the whole fix, not
      // a UI worth building. Checked after the text-stale throw above so
      // that failure — which DOES have a recovery path — is what surfaces
      // first if a request somehow manages to hit both at once.
      const rawImages = (payload as SavePayload).images;
      if (rawImages !== undefined && !Array.isArray(rawImages)) {
        throw new Error('"images" must be an array when present');
      }
      const reservedImageNames = new Set<string>();
      const srcPatchesByFile = new Map<string, ImageSrcPatch[]>();
      for (const raw of rawImages ?? []) {
        if (!isImageUploadEntry(raw)) {
          throw new Error('Each image entry needs string "path", "label", "fileName", "data" and "beforeSrc"');
        }
        const absHtml = resolveWriteTarget(raw.path);
        if (fileAbsPaths.has(absHtml)) {
          throw new Error(
            `Refusing to save: "${raw.path}" is targeted by both a whole-file write and a dropped image in the same request`,
          );
        }
        const resolved = resolveImageUpload(raw, reservedImageNames);
        resolvedImages.push(resolved);
        const list = srcPatchesByFile.get(absHtml) ?? [];
        list.push({ label: raw.label, before: raw.beforeSrc, after: resolved.src });
        srcPatchesByFile.set(absHtml, list);
      }
      // Applied on top of `patched` (not straight from disk) so a request
      // that both text-edits and drops an image on the SAME page gets both
      // transformations in the one file this writes — see verification (g).
      for (const [absHtml, srcPatches] of srcPatchesByFile) {
        const current = patched.get(absHtml) ?? readFileSync(absHtml, 'utf8');
        patched.set(absHtml, patchImageSrc(current, srcPatches));
      }

      for (const [abs, contents] of patched) targets.push({ abs, contents });
    } catch (err) {
      // Safe to return verbatim: this message names only the caller's own
      // input (the rejected path, or a shape complaint) — never a
      // server-side filesystem detail.
      res.statusCode = 400;
      res.end(
        JSON.stringify(
          stale.length > 0
            ? { ok: false, error: (err as Error).message, stale }
            : { ok: false, error: (err as Error).message },
        ),
      );
      return;
    }

    // Snapshot for rollback: a failed write mid-batch restores the rest.
    // `null` means the target did not exist before this request.
    const before = targets.map((t) => {
      try { return readFileSync(t.abs, 'utf8'); } catch { return null; }
    });

    let written = 0;
    let writtenImages = 0;
    try {
      for (const t of targets) {
        writeFileSync(t.abs, t.contents, 'utf8');
        written += 1;
      }
      for (const img of resolvedImages) {
        writeFileSync(img.absPath, img.buffer);
        writtenImages += 1;
      }
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          written,
          images: resolvedImages.map((r) => ({ label: r.label, src: r.src })),
        }),
      );
    } catch (writeErr) {
      // Only undo the targets actually written (indices before `written`);
      // anything after that point was never touched. A target that did not
      // exist before the batch is deleted, not left behind as a stale
      // artifact — that's exactly what "rolled back" must mean.
      for (let i = 0; i < written; i += 1) {
        try {
          if (before[i] === null) {
            unlinkSync(targets[i].abs);
          } else {
            writeFileSync(targets[i].abs, before[i] as string, 'utf8');
          }
        } catch (restoreErr) {
          // One restore failing must not stop the others from being tried.
          console.error('[panel] failed to roll back a write:', restoreErr);
        }
      }
      // Images are always brand-new files — pickAvailableFilename (images.ts)
      // never reuses an existing name — so "roll back" is simply "delete
      // it": there is no prior content to restore.
      for (let i = 0; i < writtenImages; i += 1) {
        try {
          unlinkSync(resolvedImages[i].absPath);
        } catch (restoreErr) {
          console.error('[panel] failed to roll back an image write:', restoreErr);
        }
      }
      // Never echo filesystem details (absolute paths, OS error codes) back
      // to the client — log the real error server-side and return a generic
      // one instead.
      console.error('[panel] save request failed:', writeErr);
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: 'Write failed; changes were rolled back' }));
    }
  });
}

/**
 * Dev-only save endpoint for the visual editing panel.
 *
 * `apply: 'serve'` is what makes this structurally dev-only: the plugin is
 * not part of a production build at all, so there is no code path that
 * writes files outside `npm run dev`.
 */
export function panelPlugin(): Plugin {
  return {
    name: 'visual-editing-panel',
    apply: 'serve',
    configureServer(server) {
      // Returning the hook (instead of calling `server.middlewares.use`
      // directly in the body) registers it as a *post* hook: Vite installs
      // its own internal middlewares — including its Host-header /
      // allowedHosts check — before this one runs.
      return () => {
        server.middlewares.use('/__panel/save', handleSaveRequest);
      };
    },
  };
}
