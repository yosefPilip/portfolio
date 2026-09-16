import type { Store } from './state';
import { MANIFEST } from './manifest';
import { isActive, refreshPanel } from './overlay';

/** Live values while dragging, before they are committed to the store. */
interface Live { x: number; y: number; zoom: number }

function readLive(img: HTMLImageElement): Live {
  const pos = img.style.objectPosition || getComputedStyle(img).objectPosition;
  const [px, py] = pos.split(/\s+/);
  // parseFloat('0%') is the number 0, which is falsy — `|| 50` would wrongly
  // treat a legitimate full-left/full-top drag (x or y === 0) as unset and
  // snap it back to center. Number.isFinite distinguishes "genuinely 0" from
  // "did not parse" (NaN, from a keyword getComputedStyle didn't normalize,
  // or missing data), so only the latter falls back to 50.
  const x = parseFloat(px);
  const y = parseFloat(py);
  const zoom = parseFloat(img.style.getPropertyValue('--img-zoom') || '1');
  return {
    x: Number.isFinite(x) ? x : 50,
    y: Number.isFinite(y) ? y : 50,
    zoom: Number.isFinite(zoom) ? zoom : 1,
  };
}

function paint(img: HTMLImageElement, v: Live): void {
  // Written inline for instant feedback; the store holds the truth, and Save
  // turns the store into the generated stylesheet.
  img.style.objectPosition = `${v.x}% ${v.y}%`;
  img.style.setProperty('--img-zoom', String(v.zoom));
}

export function installImageEditing(store: Store): void {
  // Apply anything already pending so a reload does not lose an unsaved drag.
  for (const [label, edit] of Object.entries(store.get().images)) {
    const frame = document.querySelector(`${MANIFEST.slotSelector}[${MANIFEST.slotKeyAttr}="${CSS.escape(label)}"]`);
    const img = frame?.querySelector('img');
    if (img) paint(img as HTMLImageElement, edit);
  }

  let dragging: { img: HTMLImageElement; label: string; startX: number; startY: number; from: Live } | null = null;

  // Stop tracking a drag without committing it, and repaint back to the last
  // committed value (`dragging.from`, read at pointerdown from the image's
  // then-current painted state) rather than leaving the abandoned in-flight
  // paint on screen.
  function abortDrag(): void {
    if (!dragging) return;
    paint(dragging.img, dragging.from);
    dragging = null;
  }

  document.addEventListener('pointerdown', (e) => {
    if (!isActive()) return;
    const frame = (e.target as Element).closest?.(MANIFEST.slotSelector) as HTMLElement | null;
    const img = frame?.querySelector('img') as HTMLImageElement | null;
    const label = frame?.getAttribute(MANIFEST.slotKeyAttr);
    if (!frame || !img || !label) return;
    e.preventDefault();
    dragging = { img, label, startX: e.clientX, startY: e.clientY, from: readLive(img) };
    frame.setPointerCapture(e.pointerId);
  });

  document.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    // Defensive: if the primary button is no longer held, a pointerup or
    // pointercancel was missed (stylus barrel button, palm rejection, a
    // second touch point, focus loss). Bail instead of letting every later
    // unrelated pointer move keep repainting this image.
    if ((e.buttons & 1) === 0) {
      abortDrag();
      return;
    }
    const rect = dragging.img.getBoundingClientRect();
    // Dragging right moves the image right, which means revealing content from
    // its left — so the percentage decreases. Hence the negated delta.
    const next: Live = {
      x: dragging.from.x - ((e.clientX - dragging.startX) / rect.width) * 100,
      y: dragging.from.y - ((e.clientY - dragging.startY) / rect.height) * 100,
      zoom: dragging.from.zoom,
    };
    paint(dragging.img, next);
  });

  document.addEventListener('pointerup', () => {
    if (!dragging) return;
    store.setImage(dragging.label, readLive(dragging.img));
    // Re-paint from the clamped value the store actually kept.
    paint(dragging.img, store.get().images[dragging.label]);
    refreshPanel();
    dragging = null;
  });

  // No pointerup fires on a cancel (stylus barrel button, palm rejection, a
  // second touch point, the window losing focus mid-hold) — clear `dragging`
  // WITHOUT committing to the store, so an interrupted drag never corrupts a
  // slot's saved framing with garbage coordinates.
  document.addEventListener('pointercancel', () => {
    abortDrag();
  });

  // Lenis (src/shared/motion.ts) listens for 'wheel' in the bubble phase on
  // window and does not consult event.defaultPrevented before scrolling, so
  // preventDefault() alone never stops it. Registering here in the CAPTURE
  // phase means this handler runs on the way down, before the event ever
  // reaches target/bubble phase — so stopPropagation() (once we know we are
  // actually handling the event) keeps it from ever reaching Lenis's
  // window-level listener at all. Only stop propagation when a frame is
  // actually under the pointer and edit mode is on; every other wheel event
  // — panel off, or over empty page — must reach Lenis untouched so normal
  // scrolling keeps working.
  document.addEventListener('wheel', (e) => {
    if (!isActive()) return;
    const frame = (e.target as Element).closest?.(MANIFEST.slotSelector) as HTMLElement | null;
    const img = frame?.querySelector('img') as HTMLImageElement | null;
    const label = frame?.getAttribute(MANIFEST.slotKeyAttr);
    if (!frame || !img || !label) return;
    e.preventDefault();
    e.stopPropagation();
    const live = readLive(img);
    store.setImage(label, { ...live, zoom: live.zoom - e.deltaY * 0.001 });
    paint(img, store.get().images[label]);
    refreshPanel();
  }, { capture: true, passive: false });

  // Drag a local file onto a slot to preview it. Never written to the repo:
  // the point is judging composition before spending on a generation.
  document.addEventListener('dragover', (e) => { if (isActive()) e.preventDefault(); });

  document.addEventListener('drop', (e) => {
    if (!isActive()) return;
    // Swallow the drop as soon as we know edit mode is on, BEFORE the guards
    // below decide whether it's usable. Otherwise a drop that fails a guard —
    // a non-image file, or a target a few pixels outside a frame — falls
    // through to the browser default, which navigates the tab to the dropped
    // file and discards any unsaved edits. Panel-off drops never reach here,
    // so ordinary browser behavior outside edit mode is untouched.
    e.preventDefault();
    const frame = (e.target as Element).closest?.(MANIFEST.slotSelector) as HTMLElement | null;
    const img = frame?.querySelector('img') as HTMLImageElement | null;
    const file = e.dataTransfer?.files?.[0];
    if (!frame || !img || !file || !file.type.startsWith('image/')) return;
    img.src = URL.createObjectURL(file);
    frame.classList.remove('is-missing');
    frame.dataset.panelPreview = file.name;
  });
}
