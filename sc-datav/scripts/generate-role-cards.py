#!/usr/bin/env python3
"""
Generate 4 role card covers for the Index 3D carousel.

The bent plane is ~1:1; use square images and keep all text inside a
central safe zone so drei Image zoom/crop does not clip content.
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public"

# Square — matches BentPlaneGeometry 1×1 and avoids landscape crop
SIZE = 1024
W = H = SIZE

# Keep glyphs inside this box (carousel bend still eats corners)
SAFE = 140
SAFE_W = W - SAFE * 2
SAFE_H = H - SAFE * 2

ROLES = [
    {
        "title": "系统管理员",
        "keywords": ["用户权限", "苗木品类", "客户信息"],
        "description": "管理用户账号、权限，维护苗木品类、客户信息等基础数据。",
        "color": (48, 97, 219),
        "accent": (147, 197, 253),
    },
    {
        "title": "销售员",
        "keywords": ["销售订单", "订单跟踪", "客户跟进"],
        "description": "创建销售订单、跟踪订单状态、处理客户信息。",
        "color": (234, 88, 12),
        "accent": (253, 186, 116),
    },
    {
        "title": "库存管理员",
        "keywords": ["入库盘点", "库存调整", "出库操作"],
        "description": "负责苗木入库、盘点、库存调整、出库操作。",
        "color": (45, 143, 111),
        "accent": (110, 231, 183),
    },
    {
        "title": "财务人员",
        "keywords": ["销售报表", "资产统计", "利润分析"],
        "description": "查看销售报表、资产统计、成本利润分析。",
        "color": (124, 58, 237),
        "accent": (196, 181, 253),
    },
]

FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
]


def load_font(size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size, index=index)
            except OSError:
                return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def draw_gradient(
    img: Image.Image, top: tuple[int, int, int], bottom: tuple[int, int, int]
) -> None:
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        row = tuple(int(top[c] * (1 - t) + bottom[c] * t) for c in range(3))
        for x in range(W):
            px[x, y] = row


def wrap_text(
    draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int
) -> list[str]:
    lines: list[str] = []
    current = ""
    for ch in text:
        trial = current + ch
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = ch
    if current:
        lines.append(current)
    return lines


def draw_centered(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, ...],
) -> int:
    tw = draw.textlength(text, font=font)
    x = (W - tw) / 2
    draw.text((x, y), text, font=font, fill=fill)
    bbox = draw.textbbox((x, y), text, font=font)
    return bbox[3] - bbox[1]


def draw_centered_block(
    draw: ImageDraw.ImageDraw,
    y: int,
    lines: list[str],
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, ...],
    line_gap: int,
) -> int:
    for line in lines:
        h = draw_centered(draw, y, line, font, fill)
        y += h + line_gap
    return y


def main() -> None:
    tag_font = load_font(30)
    title_font = load_font(76)
    kw_font = load_font(34)
    desc_font = load_font(30)

    OUT.mkdir(parents=True, exist_ok=True)

    for i, role in enumerate(ROLES):
        img = Image.new("RGB", (W, H))
        dark = tuple(max(0, c - 70) for c in role["color"])
        draw_gradient(img, role["color"], dark)

        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)
        odraw.ellipse((-120, -120, 420, 420), fill=(*role["accent"], 35))
        odraw.ellipse((W - 360, H - 360, W + 80, H + 80), fill=(*role["accent"], 28))
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(img)

        # subtle inner frame — visual safe area guide (very faint)
        draw.rounded_rectangle(
            (SAFE, SAFE, W - SAFE, H - SAFE),
            radius=24,
            outline=(*role["accent"],),
            width=2,
        )

        y = SAFE + 36
        y += draw_centered(draw, y, "陕西省 · 林业苗圃", tag_font, (255, 255, 255, 180)) + 28

        title_h = draw_centered(draw, y, role["title"], title_font, (255, 255, 255))
        y += title_h + 36

        # keyword chips — short, always visible
        chip_gap = 16
        chips = role["keywords"]
        chip_font = kw_font
        chip_heights = 52
        total_w = sum(
            draw.textlength(c, font=chip_font) + 40 for c in chips
        ) + chip_gap * (len(chips) - 1)
        cx = (W - total_w) / 2
        for chip in chips:
            cw = draw.textlength(chip, font=chip_font) + 40
            draw.rounded_rectangle(
                (cx, y, cx + cw, y + chip_heights),
                radius=chip_heights // 2,
                fill=(248, 250, 255),
                outline=(*role["accent"],),
                width=2,
            )
            tw = draw.textlength(chip, font=chip_font)
            draw.text(
                (cx + (cw - tw) / 2, y + 10),
                chip,
                font=chip_font,
                fill=role["color"],
            )
            cx += cw + chip_gap
        y += chip_heights + 40

        desc_lines = wrap_text(draw, role["description"], desc_font, SAFE_W)
        # cap at 3 lines to stay inside safe zone
        desc_lines = desc_lines[:3]
        y = draw_centered_block(draw, y, desc_lines, desc_font, (235, 240, 255), 12)

        cta = "进入控制台" if i == 0 else "点击进入"
        draw_centered(draw, H - SAFE - 52, cta, tag_font, (255, 255, 255, 210))

        out_path = OUT / f"role_{i}.jpg"
        img.save(out_path, quality=93, optimize=True)
        print(f"saved {out_path} ({W}x{H})")


if __name__ == "__main__":
    main()
