"""Generate dark-red "dev build" toolbar icons from the real RLTK icons.

The real icon has a dark green-blue background; the local unpacked dev build uses
a recolored copy so it's visually distinct from the Chrome Web Store build when
both are installed side by side (see src/manifest.json "key" / docs/web/config.js).

For each RLTK-<n>x<n>.png it writes RLTK-dev-<n>x<n>.png, rotating only the
blue/green-hued (background) pixels to red while leaving the foreground glyphs and
transparency untouched. Re-run this if the brand icon changes.

Usage: python3 scripts/make_dev_icons.py
"""
import colorsys
import os

from PIL import Image

IMG_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "rltk", "resources", "img")
SIZES = (16, 32, 48, 128)

# Hue window (fraction of 360°) treated as "background" — the slate blue-green is
# ~207°. Cover cyan→blue→indigo so anti-aliased edges recolor cleanly.
HUE_LO, HUE_HI = 0.42, 0.75   # ~151°–270°
TARGET_HUE = 0.0              # red
SAT_BOOST = 1.4              # make the red read clearly while keeping it muted


def recolor(src_path, dst_path):
    im = Image.open(src_path).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if ss > 0.12 and HUE_LO < hh < HUE_HI:
                nr, ng, nb = colorsys.hsv_to_rgb(TARGET_HUE, min(1.0, ss * SAT_BOOST), vv)
                px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    im.save(dst_path)
    print(f"wrote {os.path.relpath(dst_path)}")


def main():
    for n in SIZES:
        src = os.path.join(IMG_DIR, f"RLTK-{n}x{n}.png")
        dst = os.path.join(IMG_DIR, f"RLTK-dev-{n}x{n}.png")
        recolor(src, dst)


if __name__ == "__main__":
    main()
