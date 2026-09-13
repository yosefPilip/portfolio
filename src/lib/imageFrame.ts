/** Flag the .frame wrapping a failed image so its labelled placeholder shows. */
export function markMissing(img: HTMLImageElement): void {
  const frame = img.closest('.frame');
  if (frame) frame.classList.add('is-missing');
}

/** Catch images that already failed before this module ran. */
export function sweepLoadedImages(doc: Document): void {
  Array.from(doc.images).forEach((img) => {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
  });
}

/**
 * Every image slot on the site is a real <img> at its final path. While the
 * file is missing the frame shows a labelled box at the exact aspect ratio, so
 * composition can be judged before spending on generation. Drop the file in
 * and it works with no code change.
 */
export function installImageFallback(doc: Document): void {
  // Capture phase: image error events do not bubble.
  doc.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) markMissing(target);
    },
    true,
  );
  sweepLoadedImages(doc);
}
