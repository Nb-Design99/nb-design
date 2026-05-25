"""
Génère le favicon nb-design.ch à partir du badge vert circulaire fourni par Nathan.

Source : C:\\Users\\natha\\OneDrive\\Bureau\\NB-Design\\NB-Design\\Logo\\favicon-nb.png.png
"""

from PIL import Image
from pathlib import Path

SRC = Path(r"C:\Users\natha\OneDrive\Bureau\NB-Design\NB-Design\Logo\favicon-nb.png.png")
OUT_DIR = Path(r"C:\Users\natha\nb-design")


def main():
    src = Image.open(SRC).convert("RGBA")
    print(f"Source : {src.size} {src.mode}")

    # On centre dans un carré pour avoir un rendu propre quelle que soit la taille source
    w, h = src.size
    size = max(w, h)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(src, ((size - w) // 2, (size - h) // 2), src)

    # Resize à 1024 max
    if size > 1024:
        canvas = canvas.resize((1024, 1024), Image.LANCZOS)
        size = 1024

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
        canvas.resize((sz, sz), Image.LANCZOS).save(out, "PNG", optimize=True)
        print(f"  -> {out.name} ({sz}x{sz})")

    # ICO multi-résolution
    ico_path = OUT_DIR / "favicon.ico"
    canvas.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"  -> {ico_path.name} (multi-res)")

    # PNG principal
    canvas.resize((256, 256), Image.LANCZOS).save(OUT_DIR / "favicon.png", "PNG", optimize=True)
    print(f"  -> favicon.png (256x256)")

    # Aperçu HD
    canvas.save(OUT_DIR / "favicon-preview-1024.png", "PNG", optimize=True)
    print(f"  -> favicon-preview-1024.png (preview HD)")

    print("\nFavicon généré.")


if __name__ == "__main__":
    main()
