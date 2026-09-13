import { readdirSync } from 'node:fs';

/**
 * Every project stylesheet except tokens.css, which is the one file allowed to
 * hold colour literals.
 *
 * Enumerated from the directory rather than listed by hand, deliberately: the
 * previous hardcoded lists silently skipped home.css, stack.css and
 * coverflow.css, and would have skipped projects.css, music.css and
 * workshop.css when Plans 2 and 3 land. A new stylesheet is now enforced by
 * construction the moment the file appears.
 */
export const STYLESHEETS: string[] = readdirSync('src/styles')
  .filter((f) => f.endsWith('.css') && f !== 'tokens.css')
  .map((f) => `src/styles/${f}`)
  .sort();
