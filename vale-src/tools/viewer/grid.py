import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB'); W, H = im.size; g = ImageDraw.Draw(im); flip = len(sys.argv) > 2
for k in range(1, 20):
    t = k / 20; c = (220, 60, 60) if k % 2 == 0 else (240, 170, 170)
    x = int(t * W); y = int(t * H)
    g.line([(x, 0), (x, H)], fill=c); g.line([(0, y), (W, y)], fill=(60, 60, 220) if k % 2 == 0 else (170, 170, 240))
    if k % 2 == 0: g.text((x + 2, 2), f'{(1 - t) if flip else t:.1f}', fill=(200, 0, 0)); g.text((2, y + 2), f'{1 - t:.1f}', fill=(0, 0, 200))
im.save(sys.argv[1])
