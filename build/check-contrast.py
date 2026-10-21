"""Periksa tabel kontras DESIGN-SYSTEM.md §2.1.

Setiap pasangan pada tabel dihitung ulang dengan rumus WCAG 2.1 dari nilai token
di bagian warna yang sama, lalu dibandingkan dengan angka yang tertulis. Baris
berstatus "lulus" wajib memenuhi ambangnya. Skrip ini yang membuat aturan §10
("setiap warna teks baru wajib lolos pemeriksaan kontras otomatis") bisa diuji.

  python build/check-contrast.py
"""
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "DESIGN-SYSTEM.md"
ROW = re.compile(
    r"^\|\s*(?P<fore>.+?)\s+di\s+(?P<back>.+?)\s*\|\s*(?P<ratio>[\d.]+)\s*\|\s*(?P<threshold>[\d.]+|tidak berlaku)\s*\|\s*(?P<verdict>[^|]+?)\s*\|"
)
TOKEN = re.compile(r"`([\w-]+)`")


def luminance(rgb: tuple[int, int, int]) -> float:
    channels = []
    for value in rgb:
        srgb = value / 255
        channels.append(srgb / 12.92 if srgb <= 0.03928 else ((srgb + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = luminance(a), luminance(b)
    high, low = max(la, lb), min(la, lb)
    return (high + 0.05) / (low + 0.05)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.strip().strip('"').lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def load(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    block = text[text.index("### 2.1 Warna") : text.index("### 2.2 Tipografi")]
    colors = dict(re.findall(r'^\s{2}([\w-]+):\s*"(#[0-9A-Fa-f]{6})"', block, re.M))
    return colors, block


def resolve(colors: dict[str, str], cell: str) -> tuple[str, tuple[int, int, int]]:
    lowered = cell.lower()
    if "putih" in lowered:
        return "putih", (255, 255, 255)
    if "hitam" in lowered:
        return "hitam", (0, 0, 0)
    name = TOKEN.search(cell)
    if not name or name.group(1) not in colors:
        raise KeyError(f"token tidak ada di §2.1: {cell!r}")
    return name.group(1), hex_to_rgb(colors[name.group(1)])


def main(argv: list[str]) -> int:
    colors, block = load(Path(argv[0]) if argv else SRC)
    problems = []
    checked = 0
    for line in block.splitlines():
        row = ROW.match(line.strip())
        if not row:
            continue
        checked += 1
        fore_name, fore = resolve(colors, row.group("fore"))
        back_name, back = resolve(colors, row.group("back"))
        computed = round(contrast(fore, back), 2)
        stated = float(row.group("ratio"))
        if abs(computed - stated) > 0.02:
            problems.append(f"{fore_name} di {back_name}: tertulis {stated}, hitungan {computed:.2f}")
        if row.group("threshold") == "tidak berlaku":
            continue
        threshold = float(row.group("threshold"))
        verdict = row.group("verdict").lower()
        if "lulus" in verdict and computed + 0.005 < threshold:
            problems.append(f"{fore_name} di {back_name}: ditandai lulus, hitungan {computed:.2f} < {threshold}")
        if "lulus" not in verdict and computed >= threshold:
            problems.append(f"{fore_name} di {back_name}: tidak ditandai lulus, hitungan {computed:.2f} >= {threshold}")
    if problems:
        for item in problems:
            print(f"GAGAL  {item}")
        print(f"{len(problems)} masalah dari {checked} baris")
        return 1
    print(f"{checked} pasangan warna di §2.1 lolos hitung ulang")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
