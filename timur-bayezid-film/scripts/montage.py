"""Tile still images into one contact sheet: montage.py out.png img1 img2 ..."""
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = 960, 540
cols = 2 if len(ims) > 1 else 1
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), 'black')
for i, (im, f) in enumerate(zip(ims, files)):
    im = im.resize((w, h))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 260, 30], fill='black')
    d.text((6, 6), f.split('/')[-1], fill='white')
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out)
