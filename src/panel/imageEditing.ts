import type { Store } from './state';
import type { ImageEdit } from './types';
import type { ImageUploadRequest } from './saveClient';
import { MANIFEST } from './manifest';
import { maxPanPercent } from './cssGenerator';
import {
  isActive,
  refreshPanel,
  onUndo,
  onSaveSuccess,
  getSelectedFrame,
  isPanelChrome,
  registerZoomSetter,
  registerPendingUploadCounter,
  registerPendingUploadsCollector,
} from './overlay';

/**
 * Bytes of a dropped-but-unsaved image, kept only in memory, keyed by the
 * frame's data-label — a File cannot be JSON-serialised, and the store
 * mirrors its state to localStorage, so this intentionally never goes
 * through persist(). That is also what keeps "an unsaved drop vanishes on
 * reload" true without any extra reconciliation step: a reload always starts
 * this Map empty, so there is nothing a stale localStorage entry could ever
 * point at, and nothing that would show a pending count Save could not
 * actually act on.
 */
const pendingUploads = new Map<string, File>();

/**
 * Each slot's real `<img src>` exactly as the page loaded it — the "before"
 * value the server's stale check compares against when Save repoints this
 * slot's HTML. Captured once, at install, before any drop can have touched
 * it: `previewDroppedFile` sets `img.src` to a blob: URL via the IDL
 * property, which — because `src` is a reflected attribute — ALSO rewrites
 * `img.getAttribute('src')`, so reading it lazily after a drop would read
 * back the preview, not the real value the file on disk still has.
 */
const originalSrc = new Map<string, string>();

/**
 * Client-side courtesy copy of paths.ts's MAX_IMAGE_BYTES. Duplicated, not
 * imported: server/ and browser code sit on opposite sides of the tsconfig
 * boundary and neither may import the other (see RAWTEXT_TAGS in
 * textEditing.ts for the same pattern). Rejecting an oversized file at drop
 * time is purely a courtesy — it stops the pending count from promising a
 * save the server is going to refuse anyway, which is exactly the kind of
 * dangling, un-saveable entry this feature has to avoid. The server's own
 * check is the one that actually matters.
 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Chunked rather than one `String.fromCharCode(...bytes)`: spreading a
  // large typed array as call arguments can exceed the engine's argument
  // limit for a several-megabyte photo.
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Live values while dragging, before they are committed to the store. */
interface Live { x: number; y: number; zoom: number; panX: number; panY: number }

/** An ImageEdit (panX/panY optional, omitted at 0) widened to a Live's
    always-present fields — the shape paint()/repaint want. */
function toLive(edit: ImageEdit): Live {
  return { x: edit.x, y: edit.y, zoom: edit.zoom, panX: edit.panX ?? 0, panY: edit.panY ?? 0 };
}

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
  const panX = parseFloat(img.style.getPropertyValue('--img-pan-x') || '0');
  const panY = parseFloat(img.style.getPropertyValue('--img-pan-y') || '0');
  return {
    x: Number.isFinite(x) ? x : 50,
    y: Number.isFinite(y) ? y : 50,
    zoom: Number.isFinite(zoom) ? zoom : 1,
    panX: Number.isFinite(panX) ? panX : 0,
    panY: Number.isFinite(panY) ? panY : 0,
  };
}

export function paint(img: HTMLImageElement, v: Live): void {
  // Written inline for instant feedback; the store holds the truth, and Save
  // turns the store into the generated stylesheet.
  img.style.objectPosition = `${v.x}% ${v.y}%`;
  img.style.setProperty('--img-zoom', String(v.zoom));
  img.style.setProperty('--img-pan-x', `${v.panX}%`);
  img.style.setProperty('--img-pan-y', `${v.panY}%`);
}

/** Find the frame + its <img> for a given `data-label`, if either exists on
    the current page. Shared by the initial pending-edit repaint below and by
    the undo repaint. */
function findSlot(label: string): { frame: HTMLElement; img: HTMLImageElement } | null {
  const frame = document.querySelector(`${MANIFEST.slotSelector}[${MANIFEST.slotKeyAttr}="${CSS.escape(label)}"]`);
  const img = frame?.querySelector('img');
  return frame && img ? { frame: frame as HTMLElement, img: img as HTMLImageElement } : null;
}

/** Repaint one image slot straight from the store, for undo: applies the
    restored framing if the slot still has one, or clears the inline override
    entirely (back to the stylesheet default) if undo reverted it to "did not
    exist". A no-op if the label is not on the current page. */
export function repaintImageFromStore(store: Store, label: string): void {
  const slot = findSlot(label);
  if (!slot) return;
  const edit = store.get().images[label];
  if (edit) {
    paint(slot.img, toLive(edit));
  } else {
    slot.img.style.removeProperty('object-position');
    slot.img.style.removeProperty('--img-zoom');
    slot.img.style.removeProperty('--img-pan-x');
    slot.img.style.removeProperty('--img-pan-y');
  }
}

export function installImageEditing(store: Store): void {
  // Apply anything already pending so a reload does not lose an unsaved drag.
  for (const [label, edit] of Object.entries(store.get().images)) {
    const slot = findSlot(label);
    if (slot) paint(slot.img, toLive(edit));
  }

  // Snapshot every slot's real src BEFORE anything else can touch it (see
  // originalSrc's doc comment) — this is what a later Save sends the server
  // as "the value I loaded", for the stale-src check on the HTML patch.
  for (const frame of document.querySelectorAll<HTMLElement>(MANIFEST.slotSelector)) {
    const img = frame.querySelector('img');
    const label = frame.getAttribute(MANIFEST.slotKeyAttr);
    if (img && label) originalSrc.set(label, img.getAttribute('src') ?? '');
  }

  registerPendingUploadCounter(() => pendingUploads.size);

  registerPendingUploadsCollector(async () => {
    const file = MANIFEST.pageForPath(window.location.pathname);
    const out: ImageUploadRequest[] = [];
    for (const [label, f] of pendingUploads) {
      out.push({
        path: file,
        label,
        fileName: f.name,
        data: await fileToBase64(f),
        beforeSrc: originalSrc.get(label) ?? '',
      });
    }
    return out;
  });

  onSaveSuccess((_state, result) => {
    for (const { label, src } of result.images) {
      pendingUploads.delete(label);
      const slot = findSlot(label);
      if (!slot) continue;
      if (slot.img.src.startsWith('blob:')) URL.revokeObjectURL(slot.img.src);
      slot.img.src = src;
      slot.frame.classList.remove('is-missing');
      delete slot.frame.dataset.panelPreview;
      // Keep the "on disk now" snapshot current, same reason
      // textEditing.ts's onSaveSuccess refreshes its own `originals`: the
      // NEXT save's stale check must compare against reality, not this
      // now-superseded pre-save value.
      originalSrc.set(label, src);
    }
  });

  // The layer list's zoom slider is built and owned by overlay.ts, which
  // cannot import this module directly (this module already imports FROM
  // overlay.ts, and a cycle back the other way is worth avoiding) — so it
  // registers a setter here instead, the same registration pattern onUndo
  // and friends already use in the other direction.
  registerZoomSetter((frame, zoom) => {
    const img = frame.querySelector('img') as HTMLImageElement | null;
    const label = frame.getAttribute(MANIFEST.slotKeyAttr);
    if (!img || !label) return;
    store.setImage(label, { ...readLive(img), zoom });
    paint(img, toLive(store.get().images[label]));
    refreshPanel();
  });

  onUndo((result) => {
    if (result.kind === 'image') {
      repaintImageFromStore(store, result.label);
      // dirtyCount/Save-button state changed too — see overlay.ts's own
      // refreshPanel() call right after this fires, which handles that half.
      return;
    }
    if (result.kind !== 'imagePreview') return;
    const slot = findSlot(result.label);
    if (!slot) return;
    const current = slot.img.src;
    // Only ever a blob: URL when it was THIS panel's own preview — the real,
    // committed asset is always an ordinary http(s)/relative path.
    if (current.startsWith('blob:')) URL.revokeObjectURL(current);
    slot.img.src = result.prevSrc;
    slot.frame.classList.toggle('is-missing', result.prevMissing);
    if (result.prevPreviewName === undefined) delete slot.frame.dataset.panelPreview;
    else slot.frame.dataset.panelPreview = result.prevPreviewName;
    // Always drop this label's queued bytes, even when undo reverts to an
    // EARLIER still-pending drop (prevPreviewName defined) rather than to
    // "no preview at all": a second drop overwrote whatever this map held
    // for the first one, so there is nothing left here that actually
    // matches what is back on screen. Saving now would either do nothing
    // for this slot (safe — the same as if it had never been dropped) or,
    // worse, silently write bytes that don't match the preview being shown.
    // The fix is cheap: drop the file again if that earlier preview is
    // still wanted.
    pendingUploads.delete(result.label);
  });

  let dragging: { img: HTMLImageElement; frame: HTMLElement; label: string; startX: number; startY: number; from: Live } | null = null;

  // Stop tracking a drag without committing it, and repaint back to the last
  // committed value (`dragging.from`, read at pointerdown from the image's
  // then-current painted state) rather than leaving the abandoned in-flight
  // paint on screen.
  function abortDrag(): void {
    if (!dragging) return;
    paint(dragging.img, dragging.from);
    dragging = null;
  }

  /**
   * The frame an interaction at this target should act on.
   *
   * With nothing selected, this is exactly today's hit-test — the topmost
   * frame under the pointer. With a frame selected, that selection wins
   * outright: the pointer only has to be somewhere over SOME frame (still
   * ruling out clicks on ordinary page content and on the panel's own UI),
   * and the selected frame is used regardless of which frame is actually on
   * top there. That is what makes a layer buried under others reachable —
   * the entire point of the layer list.
   */
  function resolveTargetFrame(target: Element): HTMLElement | null {
    if (isPanelChrome(target)) return null;
    const hit = target.closest?.(MANIFEST.slotSelector) as HTMLElement | null;
    if (!hit) return null;
    return getSelectedFrame() ?? hit;
  }

  document.addEventListener('pointerdown', (e) => {
    if (!isActive()) return;
    const frame = resolveTargetFrame(e.target as Element);
    const img = frame?.querySelector('img') as HTMLImageElement | null;
    const label = frame?.getAttribute(MANIFEST.slotKeyAttr);
    if (!frame || !img || !label) return;
    e.preventDefault();
    dragging = { img, frame, label, startX: e.clientX, startY: e.clientY, from: readLive(img) };
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
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    let next: Live;
    if (dragging.from.zoom > 1) {
      // Zoomed in: drag pans WITHIN the crop via translate, which needs the
      // frame's own (untransformed) size as the % basis — see
      // maxPanPercent's doc comment for why, and why the clamp here has to
      // grow with zoom. Positive translate moves content the same direction
      // screen-space, so — unlike the object-position branch below — the
      // pointer delta is NOT negated: the image follows the cursor, like
      // dragging a photo.
      const frameRect = dragging.frame.getBoundingClientRect();
      const maxPan = maxPanPercent(dragging.from.zoom);
      const rawX = dragging.from.panX + (dx / (dragging.from.zoom * frameRect.width)) * 100;
      const rawY = dragging.from.panY + (dy / (dragging.from.zoom * frameRect.height)) * 100;
      next = {
        ...dragging.from,
        panX: Math.min(maxPan, Math.max(-maxPan, rawX)),
        panY: Math.min(maxPan, Math.max(-maxPan, rawY)),
      };
    } else {
      const rect = dragging.img.getBoundingClientRect();
      // Dragging right moves the image right, which means revealing content from
      // its left — so the percentage decreases. Hence the negated delta.
      next = {
        ...dragging.from,
        x: dragging.from.x - (dx / rect.width) * 100,
        y: dragging.from.y - (dy / rect.height) * 100,
      };
    }
    paint(dragging.img, next);
  });

  document.addEventListener('pointerup', () => {
    if (!dragging) return;
    store.setImage(dragging.label, readLive(dragging.img));
    // Re-paint from the clamped value the store actually kept.
    paint(dragging.img, toLive(store.get().images[dragging.label]));
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

  // A PLAIN wheel must scroll the page exactly as it does with the panel off
  // — Lenis (src/shared/motion.ts) owns it, same as always. Only a trackpad
  // PINCH (reported by every browser as a wheel event with ctrlKey === true;
  // there is no way to tell that apart from someone genuinely holding Ctrl
  // while spinning a wheel, and per the spec for this feature that ambiguity
  // is fine) hijacks the event: preventDefault() stops the browser's own
  // page-zoom default action, and — since Lenis listens on window in the
  // bubble phase and does not consult event.defaultPrevented before
  // scrolling — stopPropagation() in this CAPTURE-phase listener is what
  // stops the pinch from ALSO being read as a scroll.
  document.addEventListener('wheel', (e) => {
    if (!isActive()) return;
    if (!e.ctrlKey) return;
    const frame = resolveTargetFrame(e.target as Element);
    const img = frame?.querySelector('img') as HTMLImageElement | null;
    const label = frame?.getAttribute(MANIFEST.slotKeyAttr);
    if (!frame || !img || !label) return;
    e.preventDefault();
    e.stopPropagation();
    const live = readLive(img);
    store.setImage(label, { ...live, zoom: live.zoom - e.deltaY * 0.01 });
    paint(img, toLive(store.get().images[label]));
    refreshPanel();
  }, { capture: true, passive: false });

  /** Preview a locally dropped file in `frame`, recording enough on the
      store's undo stack to restore exactly what was there before. Shared by
      both drop targets below (a frame directly, or its layer-list row) so
      undo behaves identically either way. Never written to the repo — the
      point is judging composition before spending on a generation. */
  function previewDroppedFile(frame: HTMLElement, file: File): void {
    const img = frame.querySelector('img') as HTMLImageElement | null;
    const label = frame.getAttribute(MANIFEST.slotKeyAttr);
    if (!img || !label || !file.type.startsWith('image/')) return;
    // A courtesy rejection — see MAX_IMAGE_BYTES's doc comment. Refused
    // before anything else touches the frame, so a too-big drop leaves the
    // existing image and pending state completely untouched.
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert(
        `"${file.name}" is ${Math.round(file.size / (1024 * 1024))} MB, over the ` +
          `${MAX_IMAGE_BYTES / (1024 * 1024)} MB the panel can save. Pick a smaller file.`,
      );
      return;
    }
    store.recordImagePreview(label, img.src, frame.classList.contains('is-missing'), frame.dataset.panelPreview);
    pendingUploads.set(label, file);
    img.src = URL.createObjectURL(file);
    frame.classList.remove('is-missing');
    frame.dataset.panelPreview = file.name;
    refreshPanel();
  }

  // Drag a local file onto a slot — or onto its row in the layer list, which
  // reaches a frame buried under others the same way selecting that row does
  // for drag/wheel — to preview it.
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
    const target = e.target as Element;
    // A layer-list row carries the same data-label as the frame it
    // represents (see overlay.ts's buildLayerList) — resolving through it
    // rather than through closest(MANIFEST.slotSelector) is what lets a drop
    // on the row reach a frame buried under others in the stack.
    const row = target.closest?.('.panel-bar__layer') as HTMLElement | null;
    const label = row?.dataset.label;
    // Three ways to aim a drop, most explicit first:
    //
    //   1. onto a layer row — that row's frame, whatever is stacked over it;
    //   2. with a layer selected — THAT layer, wherever on the page the file
    //      lands, including over empty space or another layer entirely. A
    //      selection is a deliberate statement of what you are working on, so
    //      it beats whatever the pointer happens to be over;
    //   3. otherwise — the topmost frame under the pointer, as before.
    //
    // Dropping used to skip straight to 3, which is why a buried layer looked
    // unreachable even while it was selected.
    const frame = label
      ? findSlot(label)?.frame ?? null
      : getSelectedFrame() ?? (target.closest?.(MANIFEST.slotSelector) as HTMLElement | null);
    const file = e.dataTransfer?.files?.[0];
    if (!frame || !file) return;
    previewDroppedFile(frame, file);
  });
}
