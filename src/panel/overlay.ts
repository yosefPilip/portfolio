import type { Store } from './state';
import { generateCss } from './cssGenerator';
import { MANIFEST } from './manifest';
import { save } from './saveClient';

let mounted = false;
let active = false;

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

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      await save([{ path: MANIFEST.generatedCssPath, contents: generateCss(store.get()) }]);
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
    if (!(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e')) return;
    e.preventDefault();
    active = !active;
    bar.hidden = !active;
    document.documentElement.classList.toggle('panel-active', active);
    refresh();
  });

  refresh();
}

/** Whether edit mode is currently on. Read by the interaction modules. */
export function isActive(): boolean {
  return active;
}
