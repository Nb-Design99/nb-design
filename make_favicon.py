"""
Génère le favicon nb-design.ch à partir du monogramme NB avec branche.
Source or -> teintée vert néon + glow.
"""

import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter

SRC = Path(r"C:\Users\natha\Downloads\Design sans titre.png")
OUT_DIR = Path(r"C:\Users\natha\nb-design")

# Vert néon flashy super saturé
NEON_R, NEON_G, NEON_B = 60, 255, 110
# Cœur encore plus lumineux (pour l'effet tube néon)
CORE_R, CORE_G, CORE_B = 180, 255, 200


def gold_to_neon_green(img):
    """Remappe les pixels non-noirs vers du vert néon flashy + cœur clair."""
    arr = np.array(img.convert("RGBA")).astype(np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    lum = (r + g + b) / 3.0 / 255.0  # 0..1
    # Booste les mid-tones pour que le vert soit plus lumineux
    lum_boosted = np.power(lum, 0.7)

    # Interpolation entre NEON (bord) et CORE (centre lumineux)
    # lum élevé = cœur lumineux ; lum faible = bord néon
    new_r = NEON_R + (CORE_R - NEON_R) * lum_boosted
    new_g = NEON_G + (CORE_G - NEON_G) * lum_boosted
    new_b = NEON_B + (CORE_B - NEON_B) * lum_boosted

    # Alpha proportionnel à la luminance originale
    new_a = (lum_boosted * 255).clip(0, 255)

    out = np.stack([new_r, new_g, new_b, new_a], axis=-1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out)


def add_glow(img, radius=25, intensity=2.5):
    """Ajoute un halo néon vert intense autour du signal (plusieurs couches)."""
    arr = np.array(img)
    signal = arr[..., 3] > 40  # utilise l'alpha comme masque
    signal_img = Image.fromarray((signal * 255).astype(np.uint8))

    result = Image.new("RGBA", img.size, (0, 0, 0, 0))

    # Halo TRÈS large (atmosphère)
    for r_glow, int_glow in [(radius * 2.5, 0.6), (radius * 1.5, 1.0), (radius * 0.8, 1.6)]:
        glow_data = np.zeros((*img.size[::-1], 4), dtype=np.uint8)
        glow_data[..., 0] = NEON_R
        glow_data[..., 1] = NEON_G
        glow_data[..., 2] = NEON_B
        glow_data[..., 3] = (np.array(signal_img) * int_glow).clip(0, 255).astype(np.uint8)
        glow_layer = Image.fromarray(glow_data)
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=r_glow))
        result = Image.alpha_composite(result, glow_layer)

    # Image nette devant
    result = Image.alpha_composite(result, img)
    return result


def main():
    src = Image.open(SRC).convert("RGBA")
    print(f"Source : {src.size} {src.mode}")

    # Teinte or -> vert néon
    tinted = gold_to_neon_green(src)

    # Ajoute glow néon
    with_glow = add_glow(tinted, radius=12, intensity=1.6)

    # Trouve les bornes du contenu net (sans glow) pour un crop serré
    tint_arr = np.array(tinted)
    sharp_signal = tint_arr[..., 3] > 40
    ys, xs = np.where(sharp_signal)
    if len(ys) > 0:
        # Padding minimal juste pour laisser respirer le glow
        pad = 30
        y0, y1 = max(0, ys.min() - pad), min(with_glow.height, ys.max() + pad)
        x0, x1 = max(0, xs.min() - pad), min(with_glow.width, xs.max() + pad)
        cropped = with_glow.crop((x0, y0, x1, y1))
    else:
        cropped = with_glow

    # Rend carré avec fond transparent
    w, h = cropped.size
    size = max(w, h)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(cropped, ((size - w) // 2, (size - h) // 2), cropped)

    # Fond noir opaque pour que ça ressorte bien dans les onglets navigateur
    black_bg = Image.new("RGBA", (size, size), (5, 8, 5, 255))
    black_bg.paste(canvas, (0, 0), canvas)
    canvas = black_bg

    # Resize à 1024 max
    if size > 1024:
        canvas = canvas.resize((1024, 1024), Image.LANCZOS)

    # Exports toutes tailles
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
        canvas.resize((sz, sz), Image.LANCZOS).save(out, "PNG", optimize=True)
        print(f"  -> {out.name} ({sz}x{sz})")

    ico_path = OUT_DIR / "favicon.ico"
    canvas.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"  -> {ico_path.name} (multi-res)")

    canvas.resize((256, 256), Image.LANCZOS).save(OUT_DIR / "favicon.png", "PNG", optimize=True)
    print(f"  -> favicon.png (256x256)")

    canvas.save(OUT_DIR / "favicon-preview-1024.png", "PNG", optimize=True)
    print(f"  -> favicon-preview-1024.png (preview HD)")

    print("\nFavicon néon vert généré.")


if __name__ == "__main__":
    main()
