import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocked so these tests never touch the real filesystem — same approach as
// panelSaveHandler.test.ts. resolveImageWriteTarget (paths.ts) only imports
// node:path, so it still computes real absolute paths; those strings are
// just used as keys into the fake "disk" below.
vi.mock('node:fs', () => {
  const mocked = { existsSync: vi.fn() };
  return { ...mocked, default: mocked };
});

import * as fs from 'node:fs';
import { resolveImageUpload, type ImageUpload } from '../src/panel/server/images';
import { resolveImageWriteTarget, MAX_IMAGE_BYTES } from '../src/panel/server/paths';

/** The fake "what's already on disk" set the mocked existsSync consults. */
const onDisk = new Set<string>();

beforeEach(() => {
  onDisk.clear();
  vi.mocked(fs.existsSync).mockReset().mockImplementation(((p: string) => onDisk.has(p)) as never);
});

function upload(overrides: Partial<ImageUpload> = {}): ImageUpload {
  return {
    path: 'index.html',
    label: 'Hero L1 — jungle-far',
    fileName: 'photo.jpg',
    data: Buffer.from('fake image bytes').toString('base64'),
    beforeSrc: '/assets/img/jungle-far.webp',
    ...overrides,
  };
}

describe('resolveImageUpload', () => {
  it('decodes base64 and resolves a fresh, valid filename', () => {
    const reserved = new Set<string>();
    const resolved = resolveImageUpload(upload(), reserved);
    expect(resolved.buffer.toString()).toBe('fake image bytes');
    expect(resolved.absPath).toBe(resolveImageWriteTarget('photo.jpg'));
    expect(resolved.src).toBe('/assets/img/photo.jpg');
    expect(resolved.label).toBe('Hero L1 — jungle-far');
  });

  it('never overwrites an existing file — picks the next free variant', () => {
    onDisk.add(resolveImageWriteTarget('photo.jpg'));
    const resolved = resolveImageUpload(upload(), new Set());
    expect(resolved.absPath).toBe(resolveImageWriteTarget('photo-2.jpg'));
    expect(resolved.src).toBe('/assets/img/photo-2.jpg');
  });

  it('keeps climbing past several existing collisions', () => {
    onDisk.add(resolveImageWriteTarget('photo.jpg'));
    onDisk.add(resolveImageWriteTarget('photo-2.jpg'));
    onDisk.add(resolveImageWriteTarget('photo-3.jpg'));
    const resolved = resolveImageUpload(upload(), new Set());
    expect(resolved.src).toBe('/assets/img/photo-4.jpg');
  });

  it('avoids colliding with another image in the SAME batch, not just what is on disk', () => {
    const reserved = new Set<string>();
    const first = resolveImageUpload(upload(), reserved);
    const second = resolveImageUpload(upload(), reserved);
    expect(first.src).not.toBe(second.src);
    expect(second.src).toBe('/assets/img/photo-2.jpg');
  });

  it('derives a safe name from a messy original filename', () => {
    const resolved = resolveImageUpload(upload({ fileName: 'My Test Photo (1).JPG' }), new Set());
    expect(resolved.src).toBe('/assets/img/my-test-photo-1.jpg');
  });

  it('throws — without resolving a path — for a disallowed extension', () => {
    expect(() => resolveImageUpload(upload({ fileName: 'photo.heic' }), new Set())).toThrow(/not one of/i);
  });

  it('throws for a payload over the per-image byte cap, before anything is resolved', () => {
    const big = Buffer.alloc(MAX_IMAGE_BYTES + 1, 0x61).toString('base64');
    expect(() => resolveImageUpload(upload({ data: big }), new Set())).toThrow(/over the .* cap/i);
  });

  it('accepts a payload exactly at the cap', () => {
    const exact = Buffer.alloc(MAX_IMAGE_BYTES, 0x61).toString('base64');
    expect(() => resolveImageUpload(upload({ data: exact }), new Set())).not.toThrow();
  });

  it('throws for an empty payload', () => {
    expect(() => resolveImageUpload(upload({ data: '' }), new Set())).toThrow(/0 bytes/i);
  });
});
