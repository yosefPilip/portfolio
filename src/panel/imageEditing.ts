import type { Store } from './state';
import { MANIFEST } from './manifest';
import { isActive, refreshPanel } from './overlay';

/** Live values while dragging, before they are committed to the store. */
interface Live { x: number; y: number; zoom: number }

function readLive(img: HTMLImageElement): Live {
  const pos = img.style.objectPosition || getComputedStyle(img).objectPosition;
  const [px, py] = pos.split(/\s+/);
  const zoom = parseFloat(img.style.getPropertyValue('--img-zoom') || '1');
  return {
    x: parseFloat(px) || 50,
    y: parseFloat(py) || 50,
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

  document.addEventListener('wheel', (e) => {
    if (!isActive()) return;
    const frame = (e.target as Element).closest?.(MANIFEST.slotSelector) as HTMLElement | null;
    const img = frame?.querySelector('img') as HTMLImageElement | null;
    const label = frame?.getAttribute(MANIFEST.slotKeyAttr);
    if (!frame || !img || !label) return;
    // Stops Lenis from scrolling the page while zooming a slot.
    e.preventDefault();
    const live = readLive(img);
    store.setImage(label, { ...live, zoom: live.zoom - e.deltaY * 0.001 });
    paint(img, store.get().images[label]);
    refreshPanel();
  }, { passive: false });

  // Drag a local file onto a slot to preview it. Never written to the repo:
  // the point is judging composition before spending on a generation.
  document.addEventListener('dragover', (e) => { if (isActive()) e.preventDefault(); });

  document.addEventListener('drop', (e) => {
    if (!isActive()) return;
    const frame = (e.target as Element).closest?.(MANIFEST.slotSelector) as HTMLElement | null;
    const img = frame?.querySelector('img') as HTMLImageElement | null;
    const file = e.dataTransfer?.files?.[0];
    if (!frame || !img || !file || !file.type.startsWith('image/')) return;
    e.preventDefault();
    img.src = URL.createObjectURL(file);
    frame.classList.remove('is-missing');
    frame.dataset.panelPreview = file.name;
  });
}
