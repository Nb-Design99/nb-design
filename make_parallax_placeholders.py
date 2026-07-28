"""
Fabrique des calques PROVISOIRES pour régler la mécanique du parallax,
en attendant les vrais PNG détourés de Nathan.

On compose les feuilles existantes (assets/leaves/leaf_*.png) en amas
ancrés sur un bord, avec une vraie silhouette alpha. Assombries pour
coller à l'ambiance sous-bois nocturne.

Sortie : assets/hero/layers/
  front-gauche.png / front-droite.png   (plan rapproché, là où iront les mains)
  mid-gauche.png   / mid-droite.png     (plan intermédiaire)
"""

from pathlib import Path
from PIL import Image, ImageEnhance

LEAVES = Path(r"C:\Users\natha\nb-design\assets\leaves")
OUT = Path(r"C:\Users\natha\nb-design\assets\hero\layers")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1100, 1400


def load(name, scale, angle, brightness):
    im = Image.open(LEAVES / name).convert("RGBA")
    w = int(im.width * scale)
    h = int(im.height * scale)
    im = im.resize((w, h), Image.LANCZOS)
    im = im.rotate(angle, expand=True, resample=Image.BICUBIC)
    # assombrir uniquement les canaux couleur, pas l'alpha
    rgb = Image.merge("RGB", im.split()[:3])
    rgb = ImageEnhance.Brightness(rgb).enhance(brightness)
    return Image.merge("RGBA", (*rgb.split(), im.split()[3]))


def build(spec, filename):
    """spec = liste de (fichier, echelle, angle, luminosite, x, y) — x,y = coin haut-gauche"""
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for name, scale, angle, bright, x, y in spec:
        leaf = load(name, scale, angle, bright)
        canvas.alpha_composite(leaf, (x, y))
    out = OUT / filename
    canvas.save(out, "PNG", optimize=True)
    print(f"  -> {filename}  ({out.stat().st_size/1024:.0f} Ko)")
    return canvas


# --- PLAN RAPPROCHÉ GAUCHE : amas dense ancré sur le bord gauche ---
front_gauche = [
    ("leaf_01.png", 2.1, -18, 0.38, -120, 240),
    ("leaf_06.png", 1.9,  26, 0.34,  -60, 620),
    ("leaf_04.png", 1.7, -44, 0.42,   40, 120),
    ("leaf_02.png", 2.0,  10, 0.30, -150, 900),
    ("leaf_09.png", 1.5,  58, 0.45,  180, 520),
    ("leaf_07.png", 1.4, -66, 0.36,  120, 940),
    ("leaf_05.png", 1.3,  38, 0.40,  -40, 1080),
]

# --- PLAN INTERMÉDIAIRE GAUCHE : plus clairsemé, plus petit ---
mid_gauche = [
    ("leaf_03.png", 1.3, -28, 0.26,   60, 380),
    ("leaf_08.png", 1.1,  44, 0.24,  240, 760),
    ("leaf_10.png", 1.2, -52, 0.28,  150, 120),
    ("leaf_06.png", 1.0,  18, 0.22,  320, 1060),
]

print("Calques provisoires :")
fg = build(front_gauche, "front-gauche.png")
mg = build(mid_gauche, "mid-gauche.png")

# --- Côtés droits : miroir ---
fg.transpose(Image.FLIP_LEFT_RIGHT).save(OUT / "front-droite.png", "PNG", optimize=True)
print(f"  -> front-droite.png  ({(OUT/'front-droite.png').stat().st_size/1024:.0f} Ko)")
mg.transpose(Image.FLIP_LEFT_RIGHT).save(OUT / "mid-droite.png", "PNG", optimize=True)
print(f"  -> mid-droite.png  ({(OUT/'mid-droite.png').stat().st_size/1024:.0f} Ko)")

print("\nProvisoires prets. Ils seront remplaces par les vrais PNG detoures.")
