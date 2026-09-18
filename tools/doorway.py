"""Measure the doorway rectangle in a facade plate, for the dolly's CSS.

`#arrive .doorway` and `#arrive .face > .door` are positioned in percentages
that must land exactly on the opening painted into cottage-face.webp. Those
percentages are measurements, not taste, and there is no seed — so if the
facade is ever re-rolled they all change together. Re-run this and paste the
numbers into workshop.css rather than nudging them by eye.

    python tools/doorway.py assets/img/cottage-face.webp

The opening is the darkest flat region on the facade. A single darkest block
seeds a rectangle which then grows while each new edge row/column stays dark,
which is reliable here because the opening is painted as near-black with no
detail in it (measured std ~2) while every other dark area — logs, bark,
shadowed forest — carries texture.

Prints the CSS percentages directly, and the sanity checks that matter: the
opening must be roughly rectangular, centred inside the mobile safe band
(37.5-62.5% of width), and flat enough that we really found a hole and not a
shadow.
"""

import argparse

import numpy as np
from PIL import Image


def find_doorway(path, seed_block=64, tol=14.0):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.float64)
    h, w, _ = im.shape
    g = im.mean(axis=2)

    # Seed on the darkest block, searched only across the facade itself — the
    # frame edges are forest and often darker than the opening.
    best = None
    for y in range(int(h * 0.40), int(h * 0.85) - seed_block, seed_block // 2):
        for x in range(int(w * 0.30), int(w * 0.75) - seed_block, seed_block // 2):
            m = g[y : y + seed_block, x : x + seed_block].mean()
            if best is None or m < best[0]:
                best = (m, x, y)
    seed_mean, sx, sy = best
    thr = seed_mean + tol

    x0, x1, y0, y1 = sx, sx + seed_block, sy, sy + seed_block
    for _ in range(8000):
        moved = False
        if x0 > 0 and g[y0:y1, x0 - 1].mean() < thr:
            x0 -= 1
            moved = True
        if x1 < w - 1 and g[y0:y1, x1 + 1].mean() < thr:
            x1 += 1
            moved = True
        if y0 > 0 and g[y0 - 1, x0:x1].mean() < thr:
            y0 -= 1
            moved = True
        if y1 < h - 1 and g[y1 + 1, x0:x1].mean() < thr:
            y1 += 1
            moved = True
        if not moved:
            break

    return (x0, x1, y0, y1), (w, h), g[y0:y1, x0:x1].std()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("src")
    a = ap.parse_args()

    (x0, x1, y0, y1), (w, h), std = find_doorway(a.src)
    fw, fh = (x1 - x0) / w, (y1 - y0) / h
    cx, cy = ((x0 + x1) / 2) / w, ((y0 + y1) / 2) / h

    print(f"{a.src}  ({w}x{h})")
    print(f"  opening px        x {x0}-{x1}   y {y0}-{y1}")
    print(f"  flatness (std)    {std:.1f}   <6 means a real hole, not a shadow")
    print(f"  centre            x {cx:.4f}  y {cy:.4f}")
    if not 0.375 <= cx <= 0.625:
        print("  WARNING: centre is outside the 37.5-62.5% mobile safe band.")
    if std >= 6:
        print("  WARNING: region is textured — this is probably not the opening.")
    print()
    print("  paste into workshop.css:")
    print(f"    #arrive .face          transform-origin: {cx * 100:.2f}% {cy * 100:.2f}%;")
    print(f"                           translate(-{cx * 100:.2f}%, -{cy * 100:.2f}%)")
    print(f"    .doorway / .door       left: {x0 / w * 100:.2f}%;  top: {y0 / h * 100:.2f}%;")
    print(f"                           width: {fw * 100:.2f}%;  height: {fh * 100:.2f}%;")
    print()
    print(f"  a literal dolly would need {1 / fw:.1f}x zoom — which is why the")
    print("  opening is grown and the picture held still instead.")
