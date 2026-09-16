import type { StepKey, ColorKey } from './types';
import type { Store } from './state';
import { MANIFEST } from './manifest';
import { isActive, refreshPanel, onEditModeOff } from './overlay';
import { contrastRatio } from '../lib/contrast';

/**
 * The smallest px each step can render at, read off the clamp() minimums in
 * tokens.css. Used for the tracking rule, which is about rendered size.
 */
export const STEP_MIN_PX: Record<StepKey, number> = {
  wordmark: 38,
  display: 56,
  h1: 40,
  h2: 28,
  lede: 19,
  body: 17,
  meta: 12,
};

/** Type at 32px and above never takes negative tracking. */
export function trackingAllowed(step: StepKey, tracking: number): boolean {
  if (tracking >= 0) return true;
  return STEP_MIN_PX[step] < 32;
}

/**
 * Resolved token values, mirrored from tokens.css for the live contrast check.
 *
 * Exported so tests/panelTokenMirror.test.ts can hold them against the real
 * stylesheet: mirrors drift, and a mirror that drifts here keeps offering a
 * colour the room no longer passes.
 */
export const FG: Record<ColorKey, string> = {
  fg: '#f0efe9',
  'fg-dim': '#c2c4bc',
  muted: '#8e958a',
  accent: '#cf6b3e',
  'accent-2': '',
};

export const ROOM_BG: Record<string, string> = {
  home: '#171b19',
  projects: '#16191d',
  music: '#1a171d',
  workshop: '#1b1917',
};

export const ROOM_ACCENT2: Record<string, string> = {
  home: '#8aa572',
  projects: '#7f9bbd',
  music: '#b97fc9',
  workshop: '#c0a06a',
};

/** Whether a token clears the 4.5:1 body-text gate against the room's ground. */
export function colorAllowed(color: ColorKey, room: string): boolean {
  const bg = ROOM_BG[room];
  if (!bg) return false;
  const fg = color === 'accent-2' ? ROOM_ACCENT2[room] : FG[color];
  if (!fg) return false;
  return contrastRatio(fg, bg) >= 4.5;
}

/**
 * What a control row writes back, independent of its human-readable label.
 * `applyLive` switches on this, never on the label string, so renaming a
 * label (e.g. 'Colour' -> 'Color') is a copy edit, not a silent behaviour
 * change, and passing the wrong one is a compile error rather than a no-op.
 */
type ControlKind = 'font' | 'step' | 'color';

export function installStyleControls(store: Store): void {
  const room = document.body.dataset.room ?? 'home';

  const box = document.createElement('div');
  box.className = 'panel-controls';
  box.hidden = true;
  document.body.appendChild(box);

  let target: HTMLElement | null = null;

  function select(el: HTMLElement): void {
    // Selecting the element already selected would wipe box.innerHTML and
    // rebuild all three rows for no reason; once [data-edit] elements become
    // contentEditable (a later task) this would fire on every caret move
    // inside already-selected text mid-edit.
    if (target === el) return;

    const id = el.getAttribute(MANIFEST.editAttr);
    // A real guard rather than a `!` assertion: `el` is only ever handed in
    // from a `.closest('[data-edit]')` match today, so this never trips, but
    // a future caller that hands in some other element now fails loudly
    // instead of writing state under the string "null".
    if (id === null) return;

    target = el;
    box.innerHTML = '';

    box.append(row('Font', 'font', MANIFEST.fonts, (v) => { store.setStyle(id, { font: v }); refreshPanel(); }));
    box.append(row('Size', 'step', MANIFEST.steps, (v) => { store.setStyle(id, { step: v }); refreshPanel(); }));
    box.append(
      row(
        'Colour',
        'color',
        // Only tokens that actually clear contrast in THIS room are offered, so
        // an unreadable combination cannot be chosen in the first place.
        MANIFEST.colors.filter((c) => colorAllowed(c, room)),
        (v) => { store.setStyle(id, { color: v }); refreshPanel(); },
      ),
    );
    box.hidden = false;
  }

  function row<T extends string>(
    label: string,
    kind: ControlKind,
    values: T[],
    onPick: (v: T) => void,
  ): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'panel-controls__row';
    const name = document.createElement('span');
    name.textContent = label;
    wrap.appendChild(name);
    for (const v of values) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = v;
      b.addEventListener('click', () => {
        onPick(v);
        if (target) applyLive(target, kind, v);
      });
      wrap.appendChild(b);
    }
    return wrap;
  }

  function applyLive(el: HTMLElement, kind: ControlKind, v: string): void {
    // The next task makes [data-edit] elements contentEditable; once it does,
    // a stale `target` that has since left the document must not silently
    // write a live style nobody can see.
    if (!document.contains(el)) return;
    switch (kind) {
      case 'font': el.style.fontFamily = `var(--font-${v})`; break;
      case 'step': el.style.fontSize = `var(--step-${v})`; break;
      case 'color': el.style.color = `var(--${v})`; break;
    }
  }

  document.addEventListener('click', (e) => {
    if (!isActive()) return;
    const el = (e.target as Element).closest?.(`[${MANIFEST.editAttr}]`) as HTMLElement | null;
    if (!el) return;
    select(el);
  });

  // Leaving edit mode must hide the box and drop the stale target — otherwise
  // it stays on screen pointing at an element nobody is editing anymore, and
  // (since `select` no-ops when `target === el`) re-entering edit mode and
  // clicking the same element again would silently fail to reopen it.
  onEditModeOff(() => {
    box.hidden = true;
    target = null;
  });
}
