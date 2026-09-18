"""Force a white-ground plate's background to pure white, for mix-blend-mode: multiply.

A multiply plate composites as `top x bottom`, so its background only vanishes
when it is exactly 255. A generated "white" ground lands at 250-254, which
multiplies to a faint grey veil over everything behind it — visible as a haze
across the whole stack, and easy to misread as a grading problem in the image
underneath.

This is deterministic compositing, in the same family as grade.py -- NOT a
rescue of a bad render. If the subject itself is wrong, re-roll; do not reach
for this.

    python tools/whitepoint.py in.png out.png [--floor 235]

Pixels whose darkest channel is >= --floor snap to pure white; everything below
is rescaled off the measured white point so the subject keeps its relative
tone. Stray specks in the cleared band go with them, which matters because
under multiply a speck is a dark dot sitting on the title.

Unlike grade.py this never calls convert('RGB') on an alpha image, but a
white-ground plate has no alpha to protect in the first place -- that is the
whole point of the white-ground (Tier 2) route over a cutout (Tier 3).
"""

import argparse

import numpy as np
from PIL import Image


def matte(src, dst, lo=8, hi=200):
    """Clamp a generated alpha channel to a clean matte (Tier 3 cutouts).

    `--transparent` rolls come back with no pixel at a=255: the body of the
    subject sits at 250-254 and the whole plate renders as a veil rather than
    an occluder. That is the `trunks-near` halo in a milder form, and on this
    site it shows up as a title that stays readable through solid rock.

    Alpha at or above --hi snaps to 255 and at or below --lo snaps to 0; the
    band between is rescaled, so genuinely antialiased edge pixels keep their
    ramp and only the body and the void get forced.
    """
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(np.float64)
    al = a[..., 3]

    before = ((al > 0) & (al < 255)).mean() * 100
    out = np.clip((al - lo) * (255.0 / (hi - lo)), 0, 255)
    a[..., 3] = out
    Image.fromarray(a.round().astype(np.uint8), "RGBA").save(dst)

    after = ((out > 0) & (out < 255)).mean() * 100
    print(f"{src} -> {dst}")
    print(f"  partial alpha     {before:.2f}% -> {after:.2f}%")
    print(f"  fully opaque      {(out == 255).mean() * 100:.1f}%")
    return before, after


def whitepoint(src, dst, floor=235):
    im = np.asarray(Image.open(src).convert("RGB")).astype(np.float64)

    near_white = im.min(axis=2) >= floor
    if not near_white.any():
        raise SystemExit(
            f"{src}: no pixel has all channels >= {floor} — this is not a "
            "white-ground plate, or --floor is set too high."
        )

    # Measure the white point off the ground itself, not off the whole frame:
    # a dark subject would drag a global max/mean away from what we are fixing.
    wp = im[near_white].mean()
    out = np.clip(im * (255.0 / wp), 0, 255)
    out[near_white] = 255.0

    Image.fromarray(out.round().astype(np.uint8)).save(dst)

    cleared = near_white.mean() * 100
    print(f"{src} -> {dst}")
    print(f"  white point       {wp:.1f} -> 255.0")
    print(f"  ground cleared    {cleared:.1f}% of pixels snapped to pure white")
    return wp, cleared


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--floor", type=int, default=235)
    ap.add_argument(
        "--alpha",
        action="store_true",
        help="Tier 3 cutout: clamp the alpha matte instead of the white ground.",
    )
    ap.add_argument("--lo", type=int, default=8)
    ap.add_argument("--hi", type=int, default=200)
    a = ap.parse_args()
    if a.alpha:
        matte(a.src, a.dst, a.lo, a.hi)
    else:
        whitepoint(a.src, a.dst, a.floor)
