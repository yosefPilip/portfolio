export interface SaveFile {
  path: string;
  contents: string;
}

/** POST the batch to the dev endpoint. Rejects with the server's message. */
export async function save(files: SaveFile[]): Promise<void> {
  const res = await fetch('/__panel/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  const body = (await res.json()) as { ok: boolean; error?: string };
  if (!res.ok || !body.ok) throw new Error(body.error ?? `Save failed (${res.status})`);
}
