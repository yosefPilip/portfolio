import type { Store } from './state';
import type { PanelState } from './types';
import { generateCss } from './cssGenerator';
import { MANIFEST } from './manifest';
import { save } from './saveClient';

let mounted = false;
let active = false;
let refreshFn: (() => void) | null = null;
// A list, not a single slot: a second registrant must not silently replace
// (and thereby unregister) the first the way a bare variable would.
let deactivateFns: Array<() => void> = [];
let saveSuccessFns: Array<(state: PanelState) => void> = [];

/** Takes the store rather than creating one: the interaction modules added in
    later tasks must share this exact instance, not a second copy. */
export function mountPanel(store: Store): void {
  if (mounted) return;
  mounted = true;

  const bar = document.createElement('div');
  bar.className = 'panel-bar';
  bar.hidden = true;

  const badge = document.createElement('span');
  badge.className = 'panel-bar__badge';
  badge.textContent = 'EDIT';

  const count = document.createElement('span');
  count.className = 'panel-bar__count';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'panel-bar__save';
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';

  bar.append(badge, count, saveBtn);
  document.body.appendChild(bar);

  function refresh(): void {
    const n = store.dirtyCount();
    count.textContent = n === 0 ? 'no changes' : `${n} pending`;
    saveBtn.disabled = n === 0;
  }
  refreshFn = refresh;

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const state = store.get();
      await save(
        [{ path: MANIFEST.generatedCssPath, contents: generateCss(state) }],
        Object.values(state.text).map((t) => ({ path: t.file, id: t.id, before: t.before, after: t.after })),
      );
      // Before clearing: modules that track their own "what's on disk"
      // baseline (textEditing.ts's `originals`) need to know exactly what
      // this save just wrote, so a second edit compares against reality
      // instead of a now-stale pre-save value.
      saveSuccessFns.forEach((fn) => fn(state));
      store.clear();
      saveBtn.textContent = 'Saved';
    } catch (err) {
      saveBtn.textContent = 'Failed';
      // Surfaced loudly: a silent save failure would let work be lost on reload.
      console.error('[panel] save failed:', (err as Error).message);
      window.alert(`Panel save failed:\n\n${(err as Error).message}`);
    } finally {
      window.setTimeout(() => { saveBtn.textContent = 'Save'; refresh(); }, 1200);
    }
  });

  document.addEventListener('keydown', (e) => {
    // e.code names the physical key, not the character it produces, so this
    // still fires under a non-QWERTY layout (e.g. Cyrillic) where e.key would
    // never be 'e' even with the physical E key held under Ctrl+Shift.
    if (!(e.ctrlKey && e.shiftKey && e.code === 'KeyE')) return;
    e.preventDefault();
    active = !active;
    bar.hidden = !active;
    document.documentElement.classList.toggle('panel-active', active);
    refresh();
    // Interaction modules with their own persistent UI (the typography/colour
    // control box) must not linger with a stale target once edit mode is off.
    if (!active) deactivateFns.forEach((fn) => fn());
  });

  refresh();
}

/** Whether edit mode is currently on. Read by the interaction modules. */
export function isActive(): boolean {
  return active;
}

/** Called by the interaction modules after they write to the store, so the
    badge's pending count and the Save button's disabled state pick up the
    change immediately instead of waiting for the next hotkey toggle. A no-op
    before the panel has mounted. */
export function refreshPanel(): void {
  refreshFn?.();
}

/** Registered by an interaction module that keeps its own on-screen state
    (a selected element, an open control box) alive independent of the bar.
    Called once edit mode is switched off, so that state is cleared rather
    than left showing a target no longer being edited. Every registration is
    kept and called — unlike `refreshFn` above, this is a list, since a
    second registrant must not silently drop the first. */
export function onEditModeOff(fn: () => void): void {
  deactivateFns.push(fn);
}

/** Registered by an interaction module that needs to know exactly what a
    successful Save just wrote, so it can keep its own "what's actually on
    disk" bookkeeping in step (textEditing.ts's `originals` map). Called with
    the state that was saved, after the request succeeds but before the store
    is cleared. A list for the same reason `onEditModeOff` is. */
export function onSaveSuccess(fn: (state: PanelState) => void): void {
  saveSuccessFns.push(fn);
}
