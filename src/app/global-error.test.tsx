import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GlobalError from "./global-error";

/**
 * Batas galat terluar. Ini lapisan terakhir yang menangkap kegagalan root
 * layout, jadi ia harus bisa berdiri sendiri: dokumennya sendiri, gayanya
 * sendiri, dan tidak boleh ikut gagal saat yang dilempar bukan `Error`.
 */
describe("Batas galat terluar (global-error)", () => {
  it("membawa dokumen sendiri: html, body, dan bahasa halaman", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error("boom")} retry={vi.fn()} />,
    );

    // Tanpa <html> dan <body> sendiri, halaman galat tidak akan tampil benar
    // karena berkas ini menggantikan root layout.
    expect(html).toContain("<html");
    expect(html).toContain("<body");
    expect(html).toContain('lang="id"');
  });

  it("menyebutkan bahwa ini kegagalan kerangka, bukan masalah hak akses", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error("boom")} retry={vi.fn()} />,
    );

    expect(html).toContain("Portal tidak dapat dimuat");
    expect(html).toContain("bukan berarti akun Anda tidak");
    expect(html).toContain("Muat ulang");
    expect(html).toContain('role="alert"');
  });

  it("tidak membocorkan detail internal ke pengguna", () => {
    const html = renderToStaticMarkup(
      <GlobalError
        error={new Error("D1_ERROR: no such table: divisions")}
        retry={vi.fn()}
      />,
    );

    expect(html).not.toContain("no such table");
    expect(html).not.toContain("divisions");
    expect(html).not.toContain("D1_ERROR");
  });

  it("menampilkan kode kejadian dari digest", () => {
    const withDigest = Object.assign(new Error("boom"), { digest: "xyz789" });
    const html = renderToStaticMarkup(
      <GlobalError error={withDigest} retry={vi.fn()} />,
    );

    expect(html).toContain("Kode kejadian:");
    expect(html).toContain("xyz789");
  });

  it("tetap terender saat yang dilempar bukan Error", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={{ aneh: true }} retry={vi.fn()} />,
    );

    expect(html).toContain("Portal tidak dapat dimuat");
    expect(html).not.toContain("Kode kejadian:");
  });

  it("memasang retry pada tombol pemulihan", () => {
    const retry = vi.fn();
    const html = renderToStaticMarkup(
      <GlobalError error={new Error("boom")} retry={retry} />,
    );

    // Markup tidak membuktikan handler terpasang, tetapi membuktikan tombolnya
    // ada dan bukan tautan; perilaku klik diuji di route-error.test.
    expect(html).toContain("<button");
    expect(html).toContain("Muat ulang");
  });
});
