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

  it('publishes the city — the owner reversed the earlier decision', () => {
    // Owner, later: "You can add city if you want. Just say Bay Area and San
    // Diego or something because I'm in both." The row is back, with a value.
    expect(html).toMatch(/<dt[^>]*>Based<\/dt>\s*<dd[^>]*>Bay Area &amp; San Diego<\/dd>/);
  });
});
