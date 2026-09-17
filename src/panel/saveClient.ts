export interface SaveFile {
  path: string;
  contents: string;
}

export interface TextPatchRequest {
  path: string;
  id: string;
  before: string;
  after: string;
}

/** A dropped image awaiting Save. `data` is base64; `beforeSrc` is the
    `<img src>` value the panel loaded, for the server's stale check. */
export interface ImageUploadRequest {
  path: string;
  label: string;
  fileName: string;
  data: string;
  beforeSrc: string;
}

/** What a successful save actually did to any dropped images — the final,
    collision-free src each label's image landed at, so the caller can point
    that slot's <img> at reality instead of guessing the name it asked for. */
export interface SaveResult {
  images: Array<{ label: string; src: string }>;
}

/** A text edit the endpoint refused because the file no longer matches it. */
export interface StaleTextRef {
  path: string;
  id: string;
}

/**
 * A failed save, carrying any text edits the endpoint reported as stale.
 *
 * Read structurally rather than parsed out of the message: the panel's only
 * exit from a stale-file wedge is discarding exactly these edits, and tying
 * that recovery to the wording of an error sentence would break it silently
 * the next time the sentence is improved.
 */
export interface SaveError extends Error {
  stale: StaleTextRef[];
}

export function isSaveError(err: unknown): err is SaveError {
  return err instanceof Error && Array.isArray((err as SaveError).stale);
}

function isStaleRef(value: unknown): value is StaleTextRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StaleTextRef).path === 'string' &&
    typeof (value as StaleTextRef).id === 'string'
  );
}

function isImageResultEntry(value: unknown): value is { label: string; src: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { label: unknown }).label === 'string' &&
    typeof (value as { src: unknown }).src === 'string'
  );
}

/**
 * POST the batch to the dev endpoint. Rejects with the server's message.
 *
 * Images travel as base64 inside the same JSON body as `files`/`patches`
 * rather than over a second endpoint: it reuses every hardening this one
 * already has (the Content-Type/Origin checks, the size cap, the
 * validate-everything-before-writing-anything transaction) instead of
 * building and re-securing a second attack surface for what is, for a dev
 * tool, an infrequent handful of images per save.
 */
export async function save(
  files: SaveFile[],
  patches: TextPatchRequest[] = [],
  images: ImageUploadRequest[] = [],
): Promise<SaveResult> {
  const res = await fetch('/__panel/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, patches, images }),
  });
  const body = (await res.json()) as { ok: boolean; error?: string; stale?: unknown; images?: unknown };
  if (!res.ok || !body.ok) {
    const err = new Error(body.error ?? `Save failed (${res.status})`) as SaveError;
    err.stale = Array.isArray(body.stale) ? body.stale.filter(isStaleRef) : [];
    throw err;
  }
  return { images: Array.isArray(body.images) ? body.images.filter(isImageResultEntry) : [] };
}
