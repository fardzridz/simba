import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportsError from "./error";

/**
 * Batas galat laporan: pesan harus menyebut sebab dan langkah berikutnya,
 * tidak membocorkan detail internal, dan `retry` benar-benar terpasang (R-27, R-36).
 */
describe("Keadaan galat Laporan & Ekspor", () => {
  it("menyebut sebab dan dua tindakan pemulihan", () => {
    const html = renderToStaticMarkup(
      <ReportsError error={new Error("boom")} retry={vi.fn()} />,
    );

    expect(html).toContain("Laporan gagal dimuat");
    expect(html).toContain("Coba muat ulang");
    expect(html).toContain("Kembali ke Dashboard");
    expect(html).toContain('role="alert"');
  });

  it("tidak membocorkan pesan internal ke pengguna", () => {
    const html = renderToStaticMarkup(
      <ReportsError
        error={new Error("D1_ERROR: no such table: task_assignments")}
        retry={vi.fn()}
      />,
    );

    expect(html).not.toContain("no such table");
    expect(html).not.toContain("task_assignments");
    expect(html).not.toContain("D1_ERROR");
  });

  it("menampilkan kode kejadian dari digest untuk mencocokkan log server", () => {
    const withDigest = Object.assign(new Error("boom"), { digest: "abc123" });
    const html = renderToStaticMarkup(
      <ReportsError error={withDigest} retry={vi.fn()} />,
    );

    expect(html).toContain("Kode kejadian:");
    expect(html).toContain("abc123");
  });

  it("tetap terender saat yang dilempar bukan Error", () => {
    // Komponen klien bisa melempar nilai apa pun; jangan sampai batas galat ikut gagal.
    const html = renderToStaticMarkup(
      <ReportsError error="galat string" retry={vi.fn()} />,
    );

    expect(html).toContain("Laporan gagal dimuat");
    expect(html).not.toContain("Kode kejadian:");
  });
});
