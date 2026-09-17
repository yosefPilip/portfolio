"""Alpha-safe atmospheric veil for Tier-3 cutout plates.

`grade.py` is the sitewide grade and every generated image still gets it — but
it does two things that are wrong for a Tier-3 cutout like `ridge-near`:

  1. It `convert('RGB')`s, which DESTROYS the alpha channel. A cutout graded
     through it comes back as an opaque rectangle and the whole parallax
     silhouette is gone.
  2. Its colour shift (blue out, green/yellow in) is tuned for the jungle set
     and is wrong for a slate room — the ledger already records the ridge
     images being graded with the shift zeroed.

This module does the slate-room grade and adds the thing grading alone cannot
do: an atmospheric veil.

WHY A VEIL AND NOT A RE-ROLL. The front plate rendered with directional
sunlight and hard cast shadows while the back plate is flat overcast, so the
pair read as two different days. Measured against `ridge-far`, the raw front
plate sat at luminance 106 / shadow floor 11 / fine detail 41.4, against the
back's 184 / 85 / 16.8. Grading alone closes the luminance gap but barely
touches fine detail (41.4 -> 38.8): it cannot remove a cast shadow. Lifting the
image toward a bone-white haze does both at once, because most of the "thousands
of little sharp rock edges" ARE shadow contrast — veil the shadows and the
busyness goes with them. Measured after: 144.5 / 51.3 / 34.0.

The veil is not a flat wash. It is smooth noise stretched ~4x horizontally so
it reads as wind-driven banding, concentrated around 60% down the frame — where
cloud actually sits on a mountain — over a small constant base haze.

Deterministic: the seed is fixed, so re-running reproduces the shipped asset
byte-for-byte. Never run it twice on its own output; always start from the
untouched roll in `assets/img/roll-*.png`.

    python tools/mist.py assets/img/roll-near-09.png assets/img/ridge-near.webp
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

# Cool bone-white. NOT pure #fff — the concept bans pure white, and a pure-white
# haze over a slate room reads as a blown highlight rather than as weather.
MIST_RGB = (0.902, 0.925, 0.949)

SEED = 7
BASE_HAZE = 0.07          # constant aerial perspective across the whole plate
BAND_STRENGTH = 0.30      # extra veil at the band's centre
BAND_CENTRE = 0.60        # fraction down the frame where cloud sits
BAND_WIDTH = 0.17         # gaussian sigma of the band
GAMMA = 0.70              # slate-room grade: lifts shadows, colour shift zeroed


def mist(src, dst, gamma=GAMMA, base=BASE_HAZE, strength=BAND_STRENGTH,
         centre=BAND_CENTRE, width=BAND_WIDTH, seed=SEED):
    im = Image.open(src).convert('RGBA')
    alpha = im.getchannel('A')
    h, w = alpha.size[1], alpha.size[0]

    rgb = np.asarray(im.convert('RGB')).astype(np.float32) / 255.0
    graded = np.power(np.clip(rgb, 0, 1), gamma)

    # Smooth noise, stretched horizontally (cells are 4x wider than tall) so the
    # veil bands sideways like wind-driven spindrift instead of pooling in blobs.
    rng = np.random.default_rng(seed)
    cells = rng.random((max(2, h // 160), max(2, w // 40))).astype(np.float32)
    field = Image.fromarray((cells * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    field = field.filter(ImageFilter.GaussianBlur(28))
    noise = np.asarray(field).astype(np.float32) / 255.0
    spread = noise.max() - noise.min()
    noise = (noise - noise.min()) / spread if spread > 0 else np.zeros_like(noise)

    y = np.linspace(0, 1, h, dtype=np.float32).reshape(h, 1)
    band = np.exp(-((y - centre) ** 2) / (2 * width ** 2))
    veil = np.clip(base + strength * noise * band, 0, 1)[..., None]

    out = graded * (1 - veil) + np.array(MIST_RGB, dtype=np.float32) * veil

    res = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    # The untouched matte goes straight back on: the veil only ever touched RGB,
    # so the silhouette is bit-identical to the roll it came from.
    res.putalpha(alpha)
    if dst.lower().endswith('.webp'):
        res.save(dst, 'WEBP', quality=86, method=6, exact=True)
    else:
        res.save(dst)
    return dst


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    kw = dict(p.split('=') for p in sys.argv[3:])
    mist(src, dst, **{k: float(v) for k, v in kw.items()})
