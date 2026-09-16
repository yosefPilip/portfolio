import type { PanelState } from './types';
import type { Store } from './state';
import { MANIFEST } from './manifest';
import { isActive, refreshPanel, onSaveSuccess } from './overlay';

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

  document.addEventListener('focusout', (e) => {
    // Edit mode being off must mean nothing gets recorded, full stop — even
    // in the case editable(false) above is specifically written to prevent
    // (an element still contentEditable when it loses focus), this is the
    // second, independent half of that same guarantee.
    if (!isActive()) return;
    const el = e.target as HTMLElement;
    if (!el?.getAttribute?.(MANIFEST.editAttr)) return;
    const id = el.getAttribute(MANIFEST.editAttr)!;
    const before = originals.get(el) ?? '';
    const after = el.textContent ?? '';
    if (before === after) return;
    store.setText(file, id, before, after);
    refreshPanel();
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
}
