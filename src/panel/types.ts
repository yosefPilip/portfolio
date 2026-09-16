/** The three font families tokens.css defines. */
export type FontKey = 'display' | 'body' | 'mono';

/** The seven type steps tokens.css defines. */
export type StepKey = 'wordmark' | 'display' | 'h1' | 'h2' | 'lede' | 'body' | 'meta';

/** Foreground colour tokens offerable as text colour. Never a literal. */
export type ColorKey = 'fg' | 'fg-dim' | 'muted' | 'accent' | 'accent-2';

/** Framing of one image inside its frame. */
export interface ImageEdit {
  /** object-position X as a percentage, 0-100. */
  x: number;
  /** object-position Y as a percentage, 0-100. */
  y: number;
  /** scale() multiplier, 1-4. 1 means untouched. */
  zoom: number;
}

/** Typographic overrides for one editable text block. */
export interface TextStyleEdit {
  font?: FontKey;
  step?: StepKey;
  color?: ColorKey;
}

/** Pending text edits, keyed "<file>::<data-edit id>". */
export interface TextEdit {
  file: string;
  id: string;
  before: string;
  after: string;
}

/**
 * Everything the panel can express as CSS, plus pending text edits.
 *
 * `images` is keyed by the frame's `data-label`; `styles` and `text` by the
 * element's `data-edit` id (`text` additionally namespaced by file, since the
 * same id could in principle appear on two different pages). `generateCss`
 * ignores `text` entirely — it travels the other write path, the HTML patcher,
 * never the generated stylesheet.
 */
export interface PanelState {
  images: Record<string, ImageEdit>;
  styles: Record<string, TextStyleEdit>;
  text: Record<string, TextEdit>;
}

/**
 * What changed as a result of `Store.undo()`, handed to every interaction
 * module so each can repaint exactly the DOM it owns.
 *
 * `text` carries the ready-to-display string directly rather than a key to
 * look up: a text edit undone back to "did not exist" leaves nothing in the
 * store to read that string from — `undo()` is the only place that still has
 * it (the `before` of the pending entry it is about to remove).
 */
export type UndoResult =
  | { kind: 'image'; label: string }
  | { kind: 'style'; id: string }
  | { kind: 'text'; file: string; id: string; text: string };
