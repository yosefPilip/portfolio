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

/** POST the batch to the dev endpoint. Rejects with the server's message. */
export async function save(files: SaveFile[], patches: TextPatchRequest[] = []): Promise<void> {
  const res = await fetch('/__panel/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, patches }),
  });
  const body = (await res.json()) as { ok: boolean; error?: string };
  if (!res.ok || !body.ok) throw new Error(body.error ?? `Save failed (${res.status})`);
}
