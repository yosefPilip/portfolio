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
    expect(s.get()).toEqual({ images: {}, styles: {} });
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
});
