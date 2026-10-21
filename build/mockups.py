"""Generate aligned ASCII dashboard mockups for the v2 design document."""
from pathlib import Path

LEFT_W = 52
RIGHT_W = 40
GAP = " "
TOTAL = LEFT_W + len(GAP) + RIGHT_W


def body(text, inner):
    if len(text) > inner:
        raise SystemExit(f"line too long ({len(text)} > {inner}): {text!r}")
    return text.ljust(inner)


def top(w, title):
    title = title.strip()
    fill = w - len(title) - 4
    left = fill // 2
    right = fill - left
    return "+" + "-" * left + " " + title + " " + "-" * right + "+"


def row(w, text):
    return "|" + body(" " + text, w - 2) + "|"


def hline(w):
    return "+" + "-" * (w - 2) + "+"


def full(text):
    return "|" + body(" " + text, TOTAL - 2) + "|"


def full_hline():
    return "+" + "-" * (TOTAL - 2) + "+"


def twist(left, right):
    return left + GAP + right


def blank(w):
    return row(w, "")


def panel(title, lines, w):
    out = [top(w, title)]
    out += [row(w, ln) for ln in lines]
    out.append(hline(w))
    return out


def stack(left_lines, right_lines):
    n = max(len(left_lines), len(right_lines))
    left_lines = left_lines + [blank(LEFT_W)] * (n - len(left_lines))
    right_lines = right_lines + [blank(RIGHT_W)] * (n - len(right_lines))
    return [twist(a, b) for a, b in zip(left_lines, right_lines)]


def render(title, notes, card_rows, left_panel, right_panel):
    out = [full_hline(), full(title)]
    out += [full(n) for n in notes]
    out += [full(c) for c in card_rows]
    out.append(full_hline())
    out += stack(left_panel, right_panel)
    out.append(full_hline())
    return "\n".join(out)


SA = render(
    "DASHBOARD SUPER ADMIN",
    ["Per 16 Okt 2026 - seluruh angka dalam scope semua divisi"],
    [
        "[ Pengguna: 48 ]  [ Divisi: 5 ]  [ Tugas: 312 ]",
        "[ Penugasan: 401 ]  [ Dokumen final: 286 ]  [ Antrean review > 2 hari: 7 ]",
    ],
    panel(
        "Progres Penugasan per Divisi",
        [
            "Hukum & Sengketa     85%    68 / 80",
            "Pengawasan           62%    48 / 77",
            "SDM & Organisasi     91%    41 / 45",
            "Sekretariat          40%    28 / 70",
            "Penindakan           95%   101 / 106",
            "Total 286 / 378 (tanpa DIBATALKAN)",
            "Sisa 23 penugasan DIBATALKAN",
        ],
        LEFT_W,
    ),
    panel(
        "Distribusi Status",
        [
            "Selesai              286   71,3%",
            "Menunggu Verifikasi   42   10,5%",
            "Sedang Dikerjakan     38    9,5%",
            "Belum Dikerjakan      12    3,0%",
            "Dibatalkan            23    5,7%",
            "Total selalu 100%",
            "Tunggu review terlama: 2 hari",
        ],
        RIGHT_W,
    ),
)

ADM = render(
    "DASHBOARD ADMIN DIVISI - Hukum & Sengketa",
    ["Hanya data divisinya sendiri"],
    [
        "[ Anggota: 8 ]  [ Penugasan aktif: 14 ]  [ Menunggu Verifikasi: 6 ]",
        "[ Perlu revisi: 3 ]  [ Terlambat: 4 ]  [ Dokumen final: 92 ]",
    ],
    panel(
        "Beban Kerja (aktif / total)",
        [
            "Ahmad Fauzi   : 4 aktif (1 review, 3 selesai)",
            "Siti Rahma    : 2 aktif (2 perlu revisi)",
            "Budi Santoso  : 1 aktif (3 selesai, 1 mulai)",
            "Antrean review tertua: 2 hari 4 jam",
            "Menampilkan 3 dari 8 staf",
        ],
        LEFT_W,
    ),
    panel(
        "Tenggat & Keterlambatan",
        [
            "TERLAMBAT Berkas Sengketa A  1 hari",
            "TERLAMBAT Rekap BA Pleno       3 jam",
            "4 jam      Pengawasan Pleno",
            "1 hari     Laporan Bulanan",
            "Ambang dekat = 3 hari",
        ],
        RIGHT_W,
    ),
)

USR = render(
    "DASHBOARD USER - staf pelaksana",
    ["Hanya penugasan milik sendiri"],
    [
        "[ Aktif: 5 ]  [ Perlu Revisi: 1 ]  [ Terlambat: 1 ]",
        "[ Total penugasan: 16 ]  [ Selesai: 12 ]  [ Tepat waktu: 10/12 ]",
    ],
    panel(
        "Aktif per Status",
        [
            "Belum Dikerjakan     2",
            "Sedang Dikerjakan    1",
            "Menunggu Verifikasi  1",
            "Perlu Revisi         1",
        ],
        LEFT_W,
    ),
    panel(
        "Perlu Tindakan",
        [
            "REVISI   Laporan Pengawasan A",
            "         catatan admin ada",
            "TENGGAT  Dokumen C1 Pleno",
            "         hari ini 17:00 WIB",
        ],
        RIGHT_W,
    ),
)

blocks = [SA, ADM, USR]
out = Path(__file__).resolve().parent / "mockups.txt"
out.write_text("\n\n".join(blocks) + "\n", encoding="utf8")
print("\n\n".join(blocks))
print()
print("max width:", max(len(l) for b in blocks for l in b.splitlines()))
