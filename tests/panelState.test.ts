// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../src/panel/state';
import { MANIFEST } from '../src/panel/manifest';

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
