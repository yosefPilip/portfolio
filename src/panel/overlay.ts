import type { Store } from './state';
import type { PanelState, UndoResult } from './types';
import { generateCss, MIN_FRAME_HEIGHT } from './cssGenerator';
import { MANIFEST } from './manifest';
import { save, isSaveError, type ImageUploadRequest, type SaveResult } from './saveClient';

let mounted = false;
let active = false;
let refreshFn: (() => void) | null = null;
// A list, not a single slot: a second registrant must not silently replace
// (and thereby unregister) the first the way a bare variable would.
let deactivateFns: Array<() => void> = [];
let beforeDeactivateFns: Array<() => void> = [];
let saveSuccessFns: Array<(state: PanelState, result: SaveResult) => void> = [];
let undoFns: Array<(result: UndoResult) => void> = [];
/** Set by imageEditing.ts (see its doc comment on the registration call) so
    the layer list's zoom slider, built here, can apply a change through the
    same store-write + repaint path a wheel or drag uses. */
let zoomSetter: ((frame: HTMLElement, zoom: number) => void) | null = null;
/** Set by imageEditing.ts, same indirection and same reason as zoomSetter:
    the layer list's frame-trim sliders (height + anchor), built here, apply a
    change through the same store-write + repaint path a drag/zoom uses.
    `height` undefined means "no trim" (the slider pulled back to 100). */
let frameSetter: ((frame: HTMLElement, height: number | undefined, anchor: number | undefined) => void) | null = null;
/** Set by imageEditing.ts, same indirection as zoomSetter: the layer list's
    background-transparency checkbox, built here, applies a change through
    the same store-write + repaint path. */
let backgroundSetter: ((frame: HTMLElement, transparentBg: boolean) => void) | null = null;
/** Set by imageEditing.ts: how many dropped-but-unsaved images are queued.
    Added to store.dirtyCount() in refresh() below — a dropped image is never
    part of PanelState (see imageEditing.ts's pendingUploads doc comment), so
    the store alone cannot answer "how many pending changes". A single slot,
    not a list, for the same reason zoomSetter is: exactly one module ever
    provides this. */
let pendingUploadCounter: (() => number) | null = null;
/** Set by imageEditing.ts: turn every currently-queued dropped image into the
    request shape save() expects (reading the File's bytes, which is async).
    Called once, from the Save button handler, right before the request is
    sent. */
let pendingUploadsCollector: (() => Promise<ImageUploadRequest[]>) | null = null;

/** The frame the layer list has selected, or null when hit-testing should
    behave exactly as before (topmost frame under the pointer wins). Module
    state, not per-mount: imageEditing.ts reads it through getSelectedFrame()
    on every pointerdown/wheel, same shape as isActive(). */
let selectedFrame: HTMLElement | null = null;
/** Layer-list row for each frame, kept so selection changes can toggle the
    right row's highlight without rebuilding the whole list. */
let frameRows = new Map<HTMLElement, HTMLButtonElement>();

/** Takes the store rather than creating one: the interaction modules added in
    later tasks must share this exact instance, not a second copy. */
export function mountPanel(store: Store): void {
  if (mounted) return;
  mounted = true;

  const bar = document.createElement('div');
  bar.className = 'panel-bar';
  bar.hidden = true;

  const row = document.createElement('div');
  row.className = 'panel-bar__row';

  const badge = document.createElement('span');
  badge.className = 'panel-bar__badge';
  badge.textContent = 'EDIT';

  const count = document.createElement('span');
  count.className = 'panel-bar__count';

  const undoBtn = document.createElement('button');
  undoBtn.className = 'panel-bar__undo';
  undoBtn.type = 'button';
  undoBtn.textContent = 'Undo';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'panel-bar__save';
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';

  row.append(badge, count, undoBtn, saveBtn);

  const layerList = document.createElement('div');
  layerList.className = 'panel-bar__layers';
  // Scroll the list itself, not the page: stopPropagation in the capture
  // phase keeps this wheel from ever reaching Lenis's window-level bubble
  // listener (same reasoning as imageEditing.ts's own wheel handler), while
  // leaving the browser's native scrolling of this overflowing list untouched
  // — only propagation is stopped here, never the default action.
  layerList.addEventListener('wheel', (e) => { e.stopPropagation(); }, { capture: true });

  bar.append(row, layerList);
  document.body.appendChild(bar);

  /** The zoom-slider row currently shown under the selected frame's row, if
      any — built fresh on each selection so its initial value always reflects
      that frame's current zoom, and torn down on deselect so a stale slider
      never lingers under the wrong row. */
  let zoomRow: HTMLElement | null = null;
  /** The slider + readout inside `zoomRow`, kept so `refresh()` can resync
      the displayed value after a wheel-pinch or a drag changes zoom out from
      under it — those never touch the slider directly, so without this the
      readout would go stale the moment you stopped touching the slider
      itself. */
  let zoomSlider: HTMLInputElement | null = null;
  let zoomValueLabel: HTMLElement | null = null;

  /** Same lifecycle as zoomRow/zoomSlider above, for the frame-trim controls
      (height + anchor). Built only for a full-bleed plate frame — see
      buildFrameRow — so this stays null for an inline --ar frame's
      selection, exactly like a missing zoomRow would for a control this
      list simply does not offer that kind of frame. */
  let frameRow: HTMLElement | null = null;
  let frameHeightSlider: HTMLInputElement | null = null;
  let frameHeightValueLabel: HTMLElement | null = null;
  let frameAnchorSlider: HTMLInputElement | null = null;
  let frameAnchorValueLabel: HTMLElement | null = null;

  /** Same lifecycle again, for the background-transparency checkbox — offered
      on every frame, plate or inline, since transparency is not a box
      concern the way height/anchor are. */
  let bgRow: HTMLElement | null = null;
  let bgCheckbox: HTMLInputElement | null = null;

  /** 0/100 read as the words a slider's ends actually mean; anything between
      is just its own percentage — matches "top, bottom, or somewhere
      between" rather than forcing three discrete stops. */
  function anchorLabel(a: number): string {
    if (a <= 10) return 'Top';
    if (a >= 90) return 'Bottom';
    return `${Math.round(a)}%`;
  }

  /**
   * Height + anchor sliders for a trimmed frame — see the design note on
   * ImageEdit.frameHeight. Offered only for a full-bleed plate frame (a
   * direct `.plate > .frame`): an inline content frame sized by `--ar` has
   * no plate to be a fraction OF, and generateCss's rule would fight its
   * aspect-ratio box rather than do anything useful, so the control simply
   * is not shown for one — returning null here is exactly what keeps such a
   * frame "working exactly as it does now".
   */
  function buildFrameRow(frame: HTMLElement, label: string): HTMLElement | null {
    if (!frame.parentElement?.classList.contains('plate')) return null;
    const current = store.get().images[label];
    const height = current?.frameHeight ?? 100;
    const anchor = current?.frameAnchor ?? 50;

    const wrap = document.createElement('div');
    wrap.className = 'panel-bar__frame';

    const heightSlider = document.createElement('input');
    heightSlider.type = 'range';
    heightSlider.min = String(MIN_FRAME_HEIGHT);
    heightSlider.max = '100';
    heightSlider.step = '1';
    heightSlider.value = String(height);
    heightSlider.setAttribute('aria-label', 'Band height');
    const heightValue = document.createElement('span');
    heightValue.textContent = `${Math.round(height)}%`;

    const anchorSlider = document.createElement('input');
    anchorSlider.type = 'range';
    anchorSlider.min = '0';
    anchorSlider.max = '100';
    anchorSlider.step = '1';
    anchorSlider.value = String(anchor);
    anchorSlider.disabled = height >= 100;
    anchorSlider.setAttribute('aria-label', 'Band anchor, top to bottom');
    const anchorValue = document.createElement('span');
    anchorValue.textContent = anchorLabel(anchor);

    function apply(): void {
      const h = parseFloat(heightSlider.value);
      const a = parseFloat(anchorSlider.value);
      heightValue.textContent = `${Math.round(h)}%`;
      anchorValue.textContent = anchorLabel(a);
      // A full-height frame has nothing to anchor — disabled rather than
      // hidden, so the control does not jump around as height crosses 100.
      anchorSlider.disabled = h >= 100;
      frameSetter?.(frame, h >= 100 ? undefined : h, h >= 100 ? undefined : a);
    }

    heightSlider.addEventListener('input', apply);
    anchorSlider.addEventListener('input', apply);

    wrap.append(heightSlider, heightValue, anchorSlider, anchorValue);
    frameHeightSlider = heightSlider;
    frameHeightValueLabel = heightValue;
    frameAnchorSlider = anchorSlider;
    frameAnchorValueLabel = anchorValue;
    return wrap;
  }

  /** Background-transparency toggle — see the design note on
      ImageEdit.transparentBg. Offered on every frame: unlike height/anchor
      this is not a plate-box concern, so an inline --ar frame (a dropped
      cut-out photo in the Elsewhere grid, say) can use it too. */
  function buildBackgroundRow(frame: HTMLElement, label: string): HTMLElement {
    const current = store.get().images[label];
    const wrap = document.createElement('label');
    wrap.className = 'panel-bar__bg';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = current?.transparentBg === true;
    checkbox.addEventListener('change', () => {
      backgroundSetter?.(frame, checkbox.checked);
    });
    const text = document.createElement('span');
    text.textContent = 'Transparent background';
    wrap.append(checkbox, text);
    bgCheckbox = checkbox;
    return wrap;
  }

  /**
   * The slider is given to the SELECTED row only, not every row: Workshop
   * alone has nine frames, and nine always-visible sliders would roughly
   * triple the list's height and bury the labels the list exists to make
   * scannable. Selection is already how this list targets drag/wheel at a
   * buried layer, so hanging the slider off that same selection — rather
   * than inventing a second, parallel notion of "which row is active" — is
   * one idea, not two, and keeps every row but the one you're touching down
   * to a single readable line.
   */
  function buildZoomRow(frame: HTMLElement): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'panel-bar__zoom';
    const img = frame.querySelector('img');
    const raw = img ? parseFloat(img.style.getPropertyValue('--img-zoom') || '1') : 1;
    const current = Number.isFinite(raw) ? raw : 1;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '4';
    slider.step = '0.05';
    slider.value = String(current);
    slider.setAttribute('aria-label', 'Zoom');
    const value = document.createElement('span');
    value.textContent = `${current.toFixed(2)}x`;
    slider.addEventListener('input', () => {
      const z = parseFloat(slider.value);
      value.textContent = `${z.toFixed(2)}x`;
      zoomSetter?.(frame, z);
    });
    wrap.append(slider, value);
    zoomSlider = slider;
    zoomValueLabel = value;
    return wrap;
  }

  function clearSelection(): void {
    if (!selectedFrame) return;
    selectedFrame.classList.remove('panel-frame-selected');
    frameRows.get(selectedFrame)?.classList.remove('panel-bar__layer--selected');
    selectedFrame = null;
    zoomRow?.remove();
    zoomRow = null;
    zoomSlider = null;
    zoomValueLabel = null;
    frameRow?.remove();
    frameRow = null;
    frameHeightSlider = null;
    frameHeightValueLabel = null;
    frameAnchorSlider = null;
    frameAnchorValueLabel = null;
    bgRow?.remove();
    bgRow = null;
    bgCheckbox = null;
  }

  function selectFrame(frame: HTMLElement): void {
    // Clicking the already-selected row clears it, per spec.
    if (selectedFrame === frame) {
      clearSelection();
      return;
    }
    clearSelection();
    selectedFrame = frame;
    frame.classList.add('panel-frame-selected');
    const row = frameRows.get(frame);
    row?.classList.add('panel-bar__layer--selected');
    const label = frame.getAttribute(MANIFEST.slotKeyAttr) ?? '';
    zoomRow = buildZoomRow(frame);
    // Right after the row it belongs to, not appended at the list's end —
    // with nine frames the end could be scrolled well out of view. Each
    // later row is inserted right after the one before it, so the whole
    // group reads top to bottom as: layer row, zoom, frame trim, background.
    row?.insertAdjacentElement('afterend', zoomRow);
    let after: HTMLElement = zoomRow;
    frameRow = buildFrameRow(frame, label);
    if (frameRow) {
      after.insertAdjacentElement('afterend', frameRow);
      after = frameRow;
    }
    bgRow = buildBackgroundRow(frame, label);
    after.insertAdjacentElement('afterend', bgRow);
  }

  /**
   * Rebuild the layer list from every `figure.frame` on THIS page, in
   * document order, labelled by its `data-label` and flagged `[empty]` when
   * its image is missing (`is-missing`).
   *
   * Called each time edit mode switches on rather than once at mount: mount
   * runs off a dynamic `import()` that can resolve before every <img> on the
   * page has fired its own load/error event, so `is-missing` may not be
   * settled yet. By the time a human actually presses the hotkey, it always is.
   */
  function buildLayerList(): void {
    layerList.innerHTML = '';
    frameRows = new Map();
    zoomRow = null;
    frameRow = null;
    bgRow = null;
    const frames = Array.from(document.querySelectorAll<HTMLElement>(MANIFEST.slotSelector));
    for (const frame of frames) {
      const label = frame.getAttribute(MANIFEST.slotKeyAttr) ?? '(unlabeled)';
      const empty = frame.classList.contains('is-missing');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'panel-bar__layer';
      btn.textContent = empty ? `${label} [empty]` : label;
      // Mirrors the frame's own data-label so imageEditing.ts's drop handler
      // can resolve a drop on THIS row back to this frame, whatever else is
      // stacked on top of it — the same reach-a-buried-layer trick selection
      // already does for drag/wheel.
      btn.dataset.label = label;
      btn.addEventListener('click', () => selectFrame(frame));
      // Visual-only: which row a dragged file is over. The actual drop is
      // handled by imageEditing.ts's document-level listener (it bubbles
      // there from this button), so this only ever toggles a class.
      // dragover, not just dragenter: a real OS drag can enter the row between
      // fired events, and dragover repeats for as long as the file is held
      // over it, so the highlight cannot be missed or left stale.
      btn.addEventListener('dragover', (e) => {
        e.preventDefault();
        btn.classList.add('panel-bar__layer--dropover');
      });
      btn.addEventListener('dragenter', () => btn.classList.add('panel-bar__layer--dropover'));
      btn.addEventListener('dragleave', () => btn.classList.remove('panel-bar__layer--dropover'));
      btn.addEventListener('drop', () => btn.classList.remove('panel-bar__layer--dropover'));
      frameRows.set(frame, btn);
      layerList.appendChild(btn);
    }
  }

  function refresh(): void {
    const n = store.dirtyCount() + (pendingUploadCounter?.() ?? 0);
    count.textContent = n === 0 ? 'no changes' : `${n} pending`;
    saveBtn.disabled = n === 0;
    undoBtn.disabled = !store.canUndo();
    // A pinch or a drag changes zoom without ever touching the slider, so its
    // readout needs the same resync every OTHER store write already gets here.
    if (selectedFrame && zoomSlider && zoomValueLabel) {
      const img = selectedFrame.querySelector('img');
      const raw = img ? parseFloat(img.style.getPropertyValue('--img-zoom') || '1') : 1;
      const z = Number.isFinite(raw) ? raw : 1;
      zoomSlider.value = String(z);
      zoomValueLabel.textContent = `${z.toFixed(2)}x`;
    }
    // Same resync, for undo landing on a trim/background change: neither
    // slider nor the checkbox is touched directly by an undo repaint (that
    // only paints the frame itself — see imageEditing.ts's onUndo handler),
    // so without this their readouts would go stale the moment Ctrl+Z fires.
    if (selectedFrame) {
      const label = selectedFrame.getAttribute(MANIFEST.slotKeyAttr);
      const current = label ? store.get().images[label] : undefined;
      if (frameHeightSlider && frameHeightValueLabel && frameAnchorSlider && frameAnchorValueLabel) {
        const h = current?.frameHeight ?? 100;
        const a = current?.frameAnchor ?? 50;
        frameHeightSlider.value = String(h);
        frameHeightValueLabel.textContent = `${Math.round(h)}%`;
        frameAnchorSlider.value = String(a);
        frameAnchorSlider.disabled = h >= 100;
        frameAnchorValueLabel.textContent = anchorLabel(a);
      }
      if (bgCheckbox) bgCheckbox.checked = current?.transparentBg === true;
    }
  }
  refreshFn = refresh;

  function performUndo(): void {
    const result = store.undo();
    // A safe no-op on an empty stack: nothing to repaint, and refresh() below
    // would just confirm what refresh() already showed.
    if (!result) return;
    undoFns.forEach((fn) => fn(result));
    refresh();
  }

  undoBtn.addEventListener('click', performUndo);

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const state = store.get();
      const images = (await pendingUploadsCollector?.()) ?? [];
      const result = await save(
        [{ path: MANIFEST.generatedCssPath, contents: generateCss(state) }],
        Object.values(state.text).map((t) => ({ path: t.file, id: t.id, before: t.before, after: t.after })),
        images,
      );
      // Before clearing: modules that track their own "what's on disk"
      // baseline (textEditing.ts's `originals`, imageEditing.ts's per-slot
      // src snapshot) need to know exactly what this save just wrote, so a
      // second edit compares against reality instead of a now-stale
      // pre-save value.
      saveSuccessFns.forEach((fn) => fn(state, result));
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
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
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
      if (active) buildLayerList();
      refresh();
      if (!active) {
        // Interaction modules with their own persistent UI (the
        // typography/colour control box) must not linger with a stale target
        // once edit mode is off — and neither should a selected frame.
        deactivateFns.forEach((fn) => fn());
        clearSelection();
      }
      return;
    }
    if (!active) return;
    // Same e.code reasoning as above. Not shifted, so a real Ctrl+Shift+Z
    // (browser redo in some apps) is left alone.
    if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
      e.preventDefault();
      performUndo();
      return;
    }
    if (e.key === 'Escape') {
      clearSelection();
    }
  });

  refresh();
}

/** Whether edit mode is currently on. Read by the interaction modules. */
export function isActive(): boolean {
  return active;
}

/** The frame the layer list currently has selected, or null. Read by
    imageEditing.ts on every pointerdown/wheel: a selection overrides normal
    hit-testing so a layer buried under others in the stack stays reachable. */
export function getSelectedFrame(): HTMLElement | null {
  return selectedFrame;
}

/** True when `el` sits inside the panel's own on-screen chrome (the bar,
    including its layer list, or the style-controls box) rather than page
    content. imageEditing.ts checks this before honouring a selection, so
    clicking a layer-list row or scrolling it is never reinterpreted as a drag
    or a zoom on the selected frame. */
export function isPanelChrome(el: Element | null): boolean {
  return !!el?.closest?.('.panel-bar, .panel-controls');
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
    disk" bookkeeping in step (textEditing.ts's `originals` map,
    imageEditing.ts's per-slot src snapshot). Called with the state that was
    saved and the server's SaveResult (which images actually landed where),
    after the request succeeds but before the store is cleared. A list for
    the same reason `onEditModeOff` is. */
export function onSaveSuccess(fn: (state: PanelState, result: SaveResult) => void): void {
  saveSuccessFns.push(fn);
}

/** Registered by an interaction module that owns a kind of edit (image, style
    or text), so it can repaint exactly the DOM it owns after Ctrl+Z or the
    Undo button pops the store's history. Called with what changed; every
    registrant checks `result.kind` and ignores the calls meant for the
    others. A list, for the same reason `onEditModeOff` is. */
export function onUndo(fn: (result: UndoResult) => void): void {
  undoFns.push(fn);
}

/** Registered by imageEditing.ts, the only module that knows how to turn a
    zoom value into a store write plus a repaint. A single slot, not a list
    like the callbacks above: there is exactly one such setter in the whole
    app (imageEditing.ts installs once), and overlay.ts calls it from the
    layer list's zoom slider — see that module's own doc comment on the call
    for why this indirection exists instead of an ordinary import. */
export function registerZoomSetter(fn: (frame: HTMLElement, zoom: number) => void): void {
  zoomSetter = fn;
}

/** Registered by imageEditing.ts, the only module that knows how to turn a
    frame-trim change into a store write plus a repaint. Same single-slot
    reasoning as registerZoomSetter. */
export function registerFrameSetter(
  fn: (frame: HTMLElement, height: number | undefined, anchor: number | undefined) => void,
): void {
  frameSetter = fn;
}

/** Registered by imageEditing.ts, the only module that knows how to turn a
    background-transparency toggle into a store write plus a repaint. Same
    single-slot reasoning as registerZoomSetter. */
export function registerBackgroundSetter(fn: (frame: HTMLElement, transparentBg: boolean) => void): void {
  backgroundSetter = fn;
}

/** Registered by imageEditing.ts so the badge's pending count includes
    dropped-but-unsaved images, which live outside PanelState (see that
    module's pendingUploads doc comment) and so are invisible to
    store.dirtyCount(). A single slot, not a list — same reasoning as
    registerZoomSetter. */
export function registerPendingUploadCounter(fn: () => number): void {
  pendingUploadCounter = fn;
}

/** Registered by imageEditing.ts so the Save button can include every
    queued drop in the request it sends — see that module's doc comment on
    why reading a File's bytes has to be async. A single slot, same
    reasoning as registerZoomSetter. */
export function registerPendingUploadsCollector(fn: () => Promise<ImageUploadRequest[]>): void {
  pendingUploadsCollector = fn;
}
