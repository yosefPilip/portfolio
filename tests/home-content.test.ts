import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');

describe('Home content', () => {
  it('has all six body sections', () => {
    for (const id of ['about', 'thesis', 'work', 'experience', 'elsewhere', 'contact']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('carries the résumé metrics verbatim', () => {
    expect(html).toContain('$8,000');
    expect(html).toContain('40 hours a month');
    expect(html).toContain('same-day');
    expect(html).toContain('$12,000');
  });

  it('uses the correct email', () => {
    expect(html).toContain('yosefpilip@gmail.com');
    expect(html).not.toContain('hello@yosefpilip.com');
  });

  it('drops the roles and claims the résumé does not support', () => {
    expect(html).not.toContain('Aztec Robotics');
    expect(html).not.toContain('Russian — Native');
    expect(html).not.toContain('Apali');
  });

  it('does not publish a location — the owner declined to give one', () => {
    // A dash would imply a value is coming. There isn't one, so the row is gone.
    expect(html).not.toMatch(/<dt[^>]*>Based<\/dt>/);
  });
});
