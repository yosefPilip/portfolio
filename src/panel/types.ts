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

/**
 * Everything the panel can express as CSS.
 *
 * `images` is keyed by the frame's `data-label`; `styles` by the element's
 * `data-edit` id. Text *content* is deliberately absent — it travels the other
 * write path and never touches this file.
 */
export interface PanelState {
  images: Record<string, ImageEdit>;
  styles: Record<string, TextStyleEdit>;
}
