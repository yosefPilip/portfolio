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

/** POST the batch to the dev endpoint. Rejects with the server's message. */
export async function save(files: SaveFile[], patches: TextPatchRequest[] = []): Promise<void> {
  const res = await fetch('/__panel/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, patches }),
  });
  const body = (await res.json()) as { ok: boolean; error?: string; stale?: unknown };
  if (!res.ok || !body.ok) {
    const err = new Error(body.error ?? `Save failed (${res.status})`) as SaveError;
    err.stale = Array.isArray(body.stale) ? body.stale.filter(isStaleRef) : [];
    throw err;
  }
}
