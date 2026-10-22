#!/usr/bin/env python3
"""Make icons/icon16.png, icon48.png, icon128.png from a logo file.

  python3 tools/make-icons.py path/to/logo.png            # square-crop + resize
  python3 tools/make-icons.py path/to/logo.svg            # needs: pip install cairosvg
  python3 tools/make-icons.py logo.png --bg "#0b1a33"     # pad to square on a colour instead of cropping
  python3 tools/make-icons.py logo.png --pad 0.12         # inner padding as a fraction of the icon

Tip: on your company website, right-click the logo → "Copy image address" / "Save image as…", or grab
the <link rel="icon"> / apple-touch-icon from the page source. Save it next to this repo and run the script.
"""
import argparse, io, os, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('--bg', default=None, help='hex colour to pad with (default: transparent crop to square)')
ap.add_argument('--pad', type=float, default=0.0, help='inner padding fraction, e.g. 0.1')
ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'icons'))
a = ap.parse_args()

if a.src.lower().endswith('.svg'):
    try:
        import cairosvg
    except ImportError:
        sys.exit('SVG input needs cairosvg: pip install cairosvg  (or export the SVG to a 512px PNG first)')
    png = cairosvg.svg2png(url=a.src, output_width=512, output_height=512)
    im = Image.open(io.BytesIO(png)).convert('RGBA')
else:
    im = Image.open(a.src).convert('RGBA')

w, h = im.size
side = max(w, h)
if a.bg:
    canvas = Image.new('RGBA', (side, side), a.bg)
    canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
    im = canvas
else:
    m = min(w, h)
    im = im.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m))

os.makedirs(a.out, exist_ok=True)
for size in (16, 48, 128):
    inner = int(size * (1 - 2 * a.pad))
    icon = Image.new('RGBA', (size, size), a.bg or (0, 0, 0, 0))
    icon.paste(im.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2, (size - inner) // 2))
    icon.save(os.path.join(a.out, f'icon{size}.png'))
    print('wrote', f'icon{size}.png')
