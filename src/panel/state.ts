import type { PanelState, ImageEdit, TextStyleEdit, TextEdit, FontKey, StepKey, ColorKey } from './types';
import { clampFraming } from './cssGenerator';

const KEY = 'panel:state';

/**
 * The half of the panel's state that has ALREADY been written to
 * `layout.generated.css` by an earlier Save.
 *
 * It exists because path 1 is a whole-file write: `generateCss` is handed a
 * state and the endpoint replaces the file with the result. If the store threw
 * everything away on Save, the next Save — even a text-only one — would emit a
 * file containing nothing but the header and silently delete every framing and
 * typography rule ever saved. Keeping a `saved` half means the generated file
 * is always regenerated from the FULL set of decisions, while `dirtyCount()`
 * keeps meaning "unsaved changes" by counting only the `pending` half.
 *
 * There is no `text` here by construction: a saved text edit lives in the real
 * HTML, and re-applying it on the next Save would be wrong (the patcher would
 * reject it as stale, since `before` no longer matches the file).
 */
export interface SavedState {
  images: Record<string, ImageEdit>;
  styles: Record<string, TextStyleEdit>;
}

function emptyPanelState(): PanelState {
  return { images: {}, styles: {}, text: {} };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Own enumerable entries of a plain object, with `__proto__` stripped.
 *
 * `JSON.parse` can produce `__proto__` as an own enumerable property; nothing
 * downstream should ever see it, so it is dropped at the one place untrusted
 * data enters. Anything that is not a plain object yields no entries at all,
 * which is how a wrong-typed or array-shaped field gets discarded rather than
 * trusted.
 */
function safeEntries(value: unknown): Array<[string, unknown]> {
  if (!isPlainObject(value)) return [];
  return Object.entries(value).filter(([k]) => k !== '__proto__');
}

function sanitizeImages(raw: unknown): Record<string, ImageEdit> {
  const out: Record<string, ImageEdit> = {};
  for (const [label, edit] of safeEntries(raw)) {
    if (!isPlainObject(edit)) continue;
    const { x, y, zoom } = edit;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof zoom !== 'number') continue;
    // Same clamp the setter applies, so a hand-edited or corrupted mirror can
    // never put a framing into state that the setter itself would refuse.
    out[label] = clampFraming(x, y, zoom);
  }
  return out;
}

function sanitizeStyles(raw: unknown): Record<string, TextStyleEdit> {
  const out: Record<string, TextStyleEdit> = {};
  for (const [id, patch] of safeEntries(raw)) {
    if (!isPlainObject(patch)) continue;
    const clean: TextStyleEdit = {};
    // Only the shape is checked here; `generateCss` is the one place that
    // decides whether a token NAME is real, and it already refuses anything
    // outside its allowlists.
    if (typeof patch.font === 'string') clean.font = patch.font as FontKey;
    if (typeof patch.step === 'string') clean.step = patch.step as StepKey;
    if (typeof patch.color === 'string') clean.color = patch.color as ColorKey;
    if (Object.keys(clean).length > 0) out[id] = clean;
  }
  return out;
}

function sanitizeText(raw: unknown): Record<string, TextEdit> {
  const out: Record<string, TextEdit> = {};
  for (const [key, edit] of safeEntries(raw)) {
    if (!isPlainObject(edit)) continue;
    const { file, id, before, after } = edit;
    if (
      typeof file !== 'string' ||
      typeof id !== 'string' ||
      typeof before !== 'string' ||
      typeof after !== 'string'
    ) {
      continue;
    }
    out[key] = { file, id, before, after };
  }
  return out;
}

interface Loaded {
  pending: PanelState;
  saved: SavedState;
}

function load(): Loaded {
  const empty: Loaded = { pending: emptyPanelState(), saved: { images: {}, styles: {} } };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    // Corrupt or stale shapes are discarded rather than trusted: an unsaved
    // session is cheap to lose, a mangled save is not.
    if (!isPlainObject(parsed)) return empty;
    // `saved` rides in the same record, through the same sanitizers, so it
    // survives a reload with exactly the guarantees the pending half has. A
    // mirror written before `saved` existed simply has none, which loads as
    // empty — the pre-existing behaviour, not a crash.
    const savedRaw = isPlainObject(parsed.saved) ? parsed.saved : {};
    return {
      pending: {
        images: sanitizeImages(parsed.images),
        styles: sanitizeStyles(parsed.styles),
        text: sanitizeText(parsed.text),
      },
      saved: {
        images: sanitizeImages(savedRaw.images),
        styles: sanitizeStyles(savedRaw.styles),
      },
    };
  } catch {
    return empty;
  }
}

export interface Store {
  /**
   * Everything the panel knows, saved and pending merged — this is what
   * `generateCss` must be handed, so a Save rewrites the generated stylesheet
   * from the full set of decisions rather than only the newest ones. `text` is
   * pending-only: saved text lives in the HTML, never in this state.
   */
  get(): PanelState;
  setImage(label: string, edit: ImageEdit): void;
  setStyle(id: string, patch: TextStyleEdit): void;
  setText(file: string, id: string, before: string, after: string): void;
  /** Forget one pending text edit — the escape hatch for an edit the patcher refuses. */
  dropText(file: string, id: string): void;
  /** Unsaved changes only. The badge means "pending", never "total edits ever". */
  dirtyCount(): number;
  /**
   * Promote the pending framing/typography edits into the saved half and drop
   * the pending text edits. Called after a successful Save: the CSS rules are
   * still needed to regenerate the file next time, the text edits are now in
   * the HTML and must never be re-applied.
   */
  commit(): void;
  /** Forget everything, saved half included. The full reset, not what Save uses. */
  clear(): void;
}

export function createStore(initial?: PanelState): Store {
  const loaded = load();
  // An explicit `initial` seeds the PENDING half only — it describes work not
  // yet written, which is what a caller handing in a state means by it.
  let pending: PanelState = initial ?? loaded.pending;
  let saved: SavedState = initial ? { images: {}, styles: {} } : loaded.saved;

  function persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...pending, saved }));
    } catch {
      // A full or blocked storage must not break editing; the session simply
      // stops surviving reloads.
    }
  }

  /** Saved ∪ pending, pending winning. Styles merge per id so a colour picked
      today does not erase a font saved yesterday on the same block. */
  function unionImages(): Record<string, ImageEdit> {
    const out: Record<string, ImageEdit> = {};
    for (const [k, v] of Object.entries(saved.images)) out[k] = { ...v };
    for (const [k, v] of Object.entries(pending.images)) out[k] = { ...v };
    return out;
  }

  function unionStyles(): Record<string, TextStyleEdit> {
    const out: Record<string, TextStyleEdit> = {};
    for (const [k, v] of Object.entries(saved.styles)) out[k] = { ...v };
    for (const [k, v] of Object.entries(pending.styles)) out[k] = { ...out[k], ...v };
    return out;
  }

  return {
    get() {
      // A deep copy: callers must not be able to bypass the setters (and
      // persist()) by mutating the returned reference, and a snapshot captured
      // before a commit() must not observe the commit. The leaves are flat
      // objects of primitives, so a spread per entry is sufficient.
      return {
        images: unionImages(),
        styles: unionStyles(),
        text: Object.fromEntries(Object.entries(pending.text).map(([k, v]) => [k, { ...v }])),
      };
    },
    setImage(label, edit) {
      pending.images[label] = clampFraming(edit.x, edit.y, edit.zoom);
      persist();
    },
    setStyle(id, patch) {
      pending.styles[id] = { ...pending.styles[id], ...patch };
      persist();
    },
    setText(file, id, before, after) {
      pending.text[`${file}::${id}`] = { file, id, before, after };
      persist();
    },
    dropText(file, id) {
      delete pending.text[`${file}::${id}`];
      persist();
    },
    dirtyCount() {
      return (
        Object.keys(pending.images).length +
        Object.keys(pending.styles).length +
        Object.keys(pending.text).length
      );
    },
    commit() {
      saved = { images: unionImages(), styles: unionStyles() };
      pending = emptyPanelState();
      persist();
    },
    clear() {
      pending = emptyPanelState();
      saved = { images: {}, styles: {} };
      try { localStorage.removeItem(KEY); } catch { /* see persist() */ }
    },
  };
}
