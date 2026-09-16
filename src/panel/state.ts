import type { PanelState, ImageEdit, TextStyleEdit, TextEdit } from './types';
import { clampFraming } from './cssGenerator';

const KEY = 'panel:state';

function load(): PanelState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { images: {}, styles: {}, text: {} };
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
      parsed.styles === null ||
      typeof parsed.text !== 'object' ||
      Array.isArray(parsed.text) ||
      parsed.text === null
    ) {
      return { images: {}, styles: {}, text: {} };
    }
    // Strip __proto__ keys that JSON.parse may have created as own enumerable
    // properties, ensuring they never enter state.
    const images: Record<string, ImageEdit> = {};
    for (const [k, v] of Object.entries(parsed.images)) {
      if (k !== '__proto__') {
        images[k] = v;
      }
    }
    const styles: Record<string, TextStyleEdit> = {};
    for (const [k, v] of Object.entries(parsed.styles)) {
      if (k !== '__proto__') {
        styles[k] = v;
      }
    }
    const text: Record<string, TextEdit> = {};
    for (const [k, v] of Object.entries(parsed.text)) {
      if (k !== '__proto__') {
        text[k] = v;
      }
    }
    return { images, styles, text };
  } catch {
    return { images: {}, styles: {}, text: {} };
  }
}

export interface Store {
  get(): PanelState;
  setImage(label: string, edit: ImageEdit): void;
  setStyle(id: string, patch: TextStyleEdit): void;
  setText(file: string, id: string, before: string, after: string): void;
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
      // Return a deep copy of the state. This prevents callers from bypassing
      // setImage/setStyle/setText/persist() by mutating the returned reference, and
      // makes clear() unobservable to captured snapshots. The leaves (ImageEdit/
      // TextStyleEdit/TextEdit values) are flat objects of primitives, so a spread
      // per entry is sufficient.
      return {
        images: Object.fromEntries(
          Object.entries(state.images).map(([k, v]) => [k, { ...v }])
        ),
        styles: Object.fromEntries(
          Object.entries(state.styles).map(([k, v]) => [k, { ...v }])
        ),
        text: Object.fromEntries(
          Object.entries(state.text).map(([k, v]) => [k, { ...v }])
        ),
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
    setText(file, id, before, after) {
      state.text[`${file}::${id}`] = { file, id, before, after };
      persist();
    },
    dirtyCount() {
      // Count edited slots, filtering out __proto__ which JSON.parse can create
      // as an own enumerable property but is not a legitimate slot.
      const imageCount = Object.keys(state.images).filter(k => k !== '__proto__').length;
      const styleCount = Object.keys(state.styles).filter(k => k !== '__proto__').length;
      const textCount = Object.keys(state.text).filter(k => k !== '__proto__').length;
      return imageCount + styleCount + textCount;
    },
    clear() {
      state = { images: {}, styles: {}, text: {} };
      try { localStorage.removeItem(KEY); } catch { /* see persist() */ }
    },
  };
}
