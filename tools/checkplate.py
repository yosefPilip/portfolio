"""Gate a generated plate before it is accepted.

Two numbers decide whether a render is usable, and both were learned the
expensive way:

  corner RGB  A multiply layer's background must be pure white. An off-white
              or vignetted ground leaves a grey wash over everything behind
              it and misreads as "the blend doesn't work" (Plan 4 Ruling 7).

  coverage    The fraction of non-white pixels in the band where the wordmark
              sits. The previous front plate covered most of the owner's name.
              Cap is 25%, measured rather than judged by eye.
"""
import sys
import numpy as np
from PIL import Image

# Mobile safe band: at 390x844 the plate is 398x1047 and a 3:2 source keeps
# only its centre 25.3% of width. Anything outside 37.5%-62.5% is gone.
BAND_X = (0.375, 0.625)
BAND_Y = (0.40, 0.62)
WHITE = 250
CAP = 0.25


def report(path, band_x=BAND_X, band_y=BAND_Y):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    h, w, _ = a.shape
    c = 40
    corners = np.concatenate([
        a[:c, :c].reshape(-1, 3), a[:c, -c:].reshape(-1, 3),
        a[-c:, :c].reshape(-1, 3), a[-c:, -c:].reshape(-1, 3),
    ])
    x0, x1 = int(w * band_x[0]), int(w * band_x[1])
    y0, y1 = int(h * band_y[0]), int(h * band_y[1])
    coverage = float((a[y0:y1, x0:x1].min(axis=2) < WHITE).mean())

    print(f'{path}')
    print(f'  size                {w}x{h}')
    print(f'  corner mean RGB     {corners.mean(axis=0).round(1).tolist()}')
    print(f'  corner min RGB      {corners.min(axis=0).tolist()}')
    print(f'  wordmark coverage   {coverage * 100:.1f}%   cap {CAP * 100:.0f}%')
    if corners.min() < WHITE:
        print('  WARNING: background is not pure white — push the white point '
              'before judging any composite.')
    if coverage > CAP:
        print('  WARNING: over the coverage cap — this will swallow the name.')
    return coverage


if __name__ == '__main__':
    report(sys.argv[1])
