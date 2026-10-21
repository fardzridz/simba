import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportsClient from "./reports-client";

describe("Laporan & Ekspor L14", () => {
  it("merender judul laporan, 5 metrik ringkasan periode, dan panel aksi ekspor", () => {
    const html = renderToStaticMarkup(
      <ReportsClient userRole="ADMIN" userDivisionName="Hukum & Sengketa" />,
    );

    expect(html).toContain("Laporan &amp; Ekspor");
    expect(html).toContain("Ringkasan Periode");
    expect(html).toContain("satuan: penugasan");
    expect(html).toContain("378"); // Total Penugasan
    expect(html).toContain("286"); // Selesai
    expect(html).toContain("248"); // Tepat Waktu
    expect(html).toContain("31"); // Terlambat
    expect(html).toContain("Ekspor XLSX");
    expect(html).toContain("Cetak / PDF");
  });

  it("merender tabel pratinjau rekapitulasi divisi dan kartu pratinjau cetak A4", () => {
    const html = renderToStaticMarkup(
      <ReportsClient userRole="ADMIN" userDivisionName="Hukum & Sengketa" />,
    );

    expect(html).toContain("Pratinjau");
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).toContain("Tampilan Cetak A4");
    expect(html).toContain("[KOP INSTANSI PENYELENGGARA PEMILU]");
    expect(html).toContain("Laporan Rekapitulasi Penugasan");
    expect(html).toContain("Mengetahui,");
    expect(html).toContain("Kepala Divisi");
  });

  it("merender filter divisi lengkap saat dibuka oleh Super Admin", () => {
    const html = renderToStaticMarkup(
      <ReportsClient userRole="SUPER_ADMIN" userDivisionName="" />,
    );

    expect(html).toContain("Divisi: Semua");
    expect(html).toContain("Pengawasan");
    expect(html).toContain("Sekretariat");
    expect(html).toContain("Penindakan");
  });
});
