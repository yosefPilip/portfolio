import type { Store } from './state';
import { MANIFEST } from './manifest';
import { isActive, refreshPanel } from './overlay';

export function installTextEditing(store: Store): void {
  const file = MANIFEST.pageForPath(window.location.pathname);

  // Captured when editing starts, so the saved `before` is what was on the
  // page — which is what the patcher compares against the file.
  const originals = new WeakMap<HTMLElement, string>();

  function editable(on: boolean): void {
    document.querySelectorAll<HTMLElement>(`[${MANIFEST.editAttr}]`).forEach((el) => {
      // Only plain-text elements are offered; the patcher refuses the rest, so
      // there is no point letting them be typed into.
      if (el.children.length > 0) return;
      el.contentEditable = on ? 'true' : 'false';
      if (on && !originals.has(el)) originals.set(el, el.textContent ?? '');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
      // Runs after overlay.ts has flipped the flag.
      window.setTimeout(() => editable(isActive()), 0);
    }
  });

  document.addEventListener('focusout', (e) => {
    const el = e.target as HTMLElement;
    if (!el?.getAttribute?.(MANIFEST.editAttr)) return;
    const id = el.getAttribute(MANIFEST.editAttr)!;
    const before = originals.get(el) ?? '';
    const after = el.textContent ?? '';
    if (before === after) return;
    store.setText(file, id, before, after);
    refreshPanel();
  });
}
