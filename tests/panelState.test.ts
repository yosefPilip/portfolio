// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../src/panel/state';
import { MANIFEST } from '../src/panel/manifest';

/** Mirrors server/paths.ts's allowlist. Duplicated rather than imported:
    src/panel/server/ is a separate tsconfig project that browser-side code —
    and this file, which imports browser-side code — must not reach into. */
const ALLOWED_TARGETS = [
  'src/styles/layout.generated.css',
  'index.html',
  'projects.html',
  'music.html',
  'workshop.html',
  'projects/cache-it.html',
];

beforeEach(() => localStorage.clear());

describe('MANIFEST', () => {
  it('offers only font families tokens.css defines', () => {
    expect(MANIFEST.fonts).toEqual(['display', 'body', 'mono']);
  });

  it('maps a pathname to the HTML file the panel would patch', () => {
    expect(MANIFEST.pageForPath('/')).toBe('index.html');
    expect(MANIFEST.pageForPath('/music.html')).toBe('music.html');
    expect(MANIFEST.pageForPath('/projects/cache-it.html')).toBe('projects/cache-it.html');
  });

  it('maps the extensionless URLs the site actually produces to their .html file', () => {
    // caseStudyRoute.pathForSlug builds exactly this, and projects.html pushes
    // it. Returning it unchanged handed the endpoint "projects/cache-it",
    // which resolveWriteTarget rejects — every case-study text save failed.
    expect(MANIFEST.pageForPath('/projects/cache-it')).toBe('projects/cache-it.html');
    expect(MANIFEST.pageForPath('/projects')).toBe('projects.html');
    expect(MANIFEST.pageForPath('/music')).toBe('music.html');
    expect(MANIFEST.pageForPath('/workshop')).toBe('workshop.html');
  });

  it('tolerates a trailing slash, as slugFromPath does', () => {
    expect(MANIFEST.pageForPath('/projects/cache-it/')).toBe('projects/cache-it.html');
    expect(MANIFEST.pageForPath('/')).toBe('index.html');
  });

  it('maps every real route onto a path the write allowlist accepts', () => {
    for (const url of ['/', '/index.html', '/projects', '/music', '/workshop', '/projects/cache-it']) {
      expect(ALLOWED_TARGETS, url).toContain(MANIFEST.pageForPath(url));
    }
  });
});

describe('createStore', () => {
  it('starts empty and clean', () => {
    const s = createStore();
    expect(s.dirtyCount()).toBe(0);
    expect(s.get()).toEqual({ images: {}, styles: {}, text: {} });
  });

  it('clamps framing on the way in', () => {
    const s = createStore();
    s.setImage('A', { x: -5, y: 200, zoom: 0.2 });
    expect(s.get().images.A).toEqual({ x: 0, y: 100, zoom: 1 });
  });

  it('counts each edited slot once, however many times it is dragged', () => {
    const s = createStore();
    s.setImage('A', { x: 10, y: 10, zoom: 1 });
    s.setImage('A', { x: 20, y: 20, zoom: 1 });
    s.setImage('B', { x: 30, y: 30, zoom: 1 });
    expect(s.dirtyCount()).toBe(2);
  });

  it('merges style patches rather than replacing them', () => {
    const s = createStore();
    s.setStyle('hero.intro', { font: 'mono' });
    s.setStyle('hero.intro', { color: 'muted' });
    expect(s.get().styles['hero.intro']).toEqual({ font: 'mono', color: 'muted' });
  });

  it('records a text edit with setText, keyed "<file>::<id>"', () => {
    const s = createStore();
    s.setText('index.html', 'hero.intro', 'Old text', 'New text');
    expect(s.get().text['index.html::hero.intro']).toEqual({
      file: 'index.html',
      id: 'hero.intro',
      before: 'Old text',
      after: 'New text',
    });
    expect(s.dirtyCount()).toBe(1);
  });

  it('mutating a returned text entry does NOT affect the store (deep-copy)', () => {
    const s = createStore();
    s.setText('index.html', 'hero.intro', 'A', 'B');
    const snapshot = s.get();
    snapshot.text['index.html::hero.intro'].after = 'TAMPERED';
    expect(s.get().text['index.html::hero.intro'].after).toBe('B');
  });

  it('discards a wrong-typed "text" field rather than trusting it', () => {
    localStorage.setItem('panel:state', '{"images":{},"styles":{},"text":"x"}');
    const s = createStore();
    expect(s.get()).toEqual({ images: {}, styles: {}, text: {} });
  });

  it('discards an array-shaped "text" field rather than losing edits silently', () => {
    localStorage.setItem('panel:state', '{"images":{},"styles":{},"text":[]}');
    const s = createStore();
    s.setText('index.html', 'hero.intro', 'A', 'B');
    // Without the fix, "text" would persist as [] and this edit would be lost on reload.
    expect(createStore().get().text['index.html::hero.intro']).toBeDefined();
  });

  it('survives a reload through localStorage', () => {
    const s = createStore();
    s.setImage('A', { x: 12, y: 34, zoom: 1.5 });
    expect(createStore().get().images.A).toEqual({ x: 12, y: 34, zoom: 1.5 });
  });

  it('clear() empties both the store and the mirror', () => {
    const s = createStore();
    s.setImage('A', { x: 1, y: 2, zoom: 1 });
    s.clear();
    expect(s.dirtyCount()).toBe(0);
    expect(createStore().dirtyCount()).toBe(0);
  });

  it('ignores corrupt persisted state rather than throwing on load', () => {
    localStorage.setItem('panel:state', '{not json');
    expect(() => createStore()).not.toThrow();
    expect(createStore().dirtyCount()).toBe(0);
  });

  it('discards wrong-typed persisted shape (Finding 1)', () => {
    // strings, numbers, etc for images or styles should not be trusted
    localStorage.setItem('panel:state', '{"images":"x","styles":1}');
    const s = createStore();
    expect(s.get()).toEqual({ images: {}, styles: {}, text: {} });
  });

  it('discards array-shaped persisted state (Finding 2)', () => {
    // arrays can pass the truthy check but JSON.stringify drops non-index properties,
    // causing silent work loss on reload
    localStorage.setItem('panel:state', '{"images":[],"styles":[]}');
    const s = createStore();
    s.setImage('A', { x: 1, y: 2, zoom: 1 });
    // Without the fix, this would persist as [] and be lost on reload.
    // With the fix, arrays are rejected and the slot edit is stored in a proper object.
    expect(createStore().get().images.A).toBeDefined();
  });

  it('mutating a key ON the returned copy does NOT affect the store (Finding 3 part 1)', () => {
    const s = createStore();
    s.setImage('A', { x: 1, y: 2, zoom: 1 });
    const snapshot = s.get();
    snapshot.images.A = { x: 99, y: 99, zoom: 99 };
    // The store should be unaffected by the mutation
    expect(s.get().images.A).toEqual({ x: 1, y: 2, zoom: 1 });
  });

  it('mutating a leaf property does NOT affect the store (Finding 3 part 2)', () => {
    const s = createStore();
    s.setImage('A', { x: 50, y: 50, zoom: 1 });

    // Get the snapshot and mutate a leaf's property directly (bypasses clampFraming)
    const snapshot = s.get();
    snapshot.images.A.x = 99999;

    // The store should be unaffected
    expect(s.get().images.A.x).toBe(50);

    // And the persisted value should be untouched
    expect(createStore().get().images.A.x).toBe(50);
  });

  it('does not count __proto__ as a dirty slot (Finding 5 part 1)', () => {
    // JSON.parse can create __proto__ as an own enumerable property
    localStorage.setItem('panel:state', '{"images":{"__proto__":{}},"styles":{}}');
    const s = createStore();
    expect(s.dirtyCount()).toBe(0);
  });

  it('strips __proto__ on load so it never enters state (Finding 5 part 2)', () => {
    localStorage.setItem('panel:state', '{"images":{"__proto__":{},"A":{"x":1,"y":2,"zoom":1}},"styles":{}}');
    const s = createStore();
    // Check that __proto__ is not an own property of the images object
    expect(Object.prototype.hasOwnProperty.call(s.get().images, '__proto__')).toBe(false);
  });
});

describe('saved vs pending — a Save must never delete what an earlier Save wrote', () => {
  it('keeps a committed framing rule in the state generateCss is handed', () => {
    const s = createStore();
    s.setImage('Hero L5', { x: 42, y: 61, zoom: 1.12 });
    s.commit();
    // The next Save rewrites layout.generated.css WHOLESALE from this state.
    // If the slot is missing here, that write silently deletes its rule.
    expect(s.get().images['Hero L5']).toEqual({ x: 42, y: 61, zoom: 1.12 });
  });

  it('a later text-only save still carries every earlier framing rule', () => {
    const s = createStore();
    s.setImage('Hero L5', { x: 42, y: 61, zoom: 1.12 });
    s.commit();
    s.setText('index.html', 'hero.intro', 'Old', 'New');
    s.commit();
    expect(s.get().images['Hero L5']).toEqual({ x: 42, y: 61, zoom: 1.12 });
  });

  it('returns the pending count to zero on commit, so the badge means "unsaved"', () => {
    const s = createStore();
    s.setImage('Hero L5', { x: 1, y: 2, zoom: 1 });
    s.setStyle('hero.intro', { font: 'mono' });
    s.setText('index.html', 'hero.intro', 'Old', 'New');
    expect(s.dirtyCount()).toBe(3);
    s.commit();
    expect(s.dirtyCount()).toBe(0);
  });

  it('drops committed text edits — they are in the HTML and must not re-apply', () => {
    const s = createStore();
    s.setText('index.html', 'hero.intro', 'Old', 'New');
    s.commit();
    expect(s.get().text).toEqual({});
  });

  it('UPDATES a re-edited slot rather than duplicating it', () => {
    const s = createStore();
    s.setImage('Hero L5', { x: 42, y: 61, zoom: 1.12 });
    s.commit();
    s.setImage('Hero L5', { x: 10, y: 20, zoom: 1 });
    expect(Object.keys(s.get().images)).toEqual(['Hero L5']);
    expect(s.get().images['Hero L5']).toEqual({ x: 10, y: 20, zoom: 1 });
  });

  it('merges a pending style patch onto a committed one for the same block', () => {
    const s = createStore();
    s.setStyle('hero.intro', { font: 'mono' });
    s.commit();
    s.setStyle('hero.intro', { color: 'muted' });
    expect(s.get().styles['hero.intro']).toEqual({ font: 'mono', color: 'muted' });
  });

  it('survives a reload: committed rules come back, the pending count does not', () => {
    const s = createStore();
    s.setImage('Hero L5', { x: 42, y: 61, zoom: 1.12 });
    s.setStyle('hero.intro', { font: 'mono' });
    s.commit();
    const reloaded = createStore();
    expect(reloaded.get().images['Hero L5']).toEqual({ x: 42, y: 61, zoom: 1.12 });
    expect(reloaded.get().styles['hero.intro']).toEqual({ font: 'mono' });
    expect(reloaded.dirtyCount()).toBe(0);
  });

  it('puts committed state through the same hardening as pending state', () => {
    localStorage.setItem(
      'panel:state',
      JSON.stringify({
        images: {},
        styles: {},
        text: {},
        saved: { images: { A: { x: -5, y: 200, zoom: 0.2 }, B: 'nope' }, styles: [] },
      }),
    );
    const s = createStore();
    // clampFraming applied, a non-object entry dropped, an array-shaped
    // styles map discarded rather than trusted.
    expect(s.get().images.A).toEqual({ x: 0, y: 100, zoom: 1 });
    expect(s.get().images.B).toBeUndefined();
    expect(s.get().styles).toEqual({});
  });

  it('strips __proto__ out of committed state too', () => {
    localStorage.setItem(
      'panel:state',
      '{"images":{},"styles":{},"text":{},"saved":{"images":{"__proto__":{},"A":{"x":1,"y":2,"zoom":1}},"styles":{}}}',
    );
    const s = createStore();
    expect(Object.prototype.hasOwnProperty.call(s.get().images, '__proto__')).toBe(false);
    expect(s.get().images.A).toBeDefined();
  });

  it('tolerates a mirror written before committed state existed', () => {
    localStorage.setItem('panel:state', '{"images":{"A":{"x":1,"y":2,"zoom":1}},"styles":{},"text":{}}');
    const s = createStore();
    expect(s.dirtyCount()).toBe(1);
    expect(s.get().images.A).toEqual({ x: 1, y: 2, zoom: 1 });
  });

  it('clear() is the full reset — committed rules go too', () => {
    const s = createStore();
    s.setImage('A', { x: 1, y: 2, zoom: 1 });
    s.commit();
    s.clear();
    expect(s.get()).toEqual({ images: {}, styles: {}, text: {} });
    expect(createStore().get()).toEqual({ images: {}, styles: {}, text: {} });
  });
});

describe('dropText — the only exit from a stale-file wedge', () => {
  it('removes one pending text edit and leaves the rest alone', () => {
    const s = createStore();
    s.setText('index.html', 'hero.intro', 'Old', 'New');
    s.setText('index.html', 'thesis.body', 'Old2', 'New2');
    s.dropText('index.html', 'hero.intro');
    expect(s.get().text['index.html::hero.intro']).toBeUndefined();
    expect(s.get().text['index.html::thesis.body']).toBeDefined();
    expect(s.dirtyCount()).toBe(1);
  });

  it('un-persists it, so a reload does not bring the conflict back', () => {
    const s = createStore();
    s.setText('index.html', 'hero.intro', 'Old', 'New');
    s.dropText('index.html', 'hero.intro');
    expect(createStore().dirtyCount()).toBe(0);
  });

  it('never touches image or typography edits', () => {
    const s = createStore();
    s.setImage('A', { x: 1, y: 2, zoom: 1 });
    s.setText('index.html', 'hero.intro', 'Old', 'New');
    s.dropText('index.html', 'hero.intro');
    expect(s.get().images.A).toBeDefined();
  });

  it('is a no-op for an id that is not pending', () => {
    const s = createStore();
    s.setText('index.html', 'hero.intro', 'Old', 'New');
    s.dropText('index.html', 'not-a-thing');
    expect(s.dirtyCount()).toBe(1);
  });
});
