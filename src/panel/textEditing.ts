import type { PanelState } from './types';
import type { Store } from './state';
import { MANIFEST } from './manifest';
import { isActive, refreshPanel, onSaveSuccess, onBeforeEditModeOff, onUndo } from './overlay';

/**
 * Mirrors the RAWTEXT denylist in server/htmlPatcher.ts. Duplicated rather
 * than imported: server/ must import nothing from outside itself, and
 * browser-side modules must import nothing from inside server/ (the two
 * tsconfig projects are split on exactly this boundary).
 */
const RAWTEXT_TAGS = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript']);

/**
 * Whether the patcher will actually accept a rewrite of this element's text.
 * Mirrors htmlPatcher.ts's own check exactly: it inspects `childNodes` (any
 * node — a lone comment already counts as "nested markup"), not `children`
 * (element children only), and it refuses every RAWTEXT tag. Offering
 * anything patcherSafe() rejects would let a user type an edit that can never
 * be saved — every Save would throw "contains nested markup".
 */
function patcherSafe(el: HTMLElement): boolean {
  if (RAWTEXT_TAGS.has(el.tagName.toLowerCase())) return false;
  const kids = el.childNodes;
  return kids.length === 0 || (kids.length === 1 && kids[0].nodeType === Node.TEXT_NODE);
}

/**
 * Best-effort primary defense against the element growing structure:
 * browsers that implement `plaintext-only` refuse to let typing or pasting
 * produce anything but text content. Not universally supported — an engine
 * that doesn't recognise the keyword either throws a SyntaxError on the
 * assignment or silently ignores it — so this is deliberately not the only
 * defense. The keydown Enter-guard and the paste handler below are the real
 * floor this depends on regardless of which mode ends up applied here.
 */
function makeEditable(el: HTMLElement): void {
  try {
    el.contentEditable = 'plaintext-only';
  } catch {
    // Unrecognised keyword; fall through to the unconditional 'true' below.
  }
  if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
}

export function installTextEditing(store: Store): void {
  const file = MANIFEST.pageForPath(window.location.pathname);

  // Captured when editing starts, so the saved `before` is what was on the
  // page — which is what the patcher compares against the file. Refreshed
  // after every successful save (see onSaveSuccess below), so a second edit
  // of the same element compares against what is actually now on disk
  // rather than a pre-save value the store already discarded.
  const originals = new WeakMap<HTMLElement, string>();

  /**
   * Undo, mid-typing: recording only ever happened on blur, so Ctrl+Z hit an
   * empty store history while the caret was still in the block — the global
   * hotkey (overlay.ts) still ran, preventDefault and all, but store.undo()
   * had nothing to pop, so it was a silent no-op indistinguishable from
   * nothing happening.
   *
   * Fixed by recording MORE eagerly, on a short pause in typing, rather than
   * by trying to let the browser's own contentEditable undo run and taking
   * over only at block boundaries. That second option would mean detecting
   * "are we still inside the browser's native undo timeline for this block"
   * — which contentEditable does not expose, and which `plaintext-only` mode
   * (used here for the RAWTEXT/paste hardening above) supports even less
   * consistently across engines than ordinary contentEditable does. A
   * debounce is simpler, behaves the same in every browser, and reuses
   * setText/undo exactly as they already work: each debounced tick is just
   * another setText call, and "undoing a second text edit restores the
   * FIRST edit" (already true and already tested in panelState.test.ts)
   * applies here without any change to that logic.
   *
   * Trade-off, stated plainly: a long uninterrupted typing burst that never
   * pauses for DEBOUNCE_MS produces no checkpoint until it does, so the very
   * latest keystrokes of an still-in-flight edit are not yet undo-able — and
   * a long session that pauses often can spend a meaningful share of the
   * 50-entry undo cap (state.ts's HISTORY_CAP) on checkpoints of ONE block,
   * crowding out older, unrelated edits. Both are accepted: the alternative
   * (recording on every keystroke) makes the second problem worse for no
   * gain, and 500ms is short enough that "pause to think, then Ctrl+Z" — the
   * actual complaint — lands on a checkpoint from a moment ago, not minutes.
   *
   * That debounce alone is NOT enough, though — measured directly in Chrome:
   * overlay.ts's keydown listener DOES run first and DOES call
   * preventDefault() on Ctrl+Z, but that does not stop what happens next.
   * Chrome dispatches the native undo command from a path that keydown's
   * preventDefault does not reach — a 'beforeinput' with
   * inputType 'historyUndo' fires and mutates the DOM regardless, so without
   * the listener just below, native undo (removing one native-tracked
   * insertion — NOT the same unit as one of our debounced checkpoints) and
   * our own store-driven undo would BOTH fire off the same keypress and fight
   * over the same text. `beforeinput` is cancelable specifically so a page can
   * pre-empt an edit before it happens (unlike `keydown`'s preventDefault,
   * which only cancels the browser's OWN default handling, and evidently does
   * not count native undo/redo as part of that here) — cancelling historyUndo
   * and historyRedo there is what actually stops it, leaving our own
   * store-backed undo as the only thing that runs.
   */
  const DEBOUNCE_MS = 500;
  const pending = new WeakMap<HTMLElement, ReturnType<typeof window.setTimeout>>();

  /** Cancel a still-pending debounced record for `el`, if any — called right
      before every OTHER path that records `el` (blur, edit-mode-off), so a
      settle point is never recorded twice for the same final text. */
  function cancelPending(el: HTMLElement): void {
    const timer = pending.get(el);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      pending.delete(el);
    }
  }

  function editable(on: boolean): void {
    document.querySelectorAll<HTMLElement>(`[${MANIFEST.editAttr}]`).forEach((el) => {
      if (!on) {
        // Unconditional and unfiltered: an element that grew structure while
        // editing (e.g. a stray <br>/<div> from a keystroke this module
        // failed to intercept) must still stop being editable when edit mode
        // ends. Filtering this on current children — as the offer-side check
        // below does — would leave exactly that element silently typeable
        // with the panel bar hidden, and the next Save would write
        // unreviewed text into the owner's committed copy.
        el.contentEditable = 'false';
        return;
      }
      // Only offer what the patcher will actually accept; there is no point
      // (and active harm — see patcherSafe's doc comment) in offering more.
      if (!patcherSafe(el)) return;
      makeEditable(el);
      if (!originals.has(el)) originals.set(el, el.textContent ?? '');
    });
  }

  document.addEventListener('keydown', (e) => {
    // e.code, not e.key: matches overlay.ts's own hotkey check. Under a
    // non-QWERTY layout (e.g. Cyrillic) e.key is never 'e' even with the
    // physical E key held under Ctrl+Shift, which left the bar toggling on
    // while editing silently never got installed.
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
      // Runs after overlay.ts's own listener has flipped the flag.
      window.setTimeout(() => editable(isActive()), 0);
      return;
    }
    // The explicit floor promised above: whatever `contentEditable` mode
    // ended up applied, Enter must never insert a break of any kind.
    if (e.key === 'Enter') {
      const el = e.target as HTMLElement;
      if (el?.getAttribute?.(MANIFEST.editAttr)) e.preventDefault();
    }
  });

  // See the long comment above DEBOUNCE_MS: this is the half that actually
  // stops native undo/redo from touching a [data-edit] block, since keydown's
  // preventDefault (overlay.ts) does not.
  document.addEventListener('beforeinput', (e) => {
    const el = e.target as HTMLElement;
    if (!el?.getAttribute?.(MANIFEST.editAttr)) return;
    if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') e.preventDefault();
  });

  document.addEventListener('paste', (e) => {
    const el = e.target as HTMLElement;
    if (!el?.getAttribute?.(MANIFEST.editAttr)) return;
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // insertNode can split an existing text node around the insertion point,
    // leaving two or three adjacent text-node siblings; normalize() merges
    // them back into exactly one, which is the invariant patcherSafe() (and
    // the patcher itself) require. Only text/plain is ever read above, so a
    // rich-text paste's markup is dropped rather than reproduced.
    el.normalize();
  });

  /** Record what an element currently reads, if it differs from what it read
      when editing started. Idempotent: running it twice on an unchanged
      element writes the same entry, so a flush followed by the element's own
      focusout cannot double-count or corrupt anything. */
  function record(el: HTMLElement): void {
    const id = el.getAttribute(MANIFEST.editAttr);
    if (id === null) return;
    // No baseline means editing never started on this element (it was not
    // patcher-safe, so `editable(true)` skipped it). Recording it anyway would
    // invent a `before` of '' that the patcher can only reject as stale.
    if (!originals.has(el)) return;
    const before = originals.get(el) ?? '';
    const after = el.textContent ?? '';
    if (before === after) return;
    store.setText(file, id, before, after);
    refreshPanel();
  }

  // The eager half of the debounce described above `pending`: every
  // keystroke reschedules a record() DEBOUNCE_MS after the last one, so a
  // pause in typing — not just a blur — leaves something on the undo stack.
  document.addEventListener('input', (e) => {
    if (!isActive()) return;
    const el = e.target as HTMLElement;
    if (!el?.getAttribute?.(MANIFEST.editAttr)) return;
    cancelPending(el);
    pending.set(
      el,
      window.setTimeout(() => {
        pending.delete(el);
        record(el);
      }, DEBOUNCE_MS),
    );
  });

  document.addEventListener('focusout', (e) => {
    // Edit mode being off must mean nothing gets recorded, full stop — even
    // in the case editable(false) above is specifically written to prevent
    // (an element still contentEditable when it loses focus), this is the
    // second, independent half of that same guarantee.
    if (!isActive()) return;
    const el = e.target as HTMLElement;
    if (!el?.getAttribute?.(MANIFEST.editAttr)) return;
    // Cancel first: a debounce tick firing AFTER this blur's own record()
    // would just write the identical (before, after) pair again, which
    // record()'s before/after check does not catch (both calls, run back to
    // back, would see the same true change) — it would cost a real, wasted
    // second undo step.
    cancelPending(el);
    record(el);
  });

  // Leaving edit mode by hotkey never blurs anything: the element stays
  // focused, `contentEditable` is set to 'false' under it, and the focusout
  // that eventually fires is gated on an isActive() that is already false. So
  // the text just typed was silently thrown away unless Save happened to be
  // clicked first (which DOES blur, which is why the happy path hid this).
  // Flushing here, while edit mode is still on, makes leaving edit mode record
  // what was typed rather than drop it.
  onBeforeEditModeOff(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el?.getAttribute?.(MANIFEST.editAttr)) return;
    cancelPending(el); // same double-record reasoning as focusout's above
    record(el);
  });

  // A successful save writes `after` to disk for every text edit it just
  // sent. Without this, editing the same element again compares against the
  // pre-save `before` — which no longer matches disk — and the very next
  // Save throws a "the file changed on disk" the user cannot clear by
  // reloading, since the store re-persists the (now doubly stale) edit to
  // localStorage before the reload ever lands.
  onSaveSuccess((state: PanelState) => {
    for (const t of Object.values(state.text)) {
      if (t.file !== file) continue; // a different page's pending edit
      const el = document.querySelector<HTMLElement>(`[${MANIFEST.editAttr}="${CSS.escape(t.id)}"]`);
      if (el) originals.set(el, t.after);
    }
  });

  // Undo repaints the DOM straight from the result's own `text`, not from
  // `store.get().text` — a text edit undone back to "did not exist" leaves
  // nothing in the store to read, so undo() hands the restored string over
  // directly (see state.ts). `originals` is deliberately left untouched: it
  // tracks what is actually on disk, which undo never changes, so the next
  // edit's `before` still compares against reality rather than this reverted
  // on-screen value.
  onUndo((result) => {
    if (result.kind !== 'text' || result.file !== file) return;
    const el = document.querySelector<HTMLElement>(`[${MANIFEST.editAttr}="${CSS.escape(result.id)}"]`);
    if (el) el.textContent = result.text;
  });
}
