"""Procedural parchment textures (numpy). Output public/tex/*.png"""
import numpy as np, os
from scipy.ndimage import zoom, gaussian_filter
from PIL import Image
rng = np.random.default_rng(1402)
os.makedirs('public/tex', exist_ok=True)

def fbm(h, w, octaves=6, base=4):
    out = np.zeros((h, w)); amp = 1.0; tot = 0
    for o in range(octaves):
        n = base * 2 ** o
        g = rng.random((n + 2, int(n * w / h) + 2))
        z = zoom(g, (h / n, w / (n * w / h)), order=3)[:h, :w]
        out += amp * z; tot += amp; amp *= 0.55
    out /= tot
    return (out - out.min()) / (out.max() - out.min())

def hexrgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)

def parchment(w, h, light, mid, dark, name, stain=0.35, fibers=0.06):
    n = fbm(h, w)
    blot = fbm(h, w, 3, 2)
    c = hexrgb(light)[None, None] * (1 - n[..., None]) + hexrgb(mid)[None, None] * n[..., None]
    # stains
    s = np.clip((blot - 0.62) * 3, 0, 1) * stain
    c = c * (1 - s[..., None]) + hexrgb(dark)[None, None] * s[..., None]
    # fibers: thin stretched noise
    f = gaussian_filter(rng.standard_normal((h, w)), (0.6, 6)) * fibers * 255
    f2 = gaussian_filter(rng.standard_normal((h, w)), (5, 0.6)) * fibers * 120
    grain = rng.standard_normal((h, w)) * 5
    c = c + (f + f2 + grain)[..., None]
    # edge burn
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.maximum(np.abs(xx / w - 0.5) * 2, np.abs(yy / h - 0.5) * 2)
    burn = np.clip((d - 0.78) / 0.22, 0, 1) ** 2 * (0.55 + 0.45 * fbm(h, w, 4, 6))
    c = c * (1 - burn[..., None] * 0.55) + hexrgb(dark)[None, None] * burn[..., None] * 0.25
    Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).save(f'public/tex/{name}.png', optimize=True)
    print(name)

parchment(2400, 1350, '#F3E6C8', '#E2CC9F', '#9C7F52', 'parchment')
parchment(2400, 1350, '#3A2E26', '#241C17', '#0E0B09', 'parchment_dark', stain=0.5, fibers=0.04)
parchment(3215, 2160, '#F1E2C0', '#DCC497', '#9C7F52', 'map_paper', stain=0.4)
# seamless-ish grain tile for an animated film-grain overlay
g = (rng.standard_normal((512, 512)) * 28 + 128).clip(0, 255).astype(np.uint8)
Image.fromarray(g).save('public/tex/grain.png')
print('grain')
