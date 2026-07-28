"""
Détoure les vrais calques de Nathan (main + feuillage sur fond blanc)
et produit les 4 calques du hero parallax.

Source : Hero/Design sans titre (1).png  (côté DROIT, fond blanc)
Le côté gauche est obtenu par miroir (un miroir de main droite donne
bien une main gauche, c'est anatomiquement correct).

Sortie : assets/hero/layers/
  front-droite.png / front-gauche.png   plan rapproché (mains)
  mid-droite.png   / mid-gauche.png     plan intermédiaire (feuillage seul)
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

SRC = Path(r"C:\Users\natha\OneDrive\Bureau\NB-Design\Hero\Design sans titre (1).png")
OUT = Path(r"C:\Users\natha\nb-design\assets\hero\layers")
OUT.mkdir(parents=True, exist_ok=True)


def key_out_white(img):
    """Fond blanc -> transparent, avec correction de la frange blanche."""
    arr = np.array(img.convert("RGB")).astype(np.float32)
    lum = 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]

    # Rampe large : les pixels de bord recoivent un alpha partiel, ce qui
    # permet ensuite de les decontaminer correctement.
    HI, LO = 252.0, 214.0
    alpha = np.clip((HI - lum) / (HI - LO), 0.0, 1.0)

    # Gamma > 1 : on pousse les alphas intermediaires vers le bas, donc les
    # pixels de bord deviennent plus transparents et le lisere disparait.
    alpha = alpha ** 1.45

    # Erosion d'environ 1 px pour manger le dernier rang de pixels contamines
    a_img = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    eroded = np.array(a_img.filter(ImageFilter.MinFilter(3))).astype(np.float32) / 255.0
    alpha = np.minimum(alpha, eroded * 0.55 + alpha * 0.45)

    # Décontamination : le pixel observé vaut  fg*a + blanc*(1-a).
    # On retrouve fg, sinon les bords gardent un liseré blanc sur fond sombre.
    a = np.clip(alpha, 1e-3, 1.0)[..., None]
    fg = (arr - 255.0 * (1.0 - a)) / a
    fg = np.clip(fg, 0, 255)

    # Filet de securite : rien de plus clair que la peau la plus eclairee
    # ne doit subsister sur les pixels semi-transparents.
    semi = (alpha < 0.9)[..., None]
    fg = np.where(semi, np.minimum(fg, 165.0), fg)

    out = np.dstack([fg.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    return Image.fromarray(out, "RGBA")


def crop_to_content(img, thr=6):
    arr = np.array(img)
    ys, xs = np.where(arr[..., 3] > thr)
    if len(ys) == 0:
        return img
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def save_pair(img, name_right, name_left):
    """Enregistre le calque et son miroir en WebP (alpha conserve, bien plus leger)."""
    for im, name in ((img, name_right), (img.transpose(Image.FLIP_LEFT_RIGHT), name_left)):
        out = OUT / f"{name}.webp"
        im.save(out, "WEBP", quality=88, method=6, exact=False)
        print(f"  -> {out.name}  {im.size}  ({out.stat().st_size/1024:.0f} Ko)")


def darken(img, factor):
    r, g, b, a = img.split()
    rgb = ImageEnhance.Brightness(Image.merge("RGB", (r, g, b))).enhance(factor)
    return Image.merge("RGBA", (*rgb.split(), a))


def main():
    src = Image.open(SRC)
    print(f"Source : {src.size}  ({SRC.stat().st_size/1024:.0f} Ko)")

    cut = crop_to_content(key_out_white(src))
    print(f"Detoure + recadre : {cut.size}")

    # --- largeur de travail raisonnable ---
    TARGET_W = 1500
    if cut.width > TARGET_W:
        ratio = TARGET_W / cut.width
        cut = cut.resize((TARGET_W, int(cut.height * ratio)), Image.LANCZOS)

    # ================= PLAN RAPPROCHÉ =================
    front_r = cut
    save_pair(front_r, "front-droite", "front-gauche")

    # ================= PLAN INTERMÉDIAIRE =================
    # On ne garde que la partie feuillue (on coupe la main/l'avant-bras a droite),
    # puis on assombrit et on floute legerement : profondeur de champ.
    leafy = front_r.crop((0, 0, int(front_r.width * 0.68), front_r.height))
    leafy = leafy.resize((int(leafy.width * 0.82), int(leafy.height * 0.82)), Image.LANCZOS)
    leafy = darken(leafy, 0.55)
    leafy = leafy.filter(ImageFilter.GaussianBlur(radius=1.6))
    leafy = crop_to_content(leafy)

    # le plan intermediaire est ancre a droite pour mid-droite
    save_pair(leafy.transpose(Image.FLIP_LEFT_RIGHT), "mid-droite", "mid-gauche")

    # ================= VÉRIFICATION =================
    # composite sur fond sombre pour juger la frange
    chk = Image.new("RGBA", front_r.size, (8, 20, 13, 255))
    chk.alpha_composite(front_r)
    chk.convert("RGB").save(OUT / "_check_front.png")
    print("  -> _check_front.png (verification frange)")


if __name__ == "__main__":
    main()
