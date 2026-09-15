import type { PanelState, ImageEdit, TextStyleEdit } from './types';
import { clampFraming } from './cssGenerator';

const KEY = 'panel:state';

function load(): PanelState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { images: {}, styles: {} };
    const parsed = JSON.parse(raw) as PanelState;
    // Corrupt or stale shapes are discarded rather than trusted: an unsaved
    // session is cheap to lose, a mangled save is not.
    if (!parsed || typeof parsed !== 'object' || !parsed.images || !parsed.styles) {
      return { images: {}, styles: {} };
    }
    return parsed;
  } catch {
    return { images: {}, styles: {} };
  }
}

export interface Store {
  get(): PanelState;
  setImage(label: string, edit: ImageEdit): void;
  setStyle(id: string, patch: TextStyleEdit): void;
  dirtyCount(): number;
  clear(): void;
}

export function createStore(initial?: PanelState): Store {
  let state: PanelState = initial ?? load();

  function persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // A full or blocked storage must not break editing; the session simply
      // stops surviving reloads.
    }
  }

  return {
    get: () => state,
    setImage(label, edit) {
      state.images[label] = clampFraming(edit.x, edit.y, edit.zoom);
      persist();
    },
    setStyle(id, patch) {
      state.styles[id] = { ...state.styles[id], ...patch };
      persist();
    },
    dirtyCount: () => Object.keys(state.images).length + Object.keys(state.styles).length,
    clear() {
      state = { images: {}, styles: {} };
      try { localStorage.removeItem(KEY); } catch { /* see persist() */ }
    },
  };
}
