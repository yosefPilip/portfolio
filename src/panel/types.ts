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
