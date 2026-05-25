"""
Détourage de feuilles.png : retire le fond blanc et extrait chaque feuille
en PNG transparent individuel pour animation parallax sur le hero.
"""
import numpy as np
from pathlib import Path
from PIL import Image
from scipy import ndimage

SRC = Path(r"C:\Users\natha\Downloads\feuilles.png")
OUT_DIR = Path(r"C:\Users\natha\nb-design\assets\leaves")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def remove_white_bg(img, threshold=235):
    """Convertit le fond blanc en transparent avec adoucissement des bords."""
    img = img.convert("RGBA")
    arr = np.array(img)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    # Distance du pixel à blanc pur (0 = blanc pur, 1 = noir)
    lum = (r.astype(np.float32) + g + b) / 3.0  # 0-255
    # Alpha proportionnel à la distance à blanc
    new_a = np.clip((threshold - lum) / (threshold * 0.55) * 255, 0, 255).astype(np.uint8)
    # Préserver l'alpha existant
    new_a = np.minimum(new_a, a)

    arr[..., 3] = new_a
    return Image.fromarray(arr)


def extract_individual_leaves(img, min_pixels=5000):
    """Trouve chaque blob (feuille) et l'extrait avec son bounding box."""
    arr = np.array(img)
    alpha = arr[..., 3]
    mask = alpha > 30

    # Labellisation des blobs connectés
    labeled, n_labels = ndimage.label(mask)
    print(f"  {n_labels} blobs détectés")

    leaves = []
    for i in range(1, n_labels + 1):
        blob_mask = labeled == i
        size = blob_mask.sum()
        if size < min_pixels:
            continue
        ys, xs = np.where(blob_mask)
        y0, y1 = ys.min(), ys.max() + 1
        x0, x1 = xs.min(), xs.max() + 1
        pad = 8
        y0p = max(0, y0 - pad)
        x0p = max(0, x0 - pad)
        y1p = min(arr.shape[0], y1 + pad)
        x1p = min(arr.shape[1], x1 + pad)

        leaf = arr[y0p:y1p, x0p:x1p].copy()
        # Masque sur ce blob uniquement (retire les feuilles voisines)
        local_mask = labeled[y0p:y1p, x0p:x1p] == i
        leaf[..., 3] = (leaf[..., 3].astype(np.float32) * local_mask).astype(np.uint8)

        leaves.append((leaf, size, (x0, y0, x1, y1)))

    # Trie par taille décroissante
    leaves.sort(key=lambda x: -x[1])
    return leaves


def main():
    print(f"Source : {SRC}")
    src = Image.open(SRC)
    print(f"Taille : {src.size} mode={src.mode}")

    # 1. Détourage
    transparent = remove_white_bg(src)
    transparent.save(OUT_DIR / "_all_transparent.png", "PNG", optimize=True)
    print(f"  -> _all_transparent.png")

    # 2. Extraction individuelle
    leaves = extract_individual_leaves(transparent)
    print(f"  {len(leaves)} feuilles retenues (>= 5000px)")

    # Garde les 10 plus belles (variations de taille/orientation)
    KEEP = 10
    for i, (leaf, size, bbox) in enumerate(leaves[:KEEP]):
        leaf_img = Image.fromarray(leaf)
        # Redimensionne pour avoir une taille raisonnable (max 600px)
        max_dim = max(leaf_img.size)
        if max_dim > 600:
            scale = 600 / max_dim
            new_size = (int(leaf_img.width * scale), int(leaf_img.height * scale))
            leaf_img = leaf_img.resize(new_size, Image.LANCZOS)
        path = OUT_DIR / f"leaf_{i+1:02d}.png"
        leaf_img.save(path, "PNG", optimize=True)
        print(f"  -> {path.name} ({leaf_img.size}, {size}px source)")


if __name__ == "__main__":
    main()
