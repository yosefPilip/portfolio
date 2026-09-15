"""The Overgrowth grade. Every generated image gets this exact function so the
set reads as one shoot: pull blue out of the atmosphere, push green/yellow in,
weighted by lightness so shadows stay neutral. gamma/exposure per-image."""
import sys
import numpy as np
from PIL import Image

def grade(src, dst, gamma=0.92, exposure=1.0, blue=0.30, green=0.10, red=0.045):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    a *= exposure
    a = np.clip(a, 0, 1)
    L = a.mean(axis=2, keepdims=True)
    w = np.clip((L - 0.10) / 0.60, 0, 1)
    a[..., 2:3] *= (1.0 - blue * w)
    a[..., 1:2] *= (1.0 + green * w)
    a[..., 0:1] *= (1.0 + red * w)
    a = np.clip(a, 0, 1)
    a = np.power(a, gamma)
    Image.fromarray((a * 255).astype(np.uint8)).save(dst)
    return dst

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    kw = dict(p.split('=') for p in sys.argv[3:])
    grade(src, dst, **{k: float(v) for k, v in kw.items()})
