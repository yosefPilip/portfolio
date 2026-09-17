import type { PanelState, ImageEdit, TextStyleEdit, TextEdit, FontKey, StepKey, ColorKey, UndoResult } from './types';
import { clampFraming } from './cssGenerator';

const KEY = 'panel:state';

/** 50 is plenty for a dev tool's session-local undo — see the design note on
    `history` inside `createStore`. */
const HISTORY_CAP = 50;

/**
 * One undo-able change, holding what the slot/id read as BEFORE the edit that
 * pushed this entry — `undefined` means it did not exist before that edit.
 * `undo()` pops the most recent entry and restores exactly this.
 */
type HistoryEntry =
  | { kind: 'image'; label: string; prev: ImageEdit | undefined }
  | { kind: 'style'; id: string; prev: TextStyleEdit | undefined }
  | { kind: 'text'; file: string; id: string; prev: TextEdit | undefined }
  /** A dropped preview image. Unlike the other three kinds this never has a
      matching `pending`/`saved` entry — a preview is DOM-only and never
      reaches PanelState (see MANIFEST/imageEditing's drop handling) — so
      there is nothing to apply here beyond handing the snapshot back to
      whichever module actually owns the <img> repaint. */
  | { kind: 'imagePreview'; label: string; prevSrc: string; prevMissing: boolean; prevPreviewName: string | undefined };

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
    const { x, y, zoom, panX, panY } = edit;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof zoom !== 'number') continue;
    // Same clamp the setter applies, so a hand-edited or corrupted mirror can
    // never put a framing into state that the setter itself would refuse.
    out[label] = clampFraming(x, y, zoom, typeof panX === 'number' ? panX : 0, typeof panY === 'number' ? panY : 0);
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
  /**
   * Push an undo checkpoint for a dropped preview image, WITHOUT writing
   * anything into `pending`/`saved` — a preview never reaches PanelState (see
   * `ImageEdit`'s doc comment), so there is nothing for this call to persist.
   * `prev*` is exactly what the frame's <img> looked like right before the
   * drop being recorded; `undo()` hands it straight back for imageEditing.ts
   * to repaint from.
   */
  recordImagePreview(label: string, prevSrc: string, prevMissing: boolean, prevPreviewName: string | undefined): void;
  /** Unsaved changes only. The badge means "pending", never "total edits ever". */
  dirtyCount(): number;
  /** Whether there is at least one change `undo()` can act on. Drives the
      Undo button's disabled state. */
  canUndo(): boolean;
  /**
   * Undo the most recent image, style or text change, restoring it through
   * the same setters an ordinary edit would use — so clamping and persistence
   * still apply, and an undone value that was already Saved becomes pending
   * again rather than silently reverting only on screen. A safe no-op,
   * returning null, when there is nothing to undo.
   */
  undo(): UndoResult | null;
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

  // Session-local only — not mirrored to localStorage. A reload losing undo
  // history is an acceptable trade for not doubling every persisted write;
  // nothing in the spec asks undo to survive a reload. Capped at HISTORY_CAP
  // so an unbounded editing session cannot grow this forever.
  let history: HistoryEntry[] = [];

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

  /** The merged (saved ∪ pending) value for one image slot, or undefined if
      neither half has ever set it — exactly what "did not exist before"
      means for an undo entry. */
  function currentImage(label: string): ImageEdit | undefined {
    const v = pending.images[label] ?? saved.images[label];
    return v ? { ...v } : undefined;
  }

  /** The merged style object for one id, or undefined if it has no fields at
      all — same "did not exist before" meaning as currentImage. */
  function currentStyle(id: string): TextStyleEdit | undefined {
    const merged: TextStyleEdit = { ...saved.styles[id], ...pending.styles[id] };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  function pushHistory(entry: HistoryEntry): void {
    history.push(entry);
    if (history.length > HISTORY_CAP) history.shift();
  }

  // The actual mutations, shared between the public setters (which record
  // history first) and undo() (which must NOT — recording undo's own action
  // would just make Ctrl+Z toggle between two states instead of walking back
  // through the stack).
  function applyImage(label: string, edit: ImageEdit): void {
    pending.images[label] = clampFraming(edit.x, edit.y, edit.zoom, edit.panX ?? 0, edit.panY ?? 0);
    persist();
  }

  function removeImage(label: string): void {
    delete pending.images[label];
    persist();
  }

  function applyStyleMerge(id: string, patch: TextStyleEdit): void {
    pending.styles[id] = { ...pending.styles[id], ...patch };
    persist();
  }

  /** Full replace rather than merge — the only way to make a style id forget
      a field, which undoing a single style click can require (e.g. undoing
      the colour pick must not leave the colour behind because setStyle only
      ever merges keys in). */
  function applyStyleReplace(id: string, style: TextStyleEdit | undefined): void {
    if (style === undefined) delete pending.styles[id];
    else pending.styles[id] = { ...style };
    persist();
  }

  function applyText(file: string, id: string, before: string, after: string): void {
    pending.text[`${file}::${id}`] = { file, id, before, after };
    persist();
  }

  function removeText(key: string): void {
    delete pending.text[key];
    persist();
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
      pushHistory({ kind: 'image', label, prev: currentImage(label) });
      applyImage(label, edit);
    },
    setStyle(id, patch) {
      pushHistory({ kind: 'style', id, prev: currentStyle(id) });
      applyStyleMerge(id, patch);
    },
    setText(file, id, before, after) {
      const key = `${file}::${id}`;
      const prev = pending.text[key] ? { ...pending.text[key] } : undefined;
      pushHistory({ kind: 'text', file, id, prev });
      applyText(file, id, before, after);
    },
    dropText(file, id) {
      // Not recorded in undo history: this is the stale-save escape hatch,
      // not a normal editing action a user would expect Ctrl+Z to reach.
      removeText(`${file}::${id}`);
    },
    recordImagePreview(label, prevSrc, prevMissing, prevPreviewName) {
      // No persist(): a preview is session-DOM-only by design (see the type's
      // doc comment), and `history` itself is already session-local only —
      // see the design note where it is declared above.
      pushHistory({ kind: 'imagePreview', label, prevSrc, prevMissing, prevPreviewName });
    },
    dirtyCount() {
      return (
        Object.keys(pending.images).length +
        Object.keys(pending.styles).length +
        Object.keys(pending.text).length
      );
    },
    canUndo() {
      return history.length > 0;
    },
    undo() {
      const h = history.pop();
      if (!h) return null;
      if (h.kind === 'image') {
        if (h.prev) applyImage(h.label, h.prev);
        else removeImage(h.label);
        return { kind: 'image', label: h.label };
      }
      if (h.kind === 'style') {
        applyStyleReplace(h.id, h.prev);
        return { kind: 'style', id: h.id };
      }
      if (h.kind === 'imagePreview') {
        // Nothing to mutate here — see recordImagePreview's doc comment.
        // imageEditing.ts's onUndo handler does the actual repaint/revoke.
        return {
          kind: 'imagePreview',
          label: h.label,
          prevSrc: h.prevSrc,
          prevMissing: h.prevMissing,
          prevPreviewName: h.prevPreviewName,
        };
      }
      // Text: read what is about to be overwritten/removed BEFORE mutating —
      // when there is no earlier pending entry to restore (h.prev undefined),
      // that current entry's `before` is the only place the original,
      // pre-edit text still lives.
      const key = `${h.file}::${h.id}`;
      const curBefore = pending.text[key]?.before ?? '';
      if (h.prev) {
        applyText(h.prev.file, h.prev.id, h.prev.before, h.prev.after);
        return { kind: 'text', file: h.file, id: h.id, text: h.prev.after };
      }
      removeText(key);
      return { kind: 'text', file: h.file, id: h.id, text: curBefore };
    },
    commit() {
      saved = { images: unionImages(), styles: unionStyles() };
      pending = emptyPanelState();
      persist();
    },
    clear() {
      pending = emptyPanelState();
      saved = { images: {}, styles: {} };
      history = [];
      try { localStorage.removeItem(KEY); } catch { /* see persist() */ }
    },
  };
}
