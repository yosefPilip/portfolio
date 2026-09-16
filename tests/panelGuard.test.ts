import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ENTRIES = [
  'src/main.tsx',
  'src/entries/projects.ts',
  'src/entries/music.tsx',
  'src/entries/workshop.ts',
  'src/entries/case-study.ts',
];

describe.each(ENTRIES)('%s', (file) => {
  const src = readFileSync(file, 'utf8');

  it('imports the panel only behind import.meta.env.DEV', () => {
    if (!src.includes('panel')) return;
    // The panel must be reached through a dynamic import inside a DEV branch,
    // never a top-level static import — a static import is bundled whether or
    // not the branch is taken.
    expect(src).not.toMatch(/^import .*['"]\.{1,2}\/panel/m);
    expect(src).toMatch(/import\.meta\.env\.DEV/);
  });
});

describe.each(ENTRIES)('%s — panel import failure', (file) => {
  const src = readFileSync(file, 'utf8');

  it('catches a failed panel import instead of leaving an unhandled rejection', () => {
    // Without a .catch(), a throw anywhere in the panel's install path becomes
    // an unhandled rejection and the tool is simply, silently absent.
    expect(src).toMatch(/import\(['"]\.{1,2}\/panel['"]\)[\s\S]*?\.catch\(/);
  });

  it('logs loudly rather than swallowing it', () => {
    expect(src).toMatch(/\.catch\(\(err\) => console\.error\(/);
  });
});

describe('every page entry', () => {
  it('mounts the panel, so the tool exists on all four rooms', () => {
    for (const file of ENTRIES) {
      expect(readFileSync(file, 'utf8'), file).toContain('import.meta.env.DEV');
    }
  });
});
