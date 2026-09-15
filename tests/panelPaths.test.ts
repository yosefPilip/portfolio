import { describe, it, expect } from 'vitest';
import { resolveWriteTarget } from '../src/panel/server/paths';

describe('resolveWriteTarget', () => {
  it('allows the generated stylesheet', () => {
    expect(resolveWriteTarget('src/styles/layout.generated.css')).toMatch(/layout\.generated\.css$/);
  });

  it('allows each page HTML file', () => {
    for (const p of ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html']) {
      expect(() => resolveWriteTarget(p)).not.toThrow();
    }
  });

  it('rejects traversal', () => {
    expect(() => resolveWriteTarget('../../../etc/passwd')).toThrow(/not an allowed/i);
  });

  it('rejects an absolute path', () => {
    expect(() => resolveWriteTarget('/etc/passwd')).toThrow(/not an allowed/i);
  });

  it('rejects a stylesheet that is not the generated one', () => {
    expect(() => resolveWriteTarget('src/styles/tokens.css')).toThrow(/not an allowed/i);
  });

  it('rejects a path that only looks allowed', () => {
    expect(() => resolveWriteTarget('src/styles/layout.generated.css.bak')).toThrow(/not an allowed/i);
  });

  it('normalises separators so a Windows-style path resolves the same', () => {
    expect(resolveWriteTarget('src\\styles\\layout.generated.css')).toMatch(/layout\.generated\.css$/);
  });

  it('rejects a Windows drive-letter absolute path', () => {
    expect(() => resolveWriteTarget('C:\\Windows\\System32\\config')).toThrow(/not an allowed/i);
  });

  it('rejects a dot-segment alias that is not an exact allowlist match', () => {
    expect(() => resolveWriteTarget('src/styles/../styles/layout.generated.css')).toThrow(/not an allowed/i);
  });
});
