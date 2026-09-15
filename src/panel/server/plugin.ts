import { writeFileSync, readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { resolveWriteTarget } from './paths';

interface SavePayload {
  files: Array<{ path: string; contents: string }>;
}

/**
 * Dev-only save endpoint for the visual editing panel.
 *
 * `apply: 'serve'` is what makes this structurally dev-only: the plugin is not
 * part of a production build at all, so there is no code path that writes
 * files outside `npm run dev`.
 */
export function panelPlugin(): Plugin {
  return {
    name: 'visual-editing-panel',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__panel/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('{"ok":false,"error":"POST only"}');
          return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const payload = JSON.parse(body) as SavePayload;

            // Resolve every target BEFORE writing any of them, so a rejected
            // path aborts the whole request rather than leaving half applied.
            const targets = payload.files.map((f) => ({
              abs: resolveWriteTarget(f.path),
              contents: f.contents,
            }));

            // Snapshot for rollback: a failed write mid-batch restores the rest.
            const before = targets.map((t) => {
              try { return readFileSync(t.abs, 'utf8'); } catch { return null; }
            });

            try {
              targets.forEach((t) => writeFileSync(t.abs, t.contents, 'utf8'));
            } catch (writeErr) {
              targets.forEach((t, i) => {
                if (before[i] !== null) writeFileSync(t.abs, before[i] as string, 'utf8');
              });
              throw writeErr;
            }

            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, written: targets.length }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
          }
        });
      });
    },
  };
}
