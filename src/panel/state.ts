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
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      typeof parsed.images !== 'object' ||
      Array.isArray(parsed.images) ||
      parsed.images === null ||
      typeof parsed.styles !== 'object' ||
      Array.isArray(parsed.styles) ||
      parsed.styles === null
    ) {
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
    get() {
      // Return a copy of the state rather than the live object. This prevents
      // callers from bypassing setImage/setStyle/persist() by mutating the
      // returned reference, and makes clear() unobservable to captured snapshots.
      // Only the outer object and its immediate records are copied; the leaves
      // (ImageEdit/TextStyleEdit values) are replaced wholesale by the setters,
      // so they do not need deep cloning.
      return {
        images: { ...state.images },
        styles: { ...state.styles },
      };
    },
    setImage(label, edit) {
      state.images[label] = clampFraming(edit.x, edit.y, edit.zoom);
      persist();
    },
    setStyle(id, patch) {
      state.styles[id] = { ...state.styles[id], ...patch };
      persist();
    },
    dirtyCount() {
      // Count edited slots, filtering out __proto__ which JSON.parse can create
      // as an own enumerable property but is not a legitimate slot.
      const imageCount = Object.keys(state.images).filter(k => k !== '__proto__').length;
      const styleCount = Object.keys(state.styles).filter(k => k !== '__proto__').length;
      return imageCount + styleCount;
    },
    clear() {
      state = { images: {}, styles: {} };
      try { localStorage.removeItem(KEY); } catch { /* see persist() */ }
    },
  };
}
