import type { FontKey, StepKey, ColorKey } from './types';

/**
 * Everything specific to THIS project.
 *
 * Porting the panel elsewhere should mean writing a second file shaped like
 * this one and changing nothing else. If a project-specific fact leaks into
 * any other panel module, it belongs here instead.
 */
export const MANIFEST = {
  /** Where generated CSS is written, relative to the project root. */
  generatedCssPath: 'src/styles/layout.generated.css',

  /** How an editable image slot is recognised in the DOM. */
  slotSelector: 'figure.frame',
  /** The attribute holding a slot's stable key. */
  slotKeyAttr: 'data-label',

  /** The attribute marking an editable text block. */
  editAttr: 'data-edit',

  fonts: ['display', 'body', 'mono'] as FontKey[],
  steps: ['wordmark', 'display', 'h1', 'h2', 'lede', 'body', 'meta'] as StepKey[],
  colors: ['fg', 'fg-dim', 'muted', 'accent', 'accent-2'] as ColorKey[],

  /** Which HTML file backs a given URL path. */
  pageForPath(pathname: string): string {
    const clean = pathname.replace(/^\//, '');
    if (clean === '' || clean === 'index.html') return 'index.html';
    return clean;
  },
};
