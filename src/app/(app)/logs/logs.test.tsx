import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LogsClient from "./logs-client";

describe("Log Aktivitas L15", () => {
  it("merender judul log, spanduk immutability, dan tabel rekam jejak", () => {
    const html = renderToStaticMarkup(
      <LogsClient userRole="ADMIN" userDivisionName="Hukum & Sengketa" />,
    );

    expect(html).toContain("Log Aktivitas");
    expect(html).toContain(
      "Log tidak dapat diubah atau dihapus lewat antarmuka. Hanya Admin divisi dan Super Admin yang dapat membukanya.",
    );
    expect(html).toContain("Waktu");
    expect(html).toContain("Aktor");
    expect(html).toContain("Aksi");
    expect(html).toContain("Entitas");
    expect(html).toContain("Ringkasan perubahan");
  });

  it("merender kode aksi monospasi dan ringkasan audit trail", () => {
    const html = renderToStaticMarkup(
      <LogsClient userRole="ADMIN" userDivisionName="Hukum & Sengketa" />,
    );

    expect(html).toContain("submission.created");
    expect(html).toContain("due_date.extended");
    expect(html).toContain("assignment.reviewed");
    expect(html).toContain("Siti Rahma");
    expect(html).toContain("HUK/2026/10/009");
    expect(html).toContain("Versi 1 dikirim, status menjadi Menunggu Verifikasi.");
    expect(html).toContain("due_at: 16 Okt 2026 menjadi 17 Okt 2026.");
  });

  it("merender filter aktor, aksi, entitas, dan periode", () => {
    const html = renderToStaticMarkup(
      <LogsClient userRole="SUPER_ADMIN" userDivisionName="" />,
    );

    expect(html).toContain("Aktor: semua");
    expect(html).toContain("Aksi: semua");
    expect(html).toContain("Entitas: semua");
    expect(html).toContain("Periode: semua");
    expect(html).toContain(
      "Nilai sebelum dan sesudah disimpan, sehingga perubahan dapat diperiksa tanpa membuka data aslinya.",
    );
  });
});
