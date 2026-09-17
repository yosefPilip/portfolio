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
    existsSync: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import * as fs from 'node:fs';
import { handleSaveRequest, MAX_BODY_BYTES } from '../src/panel/server/plugin';
import { resolveWriteTarget, resolveImageWriteTarget, MAX_IMAGE_BYTES } from '../src/panel/server/paths';

/** The fake filesystem `node:fs`'s mocked functions read and write. Images
    are written as Buffers; storing them in the same string-keyed map as text
    works fine for these tests, which only check presence/absence and the
    decoded byte content. */
const files = new Map<string, string | Buffer>();

function fakeReadFileSync(path: string): string {
  if (!files.has(path)) {
    const err = new Error(`ENOENT: no such file, open '${path}'`) as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  }
  return files.get(path) as string;
}

function fakeWriteFileSync(path: string, contents: string | Buffer): void {
  files.set(path, contents);
}

function fakeUnlinkSync(path: string): void {
  files.delete(path);
}

function fakeExistsSync(path: string): boolean {
  return files.has(path);
}

beforeEach(() => {
  files.clear();
  vi.mocked(fs.readFileSync).mockReset().mockImplementation(fakeReadFileSync as never);
  vi.mocked(fs.writeFileSync).mockReset().mockImplementation(fakeWriteFileSync as never);
  vi.mocked(fs.unlinkSync).mockReset().mockImplementation(fakeUnlinkSync as never);
  vi.mocked(fs.existsSync).mockReset().mockImplementation(fakeExistsSync as never);
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
  images?: Array<{ label: string; src: string }>;
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

describe('handleSaveRequest — dropped images', () => {
  const FRAME_PAGE =
    '<!DOCTYPE html><html><body>' +
    '<figure class="frame" data-label="Hero L1 — jungle-far"><img src="/assets/img/jungle-far.webp" alt="" /></figure>' +
    '<p data-edit="a">Original</p>' +
    '</body></html>';

  function imagePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      files: [],
      images: [
        {
          path: 'index.html',
          label: 'Hero L1 — jungle-far',
          fileName: 'My Photo.JPG',
          data: Buffer.from('fake bytes').toString('base64'),
          beforeSrc: '/assets/img/jungle-far.webp',
          ...overrides,
        },
      ],
    };
  }

  function send(payload: Record<string, unknown>): FakeResponse {
    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();
    invoke(req, res);
    req.emit('data', Buffer.from(JSON.stringify(payload), 'utf8'));
    req.emit('end');
    return res;
  }

  it('writes the image, patches the src, and reports where it landed', () => {
    files.set(resolveWriteTarget('index.html'), FRAME_PAGE);

    const res = send(imagePayload());

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res).images).toEqual([{ label: 'Hero L1 — jungle-far', src: '/assets/img/my-photo.jpg' }]);
    expect(files.get(resolveImageWriteTarget('my-photo.jpg'))?.toString()).toBe('fake bytes');
    expect(files.get(resolveWriteTarget('index.html'))).toContain('src="/assets/img/my-photo.jpg"');
  });

  it('never overwrites an existing image file — picks the next free name', () => {
    files.set(resolveWriteTarget('index.html'), FRAME_PAGE);
    files.set(resolveImageWriteTarget('my-photo.jpg'), Buffer.from('older art, do not touch'));

    const res = send(imagePayload());

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res).images).toEqual([{ label: 'Hero L1 — jungle-far', src: '/assets/img/my-photo-2.jpg' }]);
    expect(files.get(resolveImageWriteTarget('my-photo.jpg'))?.toString()).toBe('older art, do not touch');
  });

  it('rejects an oversized image before writing anything', () => {
    files.set(resolveWriteTarget('index.html'), FRAME_PAGE);
    const big = Buffer.alloc(MAX_IMAGE_BYTES + 1, 0x61).toString('base64');

    const res = send(imagePayload({ data: big }));

    expect(res.statusCode).toBe(400);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(files.get(resolveWriteTarget('index.html'))).toBe(FRAME_PAGE);
  });

  it('aborts the whole request when the src on disk does not match what the panel loaded', () => {
    files.set(resolveWriteTarget('index.html'), FRAME_PAGE);

    const res = send(imagePayload({ beforeSrc: '/assets/img/something-else.webp' }));

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).error).toMatch(/changed on disk/i);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(files.get(resolveWriteTarget('index.html'))).toBe(FRAME_PAGE);
  });

  it('rejects a filename with an extension this panel will never write', () => {
    files.set(resolveWriteTarget('index.html'), FRAME_PAGE);

    const res = send(imagePayload({ fileName: 'photo.heic' }));

    expect(res.statusCode).toBe(400);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('applies a dropped image, a text edit, and a whole-file write in one request', () => {
    files.set(resolveWriteTarget('index.html'), FRAME_PAGE);

    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();
    invoke(req, res);
    req.emit(
      'data',
      Buffer.from(
        JSON.stringify({
          files: [{ path: 'src/styles/layout.generated.css', contents: 'NEW CSS' }],
          patches: [{ path: 'index.html', id: 'a', before: 'Original', after: 'Rewritten' }],
          images: [
            {
              path: 'index.html',
              label: 'Hero L1 — jungle-far',
              fileName: 'photo.png',
              data: Buffer.from('bytes').toString('base64'),
              beforeSrc: '/assets/img/jungle-far.webp',
            },
          ],
        }),
        'utf8',
      ),
    );
    req.emit('end');

    expect(res.statusCode).toBe(200);
    const finalHtml = files.get(resolveWriteTarget('index.html')) as string;
    expect(finalHtml).toContain('<p data-edit="a">Rewritten</p>');
    expect(finalHtml).toContain('src="/assets/img/photo.png"');
    expect(files.get(resolveWriteTarget('src/styles/layout.generated.css'))).toBe('NEW CSS');
    expect(files.get(resolveImageWriteTarget('photo.png'))?.toString()).toBe('bytes');
  });

  it('refuses an image targeting a path already covered by a whole-file write in the same request', () => {
    const res = send({
      files: [{ path: 'index.html', contents: '<html></html>' }],
      images: (imagePayload().images as unknown[]),
    });

    expect(res.statusCode).toBe(400);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rolls back an already-written image if a later image in the same batch fails to write', () => {
    const twoFramePage =
      '<!DOCTYPE html><html><body>' +
      '<figure class="frame" data-label="a"><img src="/assets/img/a.webp" /></figure>' +
      '<figure class="frame" data-label="b"><img src="/assets/img/b.webp" /></figure>' +
      '</body></html>';
    files.set(resolveWriteTarget('index.html'), twoFramePage);
    const absSecond = resolveImageWriteTarget('two.png');
    vi.mocked(fs.writeFileSync).mockImplementation(((path: string, contents: string | Buffer) => {
      if (path === absSecond) throw new Error('simulated failure');
      fakeWriteFileSync(path, contents);
    }) as never);

    const req = new FakeRequest('POST', SAME_ORIGIN_HEADERS);
    const res = new FakeResponse();
    invoke(req, res);
    req.emit(
      'data',
      Buffer.from(
        JSON.stringify({
          files: [],
          images: [
            { path: 'index.html', label: 'a', fileName: 'one.png', data: Buffer.from('1').toString('base64'), beforeSrc: '/assets/img/a.webp' },
            { path: 'index.html', label: 'b', fileName: 'two.png', data: Buffer.from('2').toString('base64'), beforeSrc: '/assets/img/b.webp' },
          ],
        }),
        'utf8',
      ),
    );
    req.emit('end');

    expect(res.statusCode).toBe(400);
    // The first image's bytes DID get written, then had to be rolled back —
    // unlinked, since (unlike a text/CSS target) an image is always a
    // brand-new file with no prior content to restore.
    expect(files.has(resolveImageWriteTarget('one.png'))).toBe(false);
    expect(files.has(absSecond)).toBe(false);
    // The patched HTML (both src patches applied in memory) must not have
    // been written either — it shares the SAME target as the image writes
    // it accompanies, so it comes first in `targets` and IS in fact written
    // before the failing image is reached; it too must be rolled back to
    // its original, unpatched content.
    expect(files.get(resolveWriteTarget('index.html'))).toBe(twoFramePage);
  });
});
