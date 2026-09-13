import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findHardcodedHex } from '../src/lib/guards';
import { STYLESHEETS } from './stylesheets';

/**
 * The islands (intro.css, nameFlip.css) were the only files this suite used to
 * name. It now sweeps every stylesheet, so the two biggest — home.css and
 * stack.css — and anything Plans 2 and 3 add are covered without an edit here.
 */
describe.each(STYLESHEETS)('%s', (path) => {
  const css = readFileSync(path, 'utf8');

  it('carries no colour literals — every stylesheet uses tokens', () => {
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('has no lime or amber left from the old palette', () => {
    expect(css.toLowerCase()).not.toContain('a4d64c');
    expect(css.toLowerCase()).not.toContain('ffb77d');
    expect(css.toLowerCase()).not.toContain('d97707');
  });

  it('references no custom property the project never defines', () => {
    // --ar, --p, --intro-fade-ms and --flip-board-columns are set from markup or
    // JS at runtime, so they are legitimately absent from the stylesheets.
    const RUNTIME_SET = new Set(['--ar', '--p', '--intro-fade-ms', '--flip-board-columns']);
    const defined = new Set(
      STYLESHEETS.concat('src/styles/tokens.css')
        .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)])
        .map((m) => m[1]),
    );
    const dangling = [...new Set([...css.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)].map((m) => m[1]))]
      .filter((v) => !defined.has(v) && !RUNTIME_SET.has(v));
    expect(dangling).toEqual([]);
  });
});
