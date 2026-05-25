"""
Génère le favicon nb-design.ch à partir du logo NB-Digital Design.

Stratégie : on crop le monogramme "NB" (la partie la plus lisible en petite taille),
on le pose sur un fond vert sombre cohérent avec la DA du site, et on exporte
en plusieurs tailles + un .ico multi-résolution.
"""

from PIL import Image, ImageDraw
from pathlib import Path

SRC = Path(r"C:\Users\natha\OneDrive\Bureau\NB-Design\NB-Design\Logo\LOGO PNG.png")
OUT_DIR = Path(r"C:\Users\natha\nb-design")

# Palette nb-design.ch
BG_DARK = (15, 35, 24, 255)   # var(--green-deep) #0F2318

def main():
    src = Image.open(SRC).convert("RGBA")
    print(f"Source : {src.size}")

    # Le NB monogram occupe approximativement la zone (375, 50) -> (675, 320)
    # sur l'image 1050x600. On crop avec un peu de padding.
    nb = src.crop((360, 40, 690, 330))  # 330x290 ≈ presque carré
    print(f"NB cropped : {nb.size}")

    # On pose le NB sur un canevas carré 1024x1024 avec fond vert sombre + padding
    SIZE = 1024
    canvas = Image.new("RGBA", (SIZE, SIZE), BG_DARK)

    # Ajoute un coin arrondi subtil pour l'esthétique mobile (iOS s'en occupe en général,
    # mais on fait un soft mask pour le PNG aussi)
    # Resize le NB pour qu'il occupe ~70% du canvas
    target_w = int(SIZE * 0.72)
    ratio = target_w / nb.width
    target_h = int(nb.height * ratio)
    nb_resized = nb.resize((target_w, target_h), Image.LANCZOS)

    px = (SIZE - target_w) // 2
    py = (SIZE - target_h) // 2
    canvas.paste(nb_resized, (px, py), nb_resized)

    # Sauvegarde les tailles standard
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

    # ICO multi-résolution (16, 32, 48, 64)
    ico_path = OUT_DIR / "favicon.ico"
    canvas.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"  -> {ico_path.name} (multi-res)")

    # PNG principal qu'on référence partout
    canvas.resize((256, 256), Image.LANCZOS).save(OUT_DIR / "favicon.png", "PNG", optimize=True)
    print(f"  -> favicon.png (256x256)")

    print("\nFavicon généré.")


if __name__ == "__main__":
    main()
