import type { StepKey, ColorKey } from './types';
import type { Store } from './state';
import { MANIFEST } from './manifest';
import { isActive, refreshPanel } from './overlay';
import { contrastRatio } from '../lib/contrast';

/**
 * The smallest px each step can render at, read off the clamp() minimums in
 * tokens.css. Used for the tracking rule, which is about rendered size.
 */
const STEP_MIN_PX: Record<StepKey, number> = {
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

/** Resolved token values, mirrored from tokens.css for the live contrast check. */
const FG: Record<ColorKey, string> = {
  fg: '#f0efe9',
  'fg-dim': '#c2c4bc',
  muted: '#8e958a',
  accent: '#cf6b3e',
  'accent-2': '',
};

const ROOM_BG: Record<string, string> = {
  home: '#171b19',
  projects: '#16191d',
  music: '#1a171d',
  workshop: '#1b1917',
};

const ROOM_ACCENT2: Record<string, string> = {
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

export function installStyleControls(store: Store): void {
  const room = document.body.dataset.room ?? 'home';

  const box = document.createElement('div');
  box.className = 'panel-controls';
  box.hidden = true;
  document.body.appendChild(box);

  let target: HTMLElement | null = null;

  function select(el: HTMLElement): void {
    target = el;
    const id = el.getAttribute(MANIFEST.editAttr)!;
    box.innerHTML = '';

    box.append(row('Font', MANIFEST.fonts, (v) => { store.setStyle(id, { font: v }); refreshPanel(); }));
    box.append(row('Size', MANIFEST.steps, (v) => { store.setStyle(id, { step: v }); refreshPanel(); }));
    box.append(
      row(
        'Colour',
        // Only tokens that actually clear contrast in THIS room are offered, so
        // an unreadable combination cannot be chosen in the first place.
        MANIFEST.colors.filter((c) => colorAllowed(c, room)),
        (v) => { store.setStyle(id, { color: v }); refreshPanel(); },
      ),
    );
    box.hidden = false;
  }

  function row<T extends string>(label: string, values: T[], onPick: (v: T) => void): HTMLElement {
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
        if (target) applyLive(target, label, v);
      });
      wrap.appendChild(b);
    }
    return wrap;
  }

  function applyLive(el: HTMLElement, label: string, v: string): void {
    if (label === 'Font') el.style.fontFamily = `var(--font-${v})`;
    if (label === 'Size') el.style.fontSize = `var(--step-${v})`;
    if (label === 'Colour') el.style.color = `var(--${v})`;
  }

  document.addEventListener('click', (e) => {
    if (!isActive()) return;
    const el = (e.target as Element).closest?.(`[${MANIFEST.editAttr}]`) as HTMLElement | null;
    if (!el) return;
    select(el);
  });
}
