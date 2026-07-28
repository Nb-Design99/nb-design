"""
Prépare les assets du hero « entrée dans la jungle » :

1. jungle-hero.webp  : la photo de jungle (POV mains qui écartent), optimisée
2. neon-nbdesign.png : l'enseigne néon détourée du mur de briques (fond transparent)
"""

import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter

JUNGLE_SRC = Path(r"C:\Users\natha\OneDrive\Bureau\NB-Design\Hero\3fdcaa64-a843-49b1-9657-7ed7952d1029.png")
NEON_SRC   = Path(r"C:\Users\natha\OneDrive\Bureau\NB-Design\NB-Design\Logo\download.webp")
OUT_DIR    = Path(r"C:\Users\natha\nb-design\assets\hero")
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 1. JUNGLE — optimisation
# ============================================================
def prep_jungle():
    im = Image.open(JUNGLE_SRC).convert("RGB")
    print(f"Jungle source : {im.size}  ({JUNGLE_SRC.stat().st_size/1024:.0f} Ko)")

    # On monte à 1920 de large max (suffisant pour un hero plein écran)
    target_w = 1920
    if im.width != target_w:
        ratio = target_w / im.width
        im = im.resize((target_w, int(im.height * ratio)), Image.LANCZOS)

    out = OUT_DIR / "jungle-hero.webp"
    im.save(out, "WEBP", quality=84, method=6)
    print(f"  -> {out.name}  {im.size}  ({out.stat().st_size/1024:.0f} Ko)")

    # fallback jpg pour les vieux navigateurs
    out_jpg = OUT_DIR / "jungle-hero.jpg"
    im.save(out_jpg, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"  -> {out_jpg.name}  ({out_jpg.stat().st_size/1024:.0f} Ko)")


# ============================================================
# 2. NÉON — détourage du mur de briques
# ============================================================
def prep_neon():
    im = Image.open(NEON_SRC).convert("RGB")
    print(f"\nNeon source : {im.size}  ({NEON_SRC.stat().st_size/1024:.0f} Ko)")

    arr = np.array(im).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

    # --- 1. Isoler UNIQUEMENT les tubes néon (le coeur lumineux) ---
    # Tout le reste (brique + halo bavant sur le mur) est jeté : on refabriquera
    # le halo proprement, sinon la texture de brique reste visible dans la lueur.
    core = np.clip((lum - 88.0) / (168.0 - 88.0), 0.0, 1.0) ** 0.8

    # --- 2. Refabriquer un halo propre par flous successifs du coeur ---
    core_img = Image.fromarray((core * 255).astype(np.uint8), "L")
    glow = np.zeros_like(core)
    for radius, weight in [(6, 0.55), (18, 0.42), (46, 0.30), (95, 0.18)]:
        blurred = np.array(core_img.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255.0
        glow = 1.0 - (1.0 - glow) * (1.0 - blurred * weight)   # accumulation type "screen"

    alpha = np.clip(np.maximum(core, glow), 0.0, 1.0)

    # --- 3. Couleur : coeur d'origine (blanc/vert), halo en vert néon pur ---
    NEON_RGB = np.array([62.0, 255.0, 122.0])
    k = core[..., None]                       # 1 sur les tubes, 0 dans le halo
    rgb = arr * k + NEON_RGB * (1.0 - k)

    alpha8 = (alpha * 255).astype(np.uint8)
    out_arr = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha8])
    neon = Image.fromarray(out_arr)

    # Recadrage sur le contenu réel
    ys, xs = np.where(alpha8 > 8)
    pad = 24
    y0, y1 = max(0, ys.min() - pad), min(neon.height, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(neon.width, xs.max() + pad)
    neon = neon.crop((x0, y0, x1, y1))
    print(f"  recadre -> {neon.size}")

    # Largeur max 1400 (le néon ne dépassera jamais ça à l'écran)
    if neon.width > 1400:
        ratio = 1400 / neon.width
        neon = neon.resize((1400, int(neon.height * ratio)), Image.LANCZOS)

    out = OUT_DIR / "neon-nbdesign.png"
    neon.save(out, "PNG", optimize=True)
    print(f"  -> {out.name}  {neon.size}  ({out.stat().st_size/1024:.0f} Ko)")

    # Aperçu sur fond vert foncé pour vérifier le détourage
    check = Image.new("RGBA", neon.size, (15, 35, 24, 255))
    check.alpha_composite(neon)
    chk = OUT_DIR / "_check_neon_sur_fond.png"
    check.convert("RGB").save(chk, "PNG")
    print(f"  -> {chk.name} (verification)")


if __name__ == "__main__":
    prep_jungle()
    prep_neon()
    print("\nAssets prets.")
