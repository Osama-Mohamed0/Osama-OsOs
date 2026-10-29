"""Extract 3 frames (25/55/85%) from rendered scene videos and tile them: qa_frames.py out.png S01 S02 ..."""
import json, subprocess, sys
from PIL import Image, ImageDraw
tim = {s['id']: s for s in json.load(open('story/timing.json'))['scenes']}
out, ids = sys.argv[1], sys.argv[2:]
W, H = 640, 360
sheet = Image.new('RGB', (3 * W, len(ids) * H))
for r, sid in enumerate(ids):
    n = tim[sid]['frames']
    for c, frac in enumerate((0.25, 0.55, 0.85)):
        t = n * frac / 30
        p = f'/tmp/claude-0/vt/qa_{sid}_{c}.png'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.2f}', '-i', f'out/scenes/{sid}.mp4', '-frames:v', '1', '-s', f'{W}x{H}', p], check=True)
        im = Image.open(p).convert('RGB')
        d = ImageDraw.Draw(im); d.rectangle([0, 0, 120, 20], fill='black'); d.text((4, 4), f'{sid} {t:.1f}s', fill='white')
        sheet.paste(im, (c * W, r * H))
sheet.save(out)
