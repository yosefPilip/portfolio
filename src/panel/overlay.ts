import type { Store } from './state';
import type { PanelState } from './types';
import { generateCss } from './cssGenerator';
import { MANIFEST } from './manifest';
import { save, isSaveError } from './saveClient';

let mounted = false;
let active = false;
let refreshFn: (() => void) | null = null;
// A list, not a single slot: a second registrant must not silently replace
// (and thereby unregister) the first the way a bare variable would.
let deactivateFns: Array<() => void> = [];
let beforeDeactivateFns: Array<() => void> = [];
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
      // commit(), not clear(): the framing and typography just written are
      // still needed to regenerate layout.generated.css on the NEXT save,
      // which is a whole-file write. Clearing them made a later text-only
      // save emit a bare header and delete every rule ever saved. The text
      // edits are dropped here — they are in the HTML now.
      store.commit();
      saveBtn.textContent = 'Saved';
    } catch (err) {
      saveBtn.textContent = 'Failed';
      const message = (err as Error).message;
      // Surfaced loudly: a silent save failure would let work be lost on reload.
      console.error('[panel] save failed:', message);
      const stale = isSaveError(err) ? err.stale : [];
      if (stale.length === 0) {
        window.alert(`Panel save failed:\n\n${message}`);
      } else if (
        // The one failure with no other way out: a stale text edit is
        // re-hydrated from localStorage on reload, so every later Save —
        // including one that only carries image framing — 400s forever.
        // Discarding is offered, never done silently: these are the owner's
        // own words, and losing them without a yes is worse than the wedge.
        window.confirm(
          `Panel save failed:\n\n${message}\n\n` +
            `Discard ${stale.length === 1 ? 'this text edit' : `these ${stale.length} text edits`} ` +
            `and keep everything else?\n\n${stale.map((s) => `  • ${s.id}  (${s.path})`).join('\n')}`,
        )
      ) {
        stale.forEach((s) => store.dropText(s.path, s.id));
        console.warn('[panel] discarded stale text edits:', stale.map((s) => s.id).join(', '));
      }
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
    // BEFORE the flag flips: a module holding an edit that only exists in the
    // DOM (text typed into a still-focused contentEditable) has to commit it
    // to the store while edit mode is still on. Every downstream recorder is
    // gated on isActive(), so anything flushed after the flip is dropped —
    // which is exactly how typing then hotkeying out lost the edit.
    if (active) beforeDeactivateFns.forEach((fn) => fn());
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

/** Registered by an interaction module holding an edit that lives only in the
    DOM until something records it. Called while edit mode is still ON, just
    before it is switched off, so the edit reaches the store instead of being
    dropped by the isActive() gates every recorder sits behind. A list, for the
    same reason `onEditModeOff` is. */
export function onBeforeEditModeOff(fn: () => void): void {
  beforeDeactivateFns.push(fn);
}

/** Registered by an interaction module that needs to know exactly what a
    successful Save just wrote, so it can keep its own "what's actually on
    disk" bookkeeping in step (textEditing.ts's `originals` map). Called with
    the state that was saved, after the request succeeds but before the store
    is cleared. A list for the same reason `onEditModeOff` is. */
export function onSaveSuccess(fn: (state: PanelState) => void): void {
  saveSuccessFns.push(fn);
}
