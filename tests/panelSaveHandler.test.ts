import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Mocked so these tests never touch the real filesystem. `resolveWriteTarget`
// (from paths.ts) only imports `node:path`, so it still computes real
// absolute paths — we just use those strings as keys into a fake in-memory
// filesystem below, rather than letting anything actually read/write disk.
vi.mock('node:fs', () => {
  const mocked = {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import * as fs from 'node:fs';
import { handleSaveRequest, MAX_BODY_BYTES } from '../src/panel/server/plugin';
import { resolveWriteTarget } from '../src/panel/server/paths';

/** The fake filesystem `node:fs`'s mocked functions read and write. */
const files = new Map<string, string>();

function fakeReadFileSync(path: string): string {
  if (!files.has(path)) {
    const err = new Error(`ENOENT: no such file, open '${path}'`) as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  }
  return files.get(path) as string;
}

function fakeWriteFileSync(path: string, contents: string): void {
  files.set(path, contents);
}

function fakeUnlinkSync(path: string): void {
  files.delete(path);
}

beforeEach(() => {
  files.clear();
  vi.mocked(fs.readFileSync).mockReset().mockImplementation(fakeReadFileSync as never);
  vi.mocked(fs.writeFileSync).mockReset().mockImplementation(fakeWriteFileSync as never);
  vi.mocked(fs.unlinkSync).mockReset().mockImplementation(fakeUnlinkSync as never);
});

/** Minimal double for http.IncomingMessage: an event emitter plus the bits the handler touches. */
class FakeRequest extends EventEmitter {
  method: string;
  headers: Record<string, string | undefined>;
  destroyed = false;

  constructor(method: string, headers: Record<string, string | undefined> = {}) {
    super();
    this.method = method;
    this.headers = headers;
  }

  resume(): this {
    return this;
  }

  destroy(): this {
    this.destroyed = true;
    return this;
  }

  setTimeout(): this {
    // Not exercised: no test in this file relies on the timeout actually firing.
    return this;
  }
}

/** Minimal double for http.ServerResponse: records status/body instead of writing to a socket. */
class FakeResponse {
  statusCode = 200;
  headersSent = false;
  body = '';
  private headerMap = new Map<string, string>();

  setHeader(name: string, value: string): void {
    this.headerMap.set(name.toLowerCase(), value);
  }

  getHeader(name: string): string | undefined {
    return this.headerMap.get(name.toLowerCase());
  }

  end(chunk?: string): void {
    if (typeof chunk === 'string') this.body = chunk;
    this.headersSent = true;
  }
}

function jsonBody(res: FakeResponse): {
  ok: boolean;
  error?: string;
  written?: number;
  stale?: Array<{ path: string; id: string }>;
} {
  return JSON.parse(res.body);
}

/** Headers for a same-origin POST matching this project's assigned dev port (5174). */
const SAME_ORIGIN_HEADERS = {
  'content-type': 'application/json',
  origin: 'http://localhost:5174',
  host: 'localhost:5174',
};

function invoke(req: FakeRequest, res: FakeResponse): void {
  handleSaveRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse);
}

describe('handleSaveRequest — transport-layer hardening', () => {
  it('rejects a text/plain content type (the CORS-safelisted shape a CSRF page must use)', () => {
    const req = new FakeRequest('POST', { 'content-type': 'text/plain' });
    const res = new FakeResponse();

    invoke(req, res);

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).ok).toBe(false);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('allows the IPv6 loopback origin, which Vite serves by default', () => {
    // Browsing the dev server at http://[::1]:5174 is a real thing Vite's own
    // default host list permits; rejecting it 403'd every Save with
    // "Origin not allowed".
    const absTarget = resolveWriteTarget('index.html');
    const req = new FakeRequest('POST', {
      'content-type': 'application/json',
      origin: 'http://[::1]:5174',
      host: '[::1]:5174',
    });
    const res = new FakeResponse();

    invoke(req, res);
    req.emit('data', Buffer.from(JSON.stringify({ files: [{ path: 'index.html', contents: 'ok' }] }), 'utf8'));
    req.emit('end');

    expect(res.statusCode).toBe(200);
    expect(files.get(absTarget)).toBe('ok');
  });

  it('still rejects an IPv6-shaped origin that is not loopback', () => {
    const req = new FakeRequest('POST', {
      'content-type': 'application/json',
      origin: 'http://[::2]:5174',
      host: '[::1]:5174',
    });
    const res = new FakeResponse();

    invoke(req, res);

    expect(res.statusCode).toBe(403);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects a request whose Origin does not match the dev server Host', () => {
    const req = new FakeRequest('POST', {
      'content-type': 'application/json',
      origin: 'http://evil.example',
      host: 'localhost:5174',
    });
    const res = new FakeResponse();

    invoke(req, res);

    expect(res.statusCode).toBe(403);
    expect(jsonBody(res).ok).toBe(false);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('reassembles a multi-byte UTF-8 character split across two chunks without corruption', () => {
    const targetPath = 'index.html';
    const absTarget = resolveWriteTarget(targetPath);
    files.set(absTarget, '<html>original</html>');

    // U+2014 EM DASH encodes to 3 UTF-8 bytes: E2 80 94. Split the buffer so
    // the sequence straddles the chunk boundary, exactly what a real 64 KiB
    // socket highWaterMark can do mid-character.
    const contents = 'a—b';
    const json = JSON.stringify({ files: [{ path: targetPath, contents }] });
    const buf = Buffer.from(json, 'utf8');
    const dashByteIndex = buf.indexOf(Buffer.from('—', 'utf8'));
    const splitAt = dashByteIndex + 2; // after E2 80, before the trailing 94
    const chunk1 = buf.subarray(0, splitAt);
    const chunk2 = buf.subarray(splitAt);

    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();

    invoke(req, res);
    req.emit('data', chunk1);
    req.emit('data', chunk2);
    req.emit('end');

    expect(res.statusCode).toBe(200);
    expect(files.get(absTarget)).toBe(contents);
  });

  it('rejects a null "files" field before any write is attempted', () => {
    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();

    invoke(req, res);
    req.emit('data', Buffer.from(JSON.stringify({ files: null }), 'utf8'));
    req.emit('end');

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).ok).toBe(false);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects a file entry with a missing (non-string) "contents" before any write is attempted', () => {
    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();

    invoke(req, res);
    req.emit('data', Buffer.from(JSON.stringify({ files: [{ path: 'index.html' }] }), 'utf8'));
    req.emit('end');

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).ok).toBe(false);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects a body over the configured cap and destroys the connection', () => {
    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();

    invoke(req, res);
    req.emit('data', Buffer.alloc(MAX_BODY_BYTES + 1, 0x61));

    expect(res.statusCode).toBe(413);
    expect(jsonBody(res).ok).toBe(false);
    expect(req.destroyed).toBe(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('leaves a previously-absent file absent when a later write in the same batch fails', () => {
    const absNewFile = resolveWriteTarget('src/styles/layout.generated.css'); // absent before this request
    const absExisting = resolveWriteTarget('music.html');
    files.set(absExisting, '<html>music original</html>');

    // Force the second write in the batch to fail, simulating a real fs
    // error (disk full, permission denied, editor lock) after the first
    // write already succeeded.
    vi.mocked(fs.writeFileSync).mockImplementation(((path: string, contents: string) => {
      if (path === absExisting) {
        throw new Error('simulated write failure');
      }
      fakeWriteFileSync(path, contents);
    }) as never);

    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();

    invoke(req, res);
    req.emit(
      'data',
      Buffer.from(
        JSON.stringify({
          files: [
            { path: 'src/styles/layout.generated.css', contents: 'NEW CSS' },
            { path: 'music.html', contents: 'NEW MUSIC HTML' },
          ],
        }),
        'utf8',
      ),
    );
    req.emit('end');

    expect(res.statusCode).toBe(400);
    // The file that did not exist before the batch must not be left behind.
    expect(files.has(absNewFile)).toBe(false);
    // The file whose own write failed must be untouched.
    expect(files.get(absExisting)).toBe('<html>music original</html>');
    // No absolute filesystem path leaks into the client-facing error.
    expect(jsonBody(res).error).not.toMatch(/[A-Za-z]:[\\/]/);
    expect(jsonBody(res).error).not.toMatch(/layout\.generated\.css/);
  });
});

describe('handleSaveRequest — a stale text patch must be recoverable', () => {
  const PAGE = '<!DOCTYPE html>\n<html><body><p data-edit="a">On disk now</p></body></html>';

  function staleRequest(): { res: FakeResponse; absPage: string; absCss: string } {
    const absPage = resolveWriteTarget('index.html');
    const absCss = resolveWriteTarget('src/styles/layout.generated.css');
    files.set(absPage, PAGE);

    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();
    invoke(req, res);
    req.emit(
      'data',
      Buffer.from(
        JSON.stringify({
          files: [{ path: 'src/styles/layout.generated.css', contents: 'CSS THE USER ALSO WANTS' }],
          patches: [{ path: 'index.html', id: 'a', before: 'What the panel loaded', after: 'New words' }],
        }),
        'utf8',
      ),
    );
    req.emit('end');
    return { res, absPage, absCss };
  }

  it('names the conflicting edits in a machine-readable "stale" field', () => {
    const { res } = staleRequest();
    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).stale).toEqual([{ path: 'index.html', id: 'a' }]);
  });

  it('writes nothing at all — the CSS in the same request is not half-applied', () => {
    const { res, absPage, absCss } = staleRequest();
    expect(jsonBody(res).ok).toBe(false);
    expect(files.has(absCss)).toBe(false);
    expect(files.get(absPage)).toBe(PAGE);
  });

  it('omits "stale" entirely when the failure is not a stale patch', () => {
    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();
    invoke(req, res);
    req.emit('data', Buffer.from(JSON.stringify({ files: [], patches: [{ path: 'nope.html', id: 'a', before: '', after: '' }] }), 'utf8'));
    req.emit('end');

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).stale).toBeUndefined();
  });
});
