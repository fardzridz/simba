"""Build docx from the v2 design markdown, replacing mermaid blocks with rendered PNGs."""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "RANCANGAN-SISTEM-v2.md"
DIAGRAMS = ROOT / "build" / "diagrams"
TMP = ROOT / "build" / "v2-untuk-docx.md"
OUT = ROOT / "RANCANGAN-SISTEM-v2.docx"

NAMES = [
    "01-state",
    "02-usecase",
    "03-flow-a",
    "04-flow-b",
    "05-flow-c",
    "06-flow-d",
    "07-erd",
    "08-topology",
    "09-cycle",
]

text = SRC.read_text(encoding="utf8")
counter = {"n": 0}


def repl(match: re.Match) -> str:
    idx = counter["n"]
    counter["n"] += 1
    if idx >= len(NAMES):
        raise SystemExit(f"mermaid block #{idx} has no mapped image")
    png = DIAGRAMS / f"{NAMES[idx]}.png"
    if not png.exists():
        raise SystemExit(f"missing rendered diagram: {png}")
    return f"![]({png.relative_to(ROOT).as_posix()})\n"


new_text = re.sub(r"```mermaid\n(.*?)```", repl, text, flags=re.S)
if counter["n"] != len(NAMES):
    raise SystemExit(f"expected {len(NAMES)} mermaid blocks, found {counter['n']}")
TMP.write_text(new_text, encoding="utf8")

cmd = [
    "pandoc",
    TMP.relative_to(ROOT).as_posix(),
    "-o",
    OUT.name,
    "--toc",
    "--toc-depth=2",
    "-f",
    "gfm+tex_math_dollars",
    "-t",
    "docx",
    "--resource-path",
    ".",
]
proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf8")
print("pandoc exit:", proc.returncode)
if proc.stdout.strip():
    print(proc.stdout.strip())
if proc.stderr.strip():
    print(proc.stderr.strip())
if proc.returncode != 0:
    sys.exit(proc.returncode)
print("written:", OUT)
