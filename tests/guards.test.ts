import { describe, it, expect } from 'vitest';
import { findForbiddenCopy, findHardcodedHex } from '../src/lib/guards';

describe('findForbiddenCopy', () => {
  it('finds the terminal-cosplay strings the spec bans', () => {
    const src = '<p class="eyebrow">Sector_01 // Experience_Log</p><div>NODE_YP</div>';
    expect(findForbiddenCopy(src)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Sector_/i), 'NODE_YP']),
    );
  });

  it('finds log ids, uplink, build-status, and status-online lines', () => {
    const src = 'LOG_001 ... UPLINK_READY ... SIGNAL_LIVE ... BUILD_STATIC // NO_FRAMEWORK ... STATUS: ONLINE';
    expect(findForbiddenCopy(src)).toHaveLength(5);
  });

  it('returns an empty array for clean copy', () => {
    expect(findForbiddenCopy('<h1>Yosef Pilip</h1><p>I build things.</p>')).toEqual([]);
  });

  it('does not false-positive on ordinary words containing "log"', () => {
    expect(findForbiddenCopy('<p>A running log of roles.</p>')).toEqual([]);
  });
});

describe('findHardcodedHex', () => {
  it('ignores hex inside :root', () => {
    const css = ':root { --bg: #171b19; --fg: #f0efe9; }\n.card { color: var(--fg); }';
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('ignores hex inside a [data-room] block', () => {
    const css = '[data-room="home"] { --accent-2: #8aa572; }\n.x { color: var(--accent-2); }';
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('reports hex used anywhere else', () => {
    const css = ':root { --bg: #171b19; }\n.card { border-color: #ff0000; }';
    expect(findHardcodedHex(css)).toEqual(['#ff0000']);
  });

  it('ignores hex inside comments', () => {
    const css = '/* was #a4d64c before the rebuild */\n.card { color: var(--fg); }';
    expect(findHardcodedHex(css)).toEqual([]);
  });
});
