import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Halaman cetak harus memuat SELURUH baris hasil filter, bukan satu halaman.
 *
 * Cacat yang dicegah: tombol "Cetak / PDF" sempat memanggil `window.print()`
 * pada halaman layar, yang hanya memuat 25 baris. Pengguna mengira laporannya
 * lengkap, padahal 103 dari 128 baris tidak ikut tercetak. Karena itu halaman
 * cetak dibuat terpisah, dan tes ini mengunci pemisahan tersebut.
 *
 * Tes membaca berkas sumber, bukan hasil render, karena yang diuji adalah
 * pilihan kueri dan pemisahan rute, bukan tampilan.
 */

const PRINT_PAGE = fileURLToPath(new URL("./page.tsx", import.meta.url));
const SCREEN_CLIENT = fileURLToPath(
  new URL("../reports-client.tsx", import.meta.url),
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("halaman cetak: memuat seluruh hasil filter", () => {
  it("memakai kueri ekspor, bukan kueri berhalaman", () => {
    const source = read(PRINT_PAGE);

    // `getReportExport` mengambil seluruh hasil filter dalam satu kueri.
    // `getReportRows` hanya satu halaman (25 baris) dan tidak boleh dipakai.
    expect(source).toContain("getReportExport");
    expect(source).not.toContain("getReportRows");
  });

  it("membatasi jumlah baris, tetapi menyebutkan batasnya kepada pengguna", () => {
    const source = read(PRINT_PAGE);

    expect(source).toContain("MAX_PRINT_ROWS");
    // Batas tanpa pemberitahuan berarti laporan terpotong diam-diam.
    expect(source).toMatch(/Hasil filter berisi|dibatasi/);
  });

  it("memakai tabel yang sama dengan halaman layar", () => {
    // Dua tabel terpisah cepat atau lambat berbeda kolom. Halaman cetak wajib
    // memakai komponen bersama.
    expect(read(PRINT_PAGE)).toContain("ReportTable");
  });
});

describe("halaman layar: tidak mencetak dirinya sendiri", () => {
  it("tombol Cetak memakai penyusun URL halaman cetak, bukan window.print()", () => {
    const source = read(SCREEN_CLIENT);

    // Rute cetak disusun `buildPrintHref` di report-actions.ts, jadi nama rute
    // tidak ditulis mentah di komponen.
    expect(source).toContain("buildPrintHref");
    expect(source).toContain("printHref");
    // Tidak boleh ada lagi pemanggilan cetak langsung dari halaman layar.
    // Dicocokkan sebagai pemanggilan (`window.print()` diikuti `;` atau `}`),
    // bukan sekadar penyebutan di komentar penjelas.
    expect(source).not.toMatch(/window\.print\(\)\s*[;}]/);
    expect(source).not.toContain("onClick={() => window.print()");
  });

  it("memperingatkan bahwa Ctrl+P di halaman layar tidak lengkap", () => {
    // Pengguna tetap bisa menekan Ctrl+P kapan saja. Membiarkannya tanpa
    // peringatan berarti membiarkan laporan terpotong tanpa penjelasan.
    const source = read(SCREEN_CLIENT);

    expect(source).toContain("print:block");
    expect(source).toMatch(/hanya memuat|tidak lengkap|seluruh hasil filter/i);
  });
});

describe("halaman cetak: tanpa kop dan tanpa tanda tangan", () => {
  it("tidak memuat blok kop instansi maupun tanda tangan", () => {
    const source = read(PRINT_PAGE);

    for (const forbidden of ["KOP INSTANSI", "Mengetahui,", "Kepala Divisi", "NIP Pejabat"]) {
      expect(source, `halaman cetak masih memuat "${forbidden}"`).not.toContain(forbidden);
    }
  });
});
