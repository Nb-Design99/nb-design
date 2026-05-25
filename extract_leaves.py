"""
Détourage de feuilles.png : retire le fond blanc, teinte en vert NB-Design
(corps vert profond, veines vert glow flashy), extrait chaque feuille
en PNG transparent individuel pour animation parallax sur le hero.
"""
import numpy as np
from pathlib import Path
from PIL import Image
from scipy import ndimage

# Palette teinte verte cohérente avec la DA NB-Design
# Pixels sombres -> vert très foncé (proche du --green-deep #061410)
# Pixels clairs (veines) -> vert glow flashy (--green-glow #6ED09A boosté)
DARK_GREEN = np.array([6, 32, 18], dtype=np.float32) / 255.0
BRIGHT_GREEN = np.array([130, 245, 175], dtype=np.float32) / 255.0


def tint_to_green(img):
    """Remappe l'image en gradient vert (sombre -> clair flashy)."""
    arr = np.array(img).astype(np.float32)
    rgb = arr[..., :3] / 255.0
    alpha = arr[..., 3]

    # Luminance perçue (les veines de la feuille sont les pixels les plus clairs)
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]

    # Courbe : on accentue les hautes lumières pour que les veines brillent
    lum_curved = np.power(lum, 0.75)  # < 1 = boost des mid-tones

    # Interpolation entre vert sombre et vert flashy
    new_rgb = DARK_GREEN + (BRIGHT_GREEN - DARK_GREEN) * lum_curved[..., None]
    new_rgb = np.clip(new_rgb * 255, 0, 255).astype(np.uint8)

    result = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    result[..., :3] = new_rgb
    result[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(result)

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


def extract_individual_leaves(img, min_pixels=5000, edge_margin=4):
    """Trouve chaque blob (feuille) et l'extrait. Rejette les feuilles
    qui touchent le bord de l'image source (tronquées par le canvas)."""
    arr = np.array(img)
    H, W = arr.shape[:2]
    alpha = arr[..., 3]
    mask = alpha > 30

    labeled, n_labels = ndimage.label(mask)
    print(f"  {n_labels} blobs détectés")

    leaves = []
    rejected_edge = 0
    for i in range(1, n_labels + 1):
        blob_mask = labeled == i
        size = blob_mask.sum()
        if size < min_pixels:
            continue
        ys, xs = np.where(blob_mask)
        y0, y1 = ys.min(), ys.max() + 1
        x0, x1 = xs.min(), xs.max() + 1

        # REJET : si la feuille touche un bord de l'image source, elle est tronquée
        if (y0 <= edge_margin or x0 <= edge_margin or
            y1 >= H - edge_margin or x1 >= W - edge_margin):
            rejected_edge += 1
            continue

        # Padding généreux (sera dans la zone safe puisqu'on a déjà rejeté les bords)
        pad = 20
        y0p = max(0, y0 - pad)
        x0p = max(0, x0 - pad)
        y1p = min(H, y1 + pad)
        x1p = min(W, x1 + pad)

        leaf = arr[y0p:y1p, x0p:x1p].copy()
        local_mask = labeled[y0p:y1p, x0p:x1p] == i
        leaf[..., 3] = (leaf[..., 3].astype(np.float32) * local_mask).astype(np.uint8)

        leaves.append((leaf, size, (x0, y0, x1, y1)))

    print(f"  {rejected_edge} feuilles rejetées (touchent un bord)")
    leaves.sort(key=lambda x: -x[1])
    return leaves


def main():
    print(f"Source : {SRC}")
    src = Image.open(SRC)
    print(f"Taille : {src.size} mode={src.mode}")

    # 1. Détourage
    transparent = remove_white_bg(src)

    # 2. Teinte verte flashy
    transparent = tint_to_green(transparent)
    transparent.save(OUT_DIR / "_all_transparent.png", "PNG", optimize=True)
    print(f"  -> _all_transparent.png (teinté vert)")

    # 3. Extraction individuelle
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
