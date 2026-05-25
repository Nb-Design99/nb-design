"""
Génère le favicon nb-design.ch : badge circulaire vert avec monogramme NB crème.

Design reproduit à partir du visuel choisi par Nathan :
- Cercle vert profond avec dégradé subtil (lumière en haut)
- Liseré intérieur vert clair
- Lettres "NB" serif crème centrées
- Légère ombre portée
"""

import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

OUT_DIR = Path(r"C:\Users\natha\nb-design")

# Palette nb-design.ch
GREEN_TOP     = (60, 120, 80)     # haut du cercle (lumière)
GREEN_BOTTOM  = (20, 60, 38)      # bas du cercle (ombre)
GREEN_RIM     = (130, 200, 155)   # liseré intérieur clair
GREEN_OUTLINE = (10, 30, 18)      # liseré extérieur très sombre
CREAM         = (245, 242, 230)   # lettres
SHADOW        = (0, 0, 0, 90)     # ombre portée


def radial_gradient_circle(size, center_offset_y=-0.25):
    """Crée un cercle plein avec dégradé radial (lumière décalée vers le haut)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx = size / 2
    cy = size / 2 + size * center_offset_y  # source lumière au-dessus
    max_dist = math.hypot(size, size)

    pixels = img.load()
    r_circle = size / 2

    for y in range(size):
        for x in range(size):
            # Distance au centre géométrique pour le masque circulaire
            d_center = math.hypot(x - size / 2, y - size / 2)
            if d_center > r_circle:
                continue
            # Distance à la source lumière pour le dégradé
            d_light = math.hypot(x - cx, y - cy) / max_dist
            t = min(1.0, d_light * 1.6)
            r = int(GREEN_TOP[0] + (GREEN_BOTTOM[0] - GREEN_TOP[0]) * t)
            g = int(GREEN_TOP[1] + (GREEN_BOTTOM[1] - GREEN_TOP[1]) * t)
            b = int(GREEN_TOP[2] + (GREEN_BOTTOM[2] - GREEN_TOP[2]) * t)
            # Anti-aliasing du bord
            edge_alpha = 255
            if d_center > r_circle - 1.5:
                edge_alpha = int(255 * (r_circle - d_center) / 1.5)
                edge_alpha = max(0, min(255, edge_alpha))
            pixels[x, y] = (r, g, b, edge_alpha)
    return img


def get_serif_font(size):
    """Police serif bold pour les lettres NB."""
    candidates = [
        "C:/Windows/Fonts/georgiab.ttf",
        "C:/Windows/Fonts/timesbd.ttf",
        "C:/Windows/Fonts/cambriab.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def build_badge(canvas_size=1024):
    """Construit le badge complet en haute résolution puis on resize."""
    # On bosse à 2x pour un meilleur anti-aliasing
    SIZE = canvas_size * 2
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # === Ombre portée ===
    shadow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_layer)
    pad = int(SIZE * 0.07)
    sdraw.ellipse(
        (pad + 18, pad + 28, SIZE - pad + 18, SIZE - pad + 28),
        fill=(0, 0, 0, 110),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=24))
    canvas = Image.alpha_composite(canvas, shadow_layer)

    # === Cercle principal avec dégradé ===
    circle_size = SIZE - 2 * pad
    circle = radial_gradient_circle(circle_size, center_offset_y=-0.28)
    canvas.paste(circle, (pad, pad), circle)

    # === Liseré extérieur sombre + liseré intérieur clair ===
    draw = ImageDraw.Draw(canvas)
    # outline sombre
    draw.ellipse(
        (pad, pad, SIZE - pad, SIZE - pad),
        outline=GREEN_OUTLINE,
        width=6,
    )
    # liseré intérieur clair (inset de ~3% du diamètre)
    inset = int(circle_size * 0.035)
    draw.ellipse(
        (pad + inset, pad + inset, SIZE - pad - inset, SIZE - pad - inset),
        outline=GREEN_RIM,
        width=4,
    )

    # === Highlight spéculaire en haut ===
    highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    hi_pad_x = int(circle_size * 0.18)
    hi_pad_top = int(circle_size * 0.10)
    hi_pad_bottom = int(circle_size * 0.55)
    hdraw.ellipse(
        (pad + hi_pad_x, pad + hi_pad_top, SIZE - pad - hi_pad_x, pad + hi_pad_bottom),
        fill=(255, 255, 255, 28),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(radius=30))
    # Mask le highlight pour qu'il reste DANS le cercle
    circle_mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(circle_mask).ellipse((pad, pad, SIZE - pad, SIZE - pad), fill=255)
    canvas = Image.composite(Image.alpha_composite(canvas, highlight), canvas, circle_mask)

    # === Lettres NB ===
    # Calibration : on cherche une taille qui occupe ~50% du diamètre
    text = "NB"
    target_width = int(circle_size * 0.55)
    font_size = int(circle_size * 0.58)
    font = get_serif_font(font_size)

    # Mesure et ajustement
    draw = ImageDraw.Draw(canvas)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    if tw > target_width * 1.15:
        ratio = target_width / tw
        font_size = int(font_size * ratio)
        font = get_serif_font(font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    tx = (SIZE - tw) // 2 - bbox[0]
    ty = (SIZE - th) // 2 - bbox[1] - int(SIZE * 0.01)

    # Légère ombre sous le texte pour le détacher
    text_shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(text_shadow).text((tx + 4, ty + 8), text, font=font, fill=(0, 0, 0, 120))
    text_shadow = text_shadow.filter(ImageFilter.GaussianBlur(radius=6))
    canvas = Image.alpha_composite(canvas, text_shadow)

    draw = ImageDraw.Draw(canvas)
    draw.text((tx, ty), text, font=font, fill=CREAM)

    # Resize final
    final = canvas.resize((canvas_size, canvas_size), Image.LANCZOS)
    return final


def main():
    print("Génération du badge en 1024x1024...")
    badge = build_badge(1024)

    # Exports
    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "favicon-96x96.png": 96,
        "favicon-192x192.png": 192,
        "apple-touch-icon.png": 180,
        "favicon-512x512.png": 512,
    }
    for name, sz in sizes.items():
        out = OUT_DIR / name
        badge.resize((sz, sz), Image.LANCZOS).save(out, "PNG", optimize=True)
        print(f"  -> {out.name} ({sz}x{sz})")

    # ICO multi-résolution
    ico_path = OUT_DIR / "favicon.ico"
    badge.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"  -> {ico_path.name} (multi-res)")

    # PNG principal
    badge.resize((256, 256), Image.LANCZOS).save(OUT_DIR / "favicon.png", "PNG", optimize=True)
    print(f"  -> favicon.png (256x256)")

    # Aperçu HD pour vérif
    badge.save(OUT_DIR / "favicon-preview-1024.png", "PNG", optimize=True)
    print(f"  -> favicon-preview-1024.png (preview HD)")

    print("\nFavicon généré.")


if __name__ == "__main__":
    main()
