import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportsLoading from "./loading";

/**
 * Keadaan memuat wajib menyatakan apa yang sedang dimuat, bukan spinner bisu,
 * dan tidak boleh mengarang angka selama data belum tiba (R-27, R-17, R-38).
 */
describe("Keadaan memuat Laporan & Ekspor", () => {
  const html = renderToStaticMarkup(<ReportsLoading />);

  it("mengumumkan status memuat ke pembaca layar", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Memuat laporan dan pilihan ekspor.");
  });

  it("tidak menampilkan angka apa pun selama memuat", () => {
    // Kerangka tidak boleh memuat digit: angka sementara adalah data karangan.
    const visibleText = html.replace(/<[^>]+>/g, " ");
    expect(visibleText).not.toMatch(/\d/);
  });

  it("menyembunyikan kerangka dari pembaca layar", () => {
    expect(html).toContain('aria-hidden="true"');
  });
});
