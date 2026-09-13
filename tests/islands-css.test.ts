import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findHardcodedHex } from '../src/lib/guards';

describe.each(['src/styles/intro.css', 'src/styles/nameFlip.css'])('%s', (path) => {
  const css = readFileSync(path, 'utf8');

  it('carries no colour literals — the islands use tokens like everything else', () => {
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('has no lime or amber left from the old palette', () => {
    expect(css.toLowerCase()).not.toContain('a4d64c');
    expect(css.toLowerCase()).not.toContain('ffb77d');
    expect(css.toLowerCase()).not.toContain('d97707');
  });
});
