import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportsClient from "./reports-client";
import type { ReportView, ReportPeriod } from "@/db/queries/reports";
import type { ReportsFilterState } from "./reports-client";

// Filter memakai router.push; render statis berjalan tanpa runtime Next.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

const PERIOD_OPTIONS = [
  { id: "bulan_ini", label: "Bulan berjalan" },
  { id: "bulan_lalu", label: "Bulan lalu" },
  { id: "triwulan_lalu", label: "Triwulan lalu" },
  { id: "tahun_ini", label: "Tahun berjalan" },
] as const;

const EMPTY_FILTERS: ReportsFilterState = {
  period: "bulan_ini",
  divisionId: null,
  status: "",
  categoryId: "",
};

function makeReport(overrides: Partial<ReportView> = {}): ReportView {
  return {
    period: "bulan_ini" as ReportPeriod,
    periodLabel: "Bulan berjalan",
    rangeLabel: "1 Okt 2026 sampai 31 Okt 2026",
    summary: {
      totalAssignments: 0,
      completed: 0,
      onTime: 0,
      overdue: 0,
      cancelled: 0,
      finalDocuments: 0,
    },
    rows: [],
    scopeLabels: {
      division: "Semua divisi",
      status: "Semua status",
      category: "Kategori: semua",
    },
    ...overrides,
  };
}

function baseProps() {
  return {
    periodOptions: PERIOD_OPTIONS.map((p) => ({ id: p.id, label: p.label })),
    divisionOptions: [
      { id: "div_hukum", name: "Hukum & Sengketa" },
      { id: "div_pengawasan", name: "Pengawasan" },
    ],
    categoryOptions: [{ id: "cat_persuratan", name: "Persuratan" }],
  };
}

describe("Laporan & Ekspor L14", () => {
  it("merender angka 0 semua saat database kosong, tanpa angka purwarupa", () => {
    const html = renderToStaticMarkup(
      <ReportsClient
        role="ADMIN"
        report={makeReport()}
        filters={EMPTY_FILTERS}
        ownDivisionName="Hukum & Sengketa"
        {...baseProps()}
      />,
    );

    expect(html).toContain("Laporan &amp; Ekspor");
    expect(html).toContain("Ringkasan Periode");
    expect(html).toContain("satuan: penugasan");
    expect(html).toContain("Ekspor CSV");
    expect(html).toContain("Cetak / PDF");
    expect(html).not.toContain("378");
    expect(html).not.toContain("286");
  });

  it("merender angka dari props beserta tabel rekapitulasi per divisi", () => {
    const html = renderToStaticMarkup(
      <ReportsClient
        role="ADMIN"
        report={makeReport({
          summary: {
            totalAssignments: 12,
            completed: 7,
            onTime: 6,
            overdue: 2,
            cancelled: 1,
            finalDocuments: 7,
          },
          rows: [
            {
              divisionId: "div_hukum",
              divisionName: "Hukum & Sengketa",
              divisionCode: "HUK",
              totalAssignments: 12,
              completed: 7,
              overdue: 2,
              finalDocuments: 7,
            },
          ],
        })}
        filters={EMPTY_FILTERS}
        ownDivisionName="Hukum & Sengketa"
        {...baseProps()}
      />,
    );

    expect(html).toContain("12");
    expect(html).toContain("7");
    expect(html).toContain("6");
    expect(html).toContain("2");
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).toContain("Tampilan Cetak A4");
    expect(html).toContain("[KOP INSTANSI PENYELENGGARA PEMILU]");
    expect(html).toContain("Laporan Rekapitulasi Penugasan");
    expect(html).toContain("Mengetahui,");
    expect(html).toContain("Kepala Divisi");
    // Teks dibatalkan memakai angka dari data
    expect(html).toContain("1 penugasan berstatus Dibatalkan dikeluarkan dari penyebut progres.");
  });

  it("menyediakan pilihan divisi nyata saat dibuka Super Admin", () => {
    const html = renderToStaticMarkup(
      <ReportsClient
        role="SUPER_ADMIN"
        report={makeReport()}
        filters={EMPTY_FILTERS}
        ownDivisionName=""
        {...baseProps()}
      />,
    );

    expect(html).toContain("Divisi: Semua");
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).toContain("Pengawasan");
    expect(html).toContain("Persuratan");
  });

  it("membangun tautan ekspor CSV dengan filter aktif", () => {
    const html = renderToStaticMarkup(
      <ReportsClient
        role="SUPER_ADMIN"
        report={makeReport()}
        filters={{ period: "bulan_lalu", divisionId: "div_hukum", status: "", categoryId: "" }}
        ownDivisionName=""
        {...baseProps()}
      />,
    );

    expect(html).toContain('href="/reports/export?period=bulan_lalu&amp;divisi=div_hukum"');
  });
});
