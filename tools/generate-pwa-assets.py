"""Recreate the local PWA artwork. Build tools only: Pillow and qrcode.

The running game does not depend on Python or these packages.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import qrcode
import qrcode.image.svg

ROOT = Path(__file__).resolve().parents[1]
URL = "https://thomasmetzker24.github.io/Code-secret-Mastermind/#installer"
INK, PAPER = "#153e35", "#f7f6ef"


def icon(size):
    # Same geometry as icons/icon.svg, at 3x resolution for clean small icons.
    scale = 3
    image = Image.new("RGB", (512 * scale, 512 * scale), INK)
    draw = ImageDraw.Draw(image)

    def ellipse(box, color):
        draw.ellipse(tuple(round(v * scale) for v in box), fill=color)

    def polygon(points, color=PAPER):
        draw.polygon([(x * scale, y * scale) for x, y in points], fill=color)

    for x, y, color in [(195,195,"#cb4849"),(317,195,"#3576b8"),
                         (195,317,"#e3b92f"),(317,317,"#8963ae")]:
        ellipse((x-52,y-52,x+52,y+52), PAPER)
        ellipse((x-44,y-44,x+44,y+44), color)
    ellipse((186,186,204,204), PAPER)
    polygon([(317,182),(330,195),(317,208),(304,195)])
    polygon([(195,303),(208,328),(182,328)])
    polygon([(312,303),(322,303),(322,312),(331,312),(331,322),
             (322,322),(322,331),(312,331),(312,322),(303,322),
             (303,312),(312,312)])
    return image.resize((size,size), Image.Resampling.LANCZOS)


def main():
    (ROOT / "icons").mkdir(exist_ok=True)
    (ROOT / "assets").mkdir(exist_ok=True)
    for name,size in [("icon-192.png",192),("icon-512.png",512),
                      ("icon-maskable-512.png",512),("apple-touch-icon.png",180)]:
        icon(size).save(ROOT / "icons" / name)
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=12, border=4)
    qr.add_data(URL)
    qr.make(fit=True)
    qr.make_image(fill_color="black",back_color="white").save(ROOT / "assets/code-secret-qr.png")
    qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(ROOT / "assets/code-secret-qr.svg")
    print(f"PWA icons generated. QR destination: {URL}")


if __name__ == "__main__":
    main()
