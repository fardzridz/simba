"""Bangun design/tokens.css dari DESIGN-SYSTEM.md §2.

Sumber kebenaran adalah dokumen (`DESIGN-SYSTEM.md` §2.1 sampai §2.3). Skrip ini
membaca blok YAML di ketiga bagian itu dan menuliskannya sebagai CSS variables
plus namespace `@theme` Tailwind v4. Berkas hasil tidak boleh diedit manual.

  python build/build-tokens.py            # tulis design/tokens.css
  python build/build-tokens.py --check     # gagal bila berkas di disk berbeda
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "DESIGN-SYSTEM.md"
OUT = ROOT / "design" / "tokens.css"

HEADER = """/* Dihasilkan oleh build/build-tokens.py dari DESIGN-SYSTEM.md §2.
 * Jangan diedit manual: ubah token di dokumen lalu jalankan ulang skrip.
 * Diperiksa di CI lewat `python build/build-tokens.py --check`.
 */
"""

INLINE_COMMENT = re.compile(r"\s+#.*$")


def fenced_block(heading: str) -> str:
    """Blok berpagar pertama sesudah judul bagian."""
    text = SRC.read_text(encoding="utf-8")
    fence = text.index("```yaml", text.index(heading))
    return text[fence + 7 : text.index("```", fence + 7)]


def parse_block(block: str) -> dict:
    """Peta satu atau dua tingkat: kunci tanpa nilai menampung kunci berindentasi."""
    root: dict = {}
    container = root
    for raw in block.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        key, _, value = stripped.partition(":")
        key = key.strip().strip("\"'")
        value = INLINE_COMMENT.sub("", value).strip()
        if raw[0].isspace():
            container[key] = value
        elif value:
            root[key] = value
        else:
            root[key] = {}
            container = root[key]
    return root


def inline_map(value: str) -> dict[str, str]:
    inner = value.strip()
    if not (inner.startswith("{") and inner.endswith("}")):
        raise ValueError(f"bukan peta inline: {value!r}")
    items, depth, quote, current = [], 0, "", []
    for ch in inner[1:-1]:
        if quote:
            current.append(ch)
            if ch == quote:
                quote = ""
            continue
        if ch in "\"'":
            quote = ch
        elif ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
        elif ch == "," and depth == 0:
            items.append("".join(current))
            current = []
            continue
        current.append(ch)
    items.append("".join(current))
    result = {}
    for item in items:
        key, _, val = item.partition(":")
        result[key.strip().strip("\"'")] = val.strip()
    return result


def unquote(value: str) -> str:
    return value.strip().strip('"')


def px(value: str) -> str:
    return value if re.search(r"[a-z%]", value) else f"{value}px"


def kebab(key: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "-", key).lower()


def colors() -> list[str]:
    lines = []
    for key, value in parse_block(fenced_block("### 2.1 Warna"))["colors"].items():
        lines.append(f"  --color-{key}: {unquote(value)};")
    lines += [
        "  /* Nama pendek untuk utilitas teks: Tinta 1, 2, dan 3 (§2.1 tabel wireframe). */",
        "  --color-ink: var(--color-text-primary);",
        "  --color-ink-2: var(--color-text-secondary);",
        "  --color-ink-3: var(--color-text-muted);",
    ]
    return lines


def typography() -> list[str]:
    lines = []
    scale = {"display-kpi": "kpi"}
    for key, value in parse_block(fenced_block("### 2.2 Tipografi"))["typography"].items():
        if key.startswith("font-"):
            lines.append(f"  --font-{key.split('-')[1]}: {unquote(value)};")
            continue
        parts = inline_map(value)
        name = scale.get(key, key)
        lines.append(f"  --text-{name}: {parts['size']};")
        for attr, suffix in [
            ("lineHeight", "line-height"),
            ("weight", "font-weight"),
            ("letterSpacing", "letter-spacing"),
        ]:
            if attr in parts:
                lines.append(f"  --text-{name}--{suffix}: {parts[attr]};")
    return lines


def layout() -> tuple[list[str], list[str]]:
    tokens = parse_block(fenced_block("### 2.3 Spasi"))
    theme: list[str] = []
    root: list[str] = []
    theme += [f"  --spacing-{k}: {px(v)};" for k, v in inline_map(tokens["spacing"]).items()]
    theme += [f"  --radius-{k}: {v};" for k, v in inline_map(tokens["rounded"]).items()]
    elevation = tokens["elevation"]
    theme.append(f"  --shadow-card: {unquote(elevation['card'])};")
    theme.append(f"  --shadow-dialog: {unquote(elevation['dialog'])};")
    overlay = inline_map(elevation["overlay"])
    root.append(f"  --overlay-surface: {unquote(overlay['color'])};")
    root.append(f"  --overlay-blur: {unquote(overlay['blur'])};")
    theme += [f"  --breakpoint-{k}: {px(v)};" for k, v in inline_map(tokens["breakpoints"]).items()]
    theme.append(f"  --container-page: {px(inline_map(tokens['page'])['maxWidth'])};")
    root += [f"  --z-{kebab(k)}: {v};" for k, v in inline_map(tokens["zIndex"]).items()]
    motion = inline_map(tokens["motion"])
    root += [f"  --motion-{k}: {unquote(v)};" for k, v in motion.items() if k != "reducedMotion"]
    root.append(f"  /* prefers-reduced-motion: {unquote(motion['reducedMotion'])} */")
    return theme, root


def build() -> str:
    theme_layout, root = layout()
    blocks = [
        HEADER,
        "@theme {\n  /* §2.1 Warna */\n" + "\n".join(colors()) + "\n}\n",
        "@theme {\n  /* §2.2 Tipografi */\n" + "\n".join(typography()) + "\n}\n",
        "@theme {\n  /* §2.3 Spasi, radius, elevasi, breakpoint, dan lebar halaman */\n" + "\n".join(theme_layout) + "\n}\n",
        ":root {\n  /* §2.3 Lapisan, gerak, dan bidang overlay */\n" + "\n".join(root) + "\n}\n",
    ]
    return "\n".join(blocks)


def main(argv: list[str]) -> int:
    content = build()
    if "--check" in argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != content:
            print("design/tokens.css berbeda dari hasil build. Jalankan: python build/build-tokens.py")
            return 1
        print("design/tokens.css selaras dengan DESIGN-SYSTEM.md §2")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(content, encoding="utf-8")
    print(f"ditulis: {OUT} ({len(content)} byte)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
