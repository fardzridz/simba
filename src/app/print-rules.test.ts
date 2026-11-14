import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { REPORT_COLUMNS_TOTAL_MM } from "@/lib/report-row-format";

/**
 * Regresi audit #13 lanjutan: aturan cetak laporan (DESIGN-SYSTEM.md bagian 8).
 *
 * Sebelum perbaikan ini, `@page` dan `page-break-inside` tidak ada sama sekali
 * di CSS. Akibatnya laporan dicetak dengan ukuran dan margin bawaan peramban.
 *
 * Tes ini membaca berkas CSS sumber, bukan hasil build, supaya tetap berjalan
 * tanpa `next build`.
 */

const CSS_PATH = fileURLToPath(new URL("./globals.css", import.meta.url));

function readCss(): string {
  return readFileSync(CSS_PATH, "utf8");
}

/** Ambil isi blok `@media print { ... }` dengan pencocokan kurung kurawal. */
function printBlock(css: string): string {
  const start = css.indexOf("@media print");
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return "";
}

describe("aturan cetak laporan", () => {
  it("mendefinisikan ukuran kertas A4 landscape, bukan potret", () => {
    // Laporan berupa tabel 11 kolom selebar 259mm. A4 potret hanya menyisakan
    // 180mm bersih, sehingga kolom terakhir akan terpotong saat dicetak.
    const print = printBlock(readCss());

    expect(print).toContain("@page");
    expect(print).toContain("size: A4 landscape");
    expect(print).not.toContain("size: A4 portrait");
    expect(print).toContain("margin: 12mm");
  });

  it("lebar kolom tabel muat di kertas yang didefinisikan", () => {
    // Menjaga agar ukuran kertas dan lebar kolom tidak berubah sendiri-sendiri:
    // menambah kolom tanpa mengubah ukuran kertas akan memotong kolom terakhir.
    const print = printBlock(readCss());
    const isLandscape = print.includes("size: A4 landscape");
    const usableMm = isLandscape ? 297 - 2 * 12 : 210 - 2 * 15;

    expect(REPORT_COLUMNS_TOTAL_MM).toBeLessThanOrEqual(usableMm);
  });

  it("mencegah baris tabel terpotong antar halaman", () => {
    const print = printBlock(readCss());

    // Properti standar dan properti lama sama-sama ditulis: mesin cetak yang
    // lebih tua hanya mengenal `page-break-inside`.
    expect(print).toContain(".print-avoid-break");
    expect(print).toContain("break-inside: avoid");
    expect(print).toContain("page-break-inside: avoid");
  });

  it("mengulang kepala tabel di setiap halaman cetak", () => {
    // Tanpa `table-header-group`, halaman kedua dan seterusnya berisi kolom
    // tanpa judul sehingga angkanya tidak bisa dibaca.
    const print = printBlock(readCss());
    expect(print).toContain(".print-table thead");
    expect(print).toContain("display: table-header-group");
  });

  it("mencetak tabel dengan border hitam tanpa warna latar", () => {
    const print = printBlock(readCss());

    // Status yang hanya dibedakan warna akan hilang saat dicetak hitam-putih.
    expect(print).toContain(".print-table");
    expect(print).toContain("0.5pt solid #000");
    expect(print).toContain("background: transparent");
  });

  it("memuat aturan cetak di dalam blok @media print, bukan di luar", () => {
    const css = readCss();
    const print = printBlock(css);

    expect(print.length).toBeGreaterThan(0);
    // `@page` di luar @media print akan mengubah pengaturan cetak seluruh
    // aplikasi, termasuk halaman yang bukan laporan.
    const outside = css.replace(print, "");
    expect(outside).not.toContain("@page");
  });
});
