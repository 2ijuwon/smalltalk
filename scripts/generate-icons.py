"""Render the web and Android icons from the same 16 × 16 slime as the app."""
import json
from pathlib import Path
from subprocess import check_output

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
art = json.loads(check_output([
    "node", "--input-type=module", "-e",
    "import { slimeColors, slimeRows, slimePaths } from './src/slime-art.js';"
    "const rows = slimeRows();"
    "console.log(JSON.stringify({rows, colors:slimeColors, svg:slimePaths(rows,1,4),"
    "android:slimePaths(rows,3,30)}));",
], cwd=root, text=True))
colors = art["colors"]
background = "#ddf2ff"

svg_paths = "\n".join(
    f'  <path fill="{colors[cell]}" d="{path}"/>' for cell, path in art["svg"]
)
(root / "src" / "brand-icon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges">\n'
    f'  <rect x="1" y="1" width="22" height="22" rx="4" fill="{background}"/>\n'
    f'{svg_paths}\n</svg>\n',
    encoding="utf-8",
)

res = root / "flutter" / "android" / "app" / "src" / "main" / "res"
android_paths = "\n".join(
    f'    <path android:fillColor="{colors[cell]}" android:pathData="{path}" />'
    for cell, path in art["android"]
)
(res / "drawable" / "ic_smalltalk_foreground.xml").write_text(
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
    '    android:width="108dp" android:height="108dp"\n'
    '    android:viewportWidth="108" android:viewportHeight="108">\n'
    f'{android_paths}\n</vector>\n',
    encoding="utf-8",
)

for density, size in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    cell_size = size // 24
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (cell_size, cell_size, size - cell_size - 1, size - cell_size - 1),
        radius=4 * cell_size,
        fill=background,
    )
    for y, row in enumerate(art["rows"]):
        for x, cell in enumerate(row):
            if cell not in colors:
                continue
            left, top = (4 + x) * cell_size, (4 + y) * cell_size
            draw.rectangle((left, top, left + cell_size - 1, top + cell_size - 1), fill=colors[cell])
    image.save(res / f"mipmap-{density}" / "ic_launcher.png", optimize=True)
