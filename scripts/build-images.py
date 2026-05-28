#!/usr/bin/env python3
"""Generate web image derivatives for the 401jK NFT site.

Reads the 3000x3000 source PNGs from the collection's OUTPUT folder and emits
two WebP derivatives per NFT into ../img:

    img/thumb/<id>.webp   600x600   gallery grid
    img/view/<id>.webp    1200x1200 enlarge modal (the "limited" resolution)

Dev-only. Run once locally after the source art changes. The img/ output is the
only thing the deployed site needs — this script is not uploaded.

    python3 scripts/build-images.py
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, features
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

if not features.check("webp"):
    sys.exit("This Pillow build lacks WebP support.")

# Source art folder (relative to repo root, two levels up from this script).
SRC = Path(
    "/Users/patrick/Documents/Claude/401jK/NFT/NFT Art/02_OUTPUT"
)

ROOT = Path(__file__).resolve().parent.parent
THUMB_DIR = ROOT / "img" / "thumb"
VIEW_DIR = ROOT / "img" / "view"

THUMB_PX = 600
VIEW_PX = 1200
THUMB_Q = 80
VIEW_Q = 80

# The 52 pieces of Mint 1. 0011 and the mirrored Line-5 variants are excluded.
IDS = (
    [f"{n:04d}" for n in range(1, 11)]      # 0001-0010 (Line 1, skip 0011)
    + [f"{n:04d}" for n in range(101, 111)]  # 0101-0110 (Line 2)
    + [f"{n:04d}" for n in range(201, 211)]  # 0201-0210 (Line 3)
    + [f"{n:04d}" for n in range(301, 311)]  # 0301-0310 (Line 4)
    + [f"{n:04d}" for n in range(401, 413)]  # 0401-0412 (Line 5)
)


def resize_square(img: Image.Image, size: int) -> Image.Image:
    """Center-crop to square (sources are already square) then resize."""
    w, h = img.size
    if w != h:
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    VIEW_DIR.mkdir(parents=True, exist_ok=True)

    missing: list[str] = []
    done = 0
    for nft_id in IDS:
        src = SRC / f"NFT_{nft_id}.png"
        if not src.exists():
            missing.append(nft_id)
            continue
        with Image.open(src) as im:
            im = im.convert("RGB")
            resize_square(im, VIEW_PX).save(
                VIEW_DIR / f"{nft_id}.webp", "WEBP", quality=VIEW_Q, method=6
            )
            resize_square(im, THUMB_PX).save(
                THUMB_DIR / f"{nft_id}.webp", "WEBP", quality=THUMB_Q, method=6
            )
        done += 1
        print(f"  {nft_id}  ok")

    print(f"\nGenerated {done} pieces -> {THUMB_DIR.relative_to(ROOT)} + {VIEW_DIR.relative_to(ROOT)}")
    if missing:
        print(f"MISSING source for: {', '.join(missing)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
