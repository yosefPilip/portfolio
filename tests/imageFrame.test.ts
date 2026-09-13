import { describe, it, expect, beforeEach } from 'vitest';
import { markMissing, sweepLoadedImages, installImageFallback } from '../src/lib/imageFrame';

function frameWithImage(): HTMLImageElement {
  document.body.innerHTML = `
    <figure class="frame" data-label="Hero — trees-back">
      <img src="/assets/img/trees-back.webp" alt="" />
    </figure>`;
  return document.querySelector('img')!;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('markMissing', () => {
  it('marks the wrapping frame so CSS can show the placeholder', () => {
    const img = frameWithImage();
    markMissing(img);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(true);
  });

  it('does nothing when the image is not inside a frame', () => {
    document.body.innerHTML = '<img src="/nope.webp" alt="" />';
    const img = document.querySelector('img')!;
    expect(() => markMissing(img)).not.toThrow();
    expect(document.querySelectorAll('.is-missing')).toHaveLength(0);
  });

  it('is idempotent', () => {
    const img = frameWithImage();
    markMissing(img);
    markMissing(img);
    expect(document.querySelector('.frame')!.className).toBe('frame is-missing');
  });
});

describe('sweepLoadedImages', () => {
  it('marks images that finished loading with no intrinsic width', () => {
    const img = frameWithImage();
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    sweepLoadedImages(document);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(true);
  });

  it('leaves successfully loaded images alone', () => {
    const img = frameWithImage();
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 2400 });
    sweepLoadedImages(document);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(false);
  });

  it('leaves still-loading images alone', () => {
    const img = frameWithImage();
    Object.defineProperty(img, 'complete', { value: false });
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    sweepLoadedImages(document);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(false);
  });
});

describe('installImageFallback', () => {
  it('capture phase reaches a real error event', () => {
    const img = frameWithImage();
    installImageFallback(document);
    img.dispatchEvent(new Event('error'));
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(true);
  });

  it('instanceof narrowing blocks non-image elements', () => {
    document.body.innerHTML = `
      <figure class="frame" data-label="Test">
        <div></div>
      </figure>`;
    const div = document.querySelector('div')!;
    installImageFallback(document);
    div.dispatchEvent(new Event('error'));
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(false);
  });

  it('sweep-on-install marks pre-failed images', () => {
    const img = frameWithImage();
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    installImageFallback(document);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(true);
  });

  it('leaves successfully loaded images alone through install', () => {
    const img = frameWithImage();
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 2400 });
    installImageFallback(document);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(false);
  });
});
