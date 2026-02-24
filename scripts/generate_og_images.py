#!/usr/bin/env python3
"""Generate OG (Open Graph) images for blog posts and site default.

Variants:
  1. Blog post WITHOUT hero image — gradient background + dot grid + title/metadata
  2. Blog post WITH hero image — blurred hero + dark overlay + title/metadata
  3. Site default — gradient + avatar + branding + tagline

Usage:
  uv run --with pillow,pyyaml python3 scripts/generate_og_images.py [--force]
"""

from __future__ import annotations

import argparse
import re
from datetime import datetime
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

WIDTH, HEIGHT = 1200, 630
PRIMARY = (81, 81, 245)       # #5151f5
DARK_BG = (26, 26, 58)       # #1a1a3a
MID_BG = (42, 42, 143)       # #2a2a8f
ORANGE = (249, 115, 22)      # #f97316
WHITE = (255, 255, 255)
FOOTER_BG = (18, 18, 40)     # dark strip

FONT_BLACK = "/usr/share/fonts/truetype/lato/Lato-Black.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/lato/Lato-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/lato/Lato-Regular.ttf"

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "_posts"
IMAGES_DIR = ROOT / "assets" / "images"
OG_DIR = IMAGES_DIR / "og"
AVATAR_PATH = IMAGES_DIR / "bob-256.jpg"
CONFIG_PATH = ROOT / "_config.yml"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------

def draw_diagonal_gradient(img: Image.Image, c1: tuple, c2: tuple) -> None:
    """Draw a diagonal gradient from top-left (c1) to bottom-right (c2)."""
    pixels = img.load()
    w, h = img.size
    max_dist = w + h
    for y in range(h):
        for x in range(w):
            t = (x + y) / max_dist
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            pixels[x, y] = (r, g, b)


def draw_dot_grid(draw: ImageDraw.ImageDraw, w: int, h: int,
                  spacing: int = 30, radius: int = 1,
                  color: tuple = (255, 255, 255, 25)) -> None:
    """Draw a subtle dot grid overlay."""
    for y in range(0, h, spacing):
        for x in range(0, w, spacing):
            draw.ellipse([x - radius, y - radius, x + radius, y + radius],
                         fill=color)


def make_circular_avatar(path: Path, size: int) -> Image.Image:
    """Load an image and crop it into a circle with antialiased edges."""
    avatar = Image.open(path).convert("RGBA")
    avatar = avatar.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([0, 0, size, size], fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(avatar, (0, 0), mask)
    return result


def wrap_title(title: str, font: ImageFont.FreeTypeFont,
               max_width: int, draw: ImageDraw.ImageDraw) -> list[str]:
    """Word-wrap title to fit within max_width, return lines."""
    words = title.split()
    lines: list[str] = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_width and current:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def auto_title_size(title: str, draw: ImageDraw.ImageDraw,
                    max_width: int, max_lines: int = 3,
                    start_size: int = 52, min_size: int = 32) -> tuple:
    """Find the largest font size that fits the title within constraints.

    Returns (font, lines).
    """
    for size in range(start_size, min_size - 1, -2):
        font = load_font(FONT_BLACK, size)
        lines = wrap_title(title, font, max_width, draw)
        if len(lines) <= max_lines:
            return font, lines
    # Fallback: use min size even if it exceeds max_lines
    font = load_font(FONT_BLACK, min_size)
    lines = wrap_title(title, font, max_width, draw)
    return font, lines[:max_lines]


# ---------------------------------------------------------------------------
# Variant generators
# ---------------------------------------------------------------------------

def generate_post_og(title: str, date_str: str, tags: list[str],
                     excerpt: str, hero_path: Path | None,
                     output_path: Path) -> None:
    """Generate OG image for a blog post (Variant 1 or 2)."""
    img = Image.new("RGBA", (WIDTH, HEIGHT))

    if hero_path and hero_path.exists():
        # Variant 2: hero image background
        hero = Image.open(hero_path).convert("RGBA")
        # Center-crop to fill
        scale = max(WIDTH / hero.width, HEIGHT / hero.height)
        new_w, new_h = int(hero.width * scale), int(hero.height * scale)
        hero = hero.resize((new_w, new_h), Image.LANCZOS)
        left = (new_w - WIDTH) // 2
        top = (new_h - HEIGHT) // 2
        hero = hero.crop((left, top, left + WIDTH, top + HEIGHT))
        # Blur + darken
        hero = hero.filter(ImageFilter.GaussianBlur(radius=8))
        img.paste(hero, (0, 0))
        # Dark overlay gradient (stronger at bottom)
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        for y in range(HEIGHT):
            alpha = int(120 + 80 * (y / HEIGHT))
            overlay_draw.line([(0, y), (WIDTH, y)], fill=(0, 0, 0, alpha))
        img = Image.alpha_composite(img, overlay)
    else:
        # Variant 1: diagonal gradient background
        draw_diagonal_gradient(img, PRIMARY, MID_BG)
        # Dot grid overlay
        grid_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        grid_draw = ImageDraw.Draw(grid_overlay)
        draw_dot_grid(grid_draw, WIDTH, HEIGHT)
        img = Image.alpha_composite(img, grid_overlay)

    draw = ImageDraw.Draw(img)

    # Footer strip
    footer_h = 72
    footer_y = HEIGHT - footer_h
    draw.rectangle([0, footer_y, WIDTH, HEIGHT], fill=FOOTER_BG)

    # Avatar in footer
    avatar_size = 44
    avatar = make_circular_avatar(AVATAR_PATH, avatar_size)
    avatar_x = 60
    avatar_y = footer_y + (footer_h - avatar_size) // 2
    img.paste(avatar, (avatar_x, avatar_y), avatar)

    # Branding text in footer
    brand_font = load_font(FONT_BOLD, 22)
    draw = ImageDraw.Draw(img)  # refresh after paste
    brand_bbox = draw.textbbox((0, 0), "TimeToBuildBob", font=brand_font)
    brand_h = brand_bbox[3] - brand_bbox[1]
    draw.text((avatar_x + avatar_size + 14, footer_y + (footer_h - brand_h) // 2),
              "TimeToBuildBob", fill=WHITE, font=brand_font)

    # --- Content area ---
    content_left = 80
    accent_x = 60
    content_max_w = WIDTH - content_left - 80
    content_top = 60

    # Title
    title_font, title_lines = auto_title_size(title, draw, content_max_w)
    y = content_top
    line_spacing = 8
    for line in title_lines:
        draw.text((content_left, y), line, fill=WHITE, font=title_font)
        bbox = draw.textbbox((0, 0), line, font=title_font)
        y += (bbox[3] - bbox[1]) + line_spacing

    # Metadata line: date + #tags
    meta_font = load_font(FONT_REGULAR, 22)
    meta_parts = []
    if date_str:
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            meta_parts.append(dt.strftime("%B %d, %Y"))
        except ValueError:
            meta_parts.append(date_str)
    if tags:
        meta_parts.append("  ".join(f"#{t}" for t in tags[:4]))
    meta_text = "  —  ".join(meta_parts) if len(meta_parts) > 1 else (meta_parts[0] if meta_parts else "")
    if meta_text:
        y += 16
        draw.text((content_left, y), meta_text,
                  fill=(255, 255, 255, 178), font=meta_font)
        bbox_m = draw.textbbox((0, 0), meta_text, font=meta_font)
        y += (bbox_m[3] - bbox_m[1])

    # Orange accent bar — spans from content top to end of metadata
    accent_bottom = y + 16
    draw.rectangle([accent_x, content_top - 4, accent_x + 5, accent_bottom],
                   fill=ORANGE)

    # Excerpt text — fills the gap between metadata and footer
    if excerpt:
        excerpt_font = load_font(FONT_REGULAR, 20)
        excerpt_top = accent_bottom + 20
        excerpt_max_w = content_max_w
        # Available space between excerpt area and footer
        available_h = footer_y - excerpt_top - 16
        excerpt_lines = wrap_title(excerpt, excerpt_font, excerpt_max_w, draw)
        # Limit lines to what fits
        line_h = draw.textbbox((0, 0), "Ag", font=excerpt_font)
        single_h = (line_h[3] - line_h[1]) + 6
        max_excerpt_lines = max(1, available_h // single_h)
        excerpt_lines = excerpt_lines[:max_excerpt_lines]
        ey = excerpt_top
        for line in excerpt_lines:
            draw.text((content_left, ey), line,
                      fill=(255, 255, 255, 130), font=excerpt_font)
            bbox_e = draw.textbbox((0, 0), line, font=excerpt_font)
            ey += (bbox_e[3] - bbox_e[1]) + 6

    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(output_path, "PNG", optimize=True)


def generate_site_default(output_path: Path, tagline: str) -> None:
    """Generate the site-default OG image (Variant 3)."""
    img = Image.new("RGBA", (WIDTH, HEIGHT))
    draw_diagonal_gradient(img, PRIMARY, DARK_BG)

    # Dot grid
    grid_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_overlay)
    draw_dot_grid(grid_draw, WIDTH, HEIGHT)
    img = Image.alpha_composite(img, grid_overlay)

    draw = ImageDraw.Draw(img)

    # Center layout
    cx = WIDTH // 2

    # Avatar
    avatar_size = 160
    avatar = make_circular_avatar(AVATAR_PATH, avatar_size)
    avatar_x = cx - avatar_size // 2
    avatar_y = 100
    img.paste(avatar, (avatar_x, avatar_y), avatar)
    draw = ImageDraw.Draw(img)

    # Title
    title_font = load_font(FONT_BLACK, 56)
    title_text = "TimeToBuildBob"
    bbox = draw.textbbox((0, 0), title_text, font=title_font)
    tw = bbox[2] - bbox[0]
    draw.text((cx - tw // 2, avatar_y + avatar_size + 30),
              title_text, fill=WHITE, font=title_font)

    # Orange accent line
    accent_w = 80
    accent_y = avatar_y + avatar_size + 30 + (bbox[3] - bbox[1]) + 14
    draw.rectangle([cx - accent_w // 2, accent_y,
                    cx + accent_w // 2, accent_y + 4], fill=ORANGE)

    # Tagline
    tagline_font = load_font(FONT_REGULAR, 28)
    bbox2 = draw.textbbox((0, 0), tagline, font=tagline_font)
    tw2 = bbox2[2] - bbox2[0]
    draw.text((cx - tw2 // 2, accent_y + 18),
              tagline, fill=(255, 255, 255, 200), font=tagline_font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(output_path, "PNG", optimize=True)


# ---------------------------------------------------------------------------
# Post parsing
# ---------------------------------------------------------------------------

def parse_post(path: Path) -> tuple[dict, str]:
    """Parse YAML frontmatter and extract excerpt from a markdown file.

    Returns (frontmatter_dict, excerpt_text).
    """
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)", text, re.DOTALL)
    if not match:
        return {}, ""
    fm = yaml.safe_load(match.group(1)) or {}
    # Use explicit excerpt if available
    if fm.get("excerpt"):
        return fm, fm["excerpt"].strip()
    # Otherwise extract first non-empty paragraph from content
    content = match.group(2).strip()
    for paragraph in content.split("\n\n"):
        clean = paragraph.strip()
        # Skip headings, images, HTML, and empty lines
        if clean and not clean.startswith(("#", "![", "<", "{", "---")):
            # Strip markdown formatting
            clean = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", clean)  # links
            clean = re.sub(r"[*_`]+", "", clean)  # bold/italic/code
            clean = clean.replace("\n", " ").strip()
            if len(clean) > 20:
                return fm, clean
    return fm, ""


def slug_from_filename(filename: str) -> str:
    """Extract slug from Jekyll post filename (YYYY-MM-DD-slug.md)."""
    m = re.match(r"\d{4}-\d{2}-\d{2}-(.*?)\.md$", filename)
    return m.group(1) if m else filename.rsplit(".", 1)[0]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate OG images for blog posts")
    parser.add_argument("--force", action="store_true",
                        help="Regenerate all images, ignoring mtime checks")
    args = parser.parse_args()

    OG_DIR.mkdir(parents=True, exist_ok=True)

    # Load site config for tagline
    config = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8")) if CONFIG_PATH.exists() else {}
    tagline = config.get("tagline", "Autonomous AI Agent")

    # --- Site default ---
    default_path = IMAGES_DIR / "og-default.png"
    print(f"Generating site default → {default_path.relative_to(ROOT)}")
    generate_site_default(default_path, tagline)

    # --- Blog posts ---
    posts = sorted(POSTS_DIR.glob("*.md"))
    generated = 0
    skipped = 0

    for post_path in posts:
        fm, excerpt = parse_post(post_path)
        title = fm.get("title", slug_from_filename(post_path.name).replace("-", " ").title())
        date_str = str(fm.get("date", ""))[:10]
        tags = fm.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",")]

        slug = slug_from_filename(post_path.name)
        output_path = OG_DIR / f"{slug}.png"

        # Incremental: skip if output is newer than source
        if not args.force and output_path.exists():
            if output_path.stat().st_mtime > post_path.stat().st_mtime:
                skipped += 1
                continue

        # Check for hero image
        hero_image = fm.get("image")
        hero_path = None
        if hero_image:
            hero_path = ROOT / hero_image.lstrip("/")

        print(f"  [{generated + 1}] {slug}")
        generate_post_og(title, date_str, tags, excerpt, hero_path, output_path)
        generated += 1

    print(f"\nDone: {generated} generated, {skipped} skipped (up-to-date)")


if __name__ == "__main__":
    main()
