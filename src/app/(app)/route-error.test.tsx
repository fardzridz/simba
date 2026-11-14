import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RouteError from "./route-error";

/**
 * Kerangka galat bersama untuk lima rute.
 *
 * Kontrak yang diuji: pesan tidak membocorkan detail internal, `digest` hanya
 * muncul bila ada, dan batas galat tidak ikut gagal saat yang dilempar bukan
 * `Error`. Penyambungan `retry` ke tombol diuji terpisah di
 * `route-error-wiring.test.tsx` karena memerlukan mock komponen.
 */
describe("Kerangka galat rute (route-error)", () => {
  const base = {
    moduleName: "Modul Uji",
    title: "Gagal memuat",
    description: "Data tidak dapat diambil saat ini.",
  };

  it("menyediakan satu aksi keluar yang pasti", () => {
    const html = renderToStaticMarkup(
      <RouteError {...base} error={new Error("boom")} retry={vi.fn()} />,
    );

    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Kembali ke Dashboard");
  });

  it("menghormati aksi keluar khusus modul", () => {
    const html = renderToStaticMarkup(
      <RouteError
        {...base}
        error={new Error("boom")}
        retry={vi.fn()}
        actionHref="/tasks"
        actionLabel="Buka Daftar Tugas"
      />,
    );

    expect(html).toContain('href="/tasks"');
    expect(html).toContain("Buka Daftar Tugas");
    expect(html).not.toContain('href="/dashboard"');
  });

  it("tidak pernah merender pesan internal", () => {
    const html = renderToStaticMarkup(
      <RouteError
        {...base}
        error={new Error("SqliteError: no such column: tasks.due_at")}
        retry={vi.fn()}
      />,
    );

    expect(html).not.toContain("no such column");
    expect(html).not.toContain("tasks.due_at");
    expect(html).not.toContain("SqliteError");
  });

  it("hanya menampilkan kode kejadian bila digest tersedia", () => {
    const tanpaDigest = renderToStaticMarkup(
      <RouteError {...base} error={new Error("boom")} retry={vi.fn()} />,
    );
    expect(tanpaDigest).not.toContain("Kode kejadian:");

    const denganDigest = renderToStaticMarkup(
      <RouteError
        {...base}
        error={Object.assign(new Error("boom"), { digest: "d-42" })}
        retry={vi.fn()}
      />,
    );
    expect(denganDigest).toContain("Kode kejadian:");
    expect(denganDigest).toContain("d-42");
  });

  it("tetap terender saat yang dilempar bukan Error", () => {
    const html = renderToStaticMarkup(
      <RouteError {...base} error="galat berupa string" retry={vi.fn()} />,
    );

    expect(html).toContain("Gagal memuat");
    expect(html).not.toContain("Kode kejadian:");
  });

  it("menampilkan judul halaman hanya bila diminta", () => {
    const denganJudul = renderToStaticMarkup(
      <RouteError
        {...base}
        error={new Error("boom")}
        retry={vi.fn()}
        pageTitle="Log Aktivitas"
      />,
    );
    expect(denganJudul).toContain("Log Aktivitas");

    const tanpaJudul = renderToStaticMarkup(
      <RouteError {...base} error={new Error("boom")} retry={vi.fn()} />,
    );
    expect(tanpaJudul).not.toContain("<h1");
  });
});
