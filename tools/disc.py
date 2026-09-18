"""Gate a spinning disc on circularity and centre, for the Music match cut.

The Music hero cross-fades a rotating ammonite into a rotating jog wheel. The
cut only reads as one object changing if both discs share a centre and a
diameter — and because both are ROTATING, any error is not static: an off-centre
disc wobbles, and a non-circular one pumps, once per revolution. Neither is
visible in a still, which is exactly why this is a measurement and not a look.

    python tools/disc.py assets/img/ammonite.webp

Reports, from the alpha channel:

  bbox aspect   width/height of the opaque bounding box. 1.000 is a circle.
                >2% out and the disc pumps as it turns.
  centroid      the opaque mass centre, as a fraction of the bbox. 0.5/0.5
                is balanced. >1% out and the disc wobbles on its axis.
  fill ratio    opaque area against the area of the circle its bbox implies,
                so a solid disc approaches 1.000. Far below that means the
                shape is not really a disc and the rotation will read as a
                shape tumbling rather than a wheel spinning. (Divide by the
                square bbox instead and a disc gives pi/4 = 0.785 — this tool
                deliberately does not, because the useful question is 'how
                close to a circle', not 'how much of the square'.)

The numbers that matter are printed for BOTH discs so they can be compared —
`--against` takes the other disc and reports the diameter ratio the CSS must
apply to make them the same size on screen.
"""

import argparse

import numpy as np
from PIL import Image


def measure(path):
    a = np.asarray(Image.open(path).convert("RGBA")).astype(np.float64)
    al = a[..., 3]
    solid = al > 128
    if not solid.any():
        raise SystemExit(f"{path}: no opaque pixels — is this a cutout?")

    ys, xs = np.where(solid)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    w, h = x1 - x0, y1 - y0

    # Centroid of the opaque mass, relative to the bounding box.
    cx = (xs.mean() - x0) / w
    cy = (ys.mean() - y0) / h

    area = solid.sum()
    fill = area / (np.pi * (max(w, h) / 2.0) ** 2)

    return {
        "path": path,
        "bbox": (int(x0), int(x1), int(y0), int(y1)),
        "w": int(w),
        "h": int(h),
        "aspect": w / h,
        "cx": cx,
        "cy": cy,
        "fill": fill,
        "partial": float(((al > 0) & (al < 255)).mean() * 100),
    }


def report(m):
    print(f"{m['path']}")
    print(f"  opaque bbox     {m['w']}x{m['h']}  at x{m['bbox'][0]}-{m['bbox'][1]} y{m['bbox'][2]}-{m['bbox'][3]}")
    ok_a = abs(m["aspect"] - 1.0) <= 0.02
    print(f"  bbox aspect     {m['aspect']:.3f}   {'ok' if ok_a else 'FAIL — disc will pump as it turns'}")
    ok_c = abs(m["cx"] - 0.5) <= 0.01 and abs(m["cy"] - 0.5) <= 0.01
    print(f"  centroid        {m['cx']:.3f} / {m['cy']:.3f}   {'ok' if ok_c else 'FAIL — disc will wobble on its axis'}")
    print(f"  fill ratio      {m['fill']:.3f}   (a solid disc approaches 1.000)")
    print(f"  partial alpha   {m['partial']:.2f}%   (clamp with tools/whitepoint.py --alpha)")
    return ok_a and ok_c


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("src")
    ap.add_argument("--against", help="the other disc, to report the diameter ratio")
    a = ap.parse_args()

    m = measure(a.src)
    ok = report(m)

    if a.against:
        n = measure(a.against)
        print()
        ok = report(n) and ok
        ratio = max(m["w"], m["h"]) / max(n["w"], n["h"])
        print()
        print(f"  diameter ratio  {a.src} is {ratio:.4f}x {a.against}")
        print(f"  -> to render at the same size, scale the second by {ratio:.4f}")

    raise SystemExit(0 if ok else 1)
