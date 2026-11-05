import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportsClient from "./reports-client";
import type { ReportRecapRow } from "@/db/queries/reports";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const FIXTURE_ROWS: ReportRecapRow[] = [
  {
    divisionId: "div_hukum",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    totalAssignments: 4,
    completed: 1,
    onTime: 1,
    overdue: 2,
    finalDocuments: 1,
    cancelled: 0,
  },
];

const PERIODS = [
  { key: "bulan_berjalan", label: "Bulan berjalan (1 Okt sampai 31 Okt 2026)" },
];

function baseProps() {
  return {
    rows: FIXTURE_ROWS,
    periods: PERIODS,
    activePeriodKey: "bulan_berjalan",
    periodLabel: "1 Okt sampai 31 Okt 2026",
    activeDivision: "semua",
    divisionNames: [] as string[],
    userRole: "ADMIN" as const,
    userDivisionName: "Hukum & Sengketa",
  };
}

describe("Laporan & Ekspor L14", () => {
  it("merender ringkasan periode yang dihitung dari baris divisi dan aksi ekspor", () => {
    const html = renderToStaticMarkup(<ReportsClient {...baseProps()} />);

    expect(html).toContain("Laporan &amp; Ekspor");
    expect(html).toContain("Ringkasan Periode");
    expect(html).toContain("satuan: penugasan");
    expect(html).toContain("Ekspor CSV");
    expect(html).toContain("Cetak / PDF");
    // Ekspor memakai filter periode yang sama dengan layar.
    expect(html).toContain('href="/api/reports/export?periode=bulan_berjalan"');
  });

  it("merender tabel pratinjau rekapitulasi divisi dan kartu pratinjau cetak A4", () => {
    const html = renderToStaticMarkup(<ReportsClient {...baseProps()} />);

    expect(html).toContain("Pratinjau");
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).toContain("Tampilan Cetak A4");
    expect(html).toContain("[KOP INSTANSI PENYELENGGARA PEMILU]");
    expect(html).toContain("Laporan Rekapitulasi Penugasan");
    expect(html).toContain("Mengetahui,");
    expect(html).toContain("Kepala Divisi");
  });

  it("menyertakan filter divisi pada tautan ekspor untuk Super Admin", () => {
    const html = renderToStaticMarkup(
      <ReportsClient
        {...baseProps()}
        userRole="SUPER_ADMIN"
        userDivisionName=""
        activeDivision="Pengawasan"
        divisionNames={["Hukum & Sengketa", "Pengawasan"]}
      />,
    );

    expect(html).toContain("Divisi: Semua");
    expect(html).toContain(
      'href="/api/reports/export?periode=bulan_berjalan&amp;divisi=Pengawasan"',
    );
  });
});
