"""
Génère l'image Open Graph de nb-design.ch à partir du néon NB-DESIGN WEBDESIGNER.

L'image Open Graph est celle qu'utilisent Safari (suggestions), iMessage,
WhatsApp, Facebook, LinkedIn et Twitter pour afficher l'aperçu du site.
Taille standard : 1200x630 (ratio 1.91:1).
On génère aussi une version carrée 1200x1200 pour les plateformes qui la préfèrent.
"""

from PIL import Image
from pathlib import Path

SRC = Path(r"C:\Users\natha\OneDrive\Bureau\NB-Design\NB-Design\Insta_NB-Design\Neon_Wallpapers\NB-Design_neonTUBE_landscape_3240x1440.png")
OUT_DIR = Path(r"C:\Users\natha\nb-design")


def main():
    src = Image.open(SRC).convert("RGB")
    print(f"Source : {src.size}")

    # Open Graph standard : 1200x630
    # Le source est 3240x1440 (ratio 2.25:1), OG demande 1.91:1
    # On crop d'abord pour matcher le ratio sans déformer
    sw, sh = src.size
    target_ratio = 1200 / 630  # ~1.905
    src_ratio = sw / sh

    if src_ratio > target_ratio:
        # Source plus large que cible -> crop sur les côtés
        new_w = int(sh * target_ratio)
        left = (sw - new_w) // 2
        cropped = src.crop((left, 0, left + new_w, sh))
    else:
        # Source plus haute -> crop haut/bas
        new_h = int(sw / target_ratio)
        top = (sh - new_h) // 2
        cropped = src.crop((0, top, sw, top + new_h))

    og = cropped.resize((1200, 630), Image.LANCZOS)
    og_path = OUT_DIR / "og-image.png"
    og.save(og_path, "PNG", optimize=True)
    print(f"  -> {og_path.name} (1200x630)")

    # Version JPG aussi (plus légère, certaines plateformes la préfèrent)
    og_jpg = OUT_DIR / "og-image.jpg"
    og.save(og_jpg, "JPEG", quality=90, optimize=True)
    print(f"  -> {og_jpg.name} (1200x630 JPG)")

    print("\nOG image générée.")


if __name__ == "__main__":
    main()
