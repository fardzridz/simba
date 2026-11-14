import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportsClient from "./reports-client";
import type { ReportRow, ReportRowsResult } from "@/db/queries/reports";
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
  userId: "",
  dateBasis: "selesai",
  dateFrom: "",
  dateTo: "",
};

function makeRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    assignmentId: "asg_huk_1",
    taskId: "tsk_huk_1",
    taskNumber: "HUK/2026/10/007",
    title: "Laporan Hasil Pengawasan Wilayah A",
    categoryName: "Kegiatan dan Laporan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    staffName: "Ahmad Fauzi",
    staffNip: "198705122010011001",
    staffPosition: "Staf Pelaksana",
    priority: "MENDESAK",
    status: "SELESAI",
    revisionCount: 1,
    dueAt: Date.UTC(2026, 9, 18, 16, 59) / 1000,
    completedAt: Date.UTC(2026, 9, 20, 16, 59) / 1000,
    archived: true,
    ...overrides,
  };
}

function makeReport(overrides: Partial<ReportRowsResult> = {}): ReportRowsResult {
  return {
    rows: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    summary: { total: 0, completed: 0, late: 0, overdue: 0, cancelled: 0, archived: 0 },
    period: "bulan_ini",
    periodLabel: "Bulan berjalan",
    dateBasis: "selesai",
    dateBasisLabel: "Tanggal selesai",
    rangeLabel: "1 Okt 2026 sampai 31 Okt 2026",
    isCustomRange: false,
    rangeIssue: null,
    scopeLabels: {
      division: "Hukum & Sengketa",
      status: "Semua status",
      category: "Semua kategori",
      staff: "Semua petugas",
    },
    ...overrides,
  };
}

function baseProps() {
  return {
    paging: { page: 1, pageSize: 25 as const },
    periodOptions: PERIOD_OPTIONS.map((p) => ({ id: p.id, label: p.label })),
    divisionOptions: [
      { id: "div_hukum", name: "Hukum & Sengketa" },
      { id: "div_pengawasan", name: "Pengawasan" },
    ],
    categoryOptions: [{ id: "cat_persuratan", name: "Persuratan" }],
    staffOptions: [{ id: "usr_1", name: "Ahmad Fauzi" }],
  };
}

function render(overrides: {
  report?: Partial<ReportRowsResult>;
  filters?: Partial<ReportsFilterState>;
  role?: "ADMIN" | "SUPER_ADMIN";
} = {}) {
  return renderToStaticMarkup(
    <ReportsClient
      role={overrides.role ?? "ADMIN"}
      report={makeReport(overrides.report)}
      filters={{ ...EMPTY_FILTERS, ...overrides.filters }}
      {...baseProps()}
    />,
  );
}

describe("halaman laporan: susunan", () => {
  it("menampilkan filter di atas dan tabel di bawah", () => {
    const html = render();

    expect(html).toContain("Laporan &amp; Ekspor");
    expect(html).toContain("Filter laporan");
    expect(html).toContain("Daftar Penugasan");

    // Filter harus muncul sebelum tabel di dalam dokumen.
    expect(html.indexOf("Filter laporan")).toBeLessThan(html.indexOf("Daftar Penugasan"));
  });

  it("tidak lagi memuat bagian yang dibuang", () => {
    const html = render();

    // Kartu ringkasan, panel ekspor terpisah, dan pratinjau A4 sudah dihapus.
    expect(html).not.toContain("Ringkasan Periode");
    expect(html).not.toContain("Tampilan Cetak A4");
    expect(html).not.toContain("Lihat detail");
    expect(html).not.toContain("Ekspor CSV divisi ini");
  });

  it("tidak memuat kop instansi maupun blok tanda tangan", () => {
    const html = render();

    expect(html).not.toContain("KOP INSTANSI");
    expect(html).not.toContain("Mengetahui,");
    expect(html).not.toContain("Kepala Divisi");
    expect(html).not.toContain("NIP Pejabat");
  });

  it("menyediakan kedelapan kontrol filter", () => {
    const html = render({ role: "SUPER_ADMIN" });

    for (const label of [
      "Periode",
      "Acuan tanggal",
      "Tanggal mulai",
      "Tanggal selesai",
      "Divisi",
      "Petugas",
      "Status",
      "Kategori",
    ]) {
      expect(html, `label ${label} tidak ditemukan`).toContain(label);
    }
  });
});

describe("halaman laporan: isi tabel", () => {
  it("merender satu baris per penugasan beserta kolomnya", () => {
    const html = render({ report: { rows: [makeRow()], total: 1 } });

    expect(html).toContain("HUK/2026/10/007");
    expect(html).toContain("Laporan Hasil Pengawasan Wilayah A");
    expect(html).toContain("Kegiatan dan Laporan");
    expect(html).toContain("Ahmad Fauzi");
    expect(html).toContain("Staf Pelaksana");
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).toContain("NIP 198705122010011001");
    expect(html).toContain("Mendesak");
    expect(html).toContain("Selesai");
    expect(html).toContain("Terarsip");
  });

  it("menghitung ketepatan waktu per baris, bukan hanya di ringkasan", () => {
    const dueAt = Date.UTC(2026, 9, 18, 16, 59) / 1000;
    const html = render({
      report: {
        rows: [
          makeRow({ assignmentId: "a1", taskNumber: "HUK/1", dueAt, completedAt: dueAt - 3600 }),
          // Tepat 2 hari setelah tenggat.
          makeRow({ assignmentId: "a2", taskNumber: "HUK/2", dueAt, completedAt: dueAt + 2 * 86_400 }),
        ],
        total: 2,
      },
    });

    expect(html).toContain("Tepat waktu");
    expect(html).toContain("Terlambat 2 hari");
  });

  it("menampilkan tanda kosong, bukan NaN, saat tugas belum selesai", () => {
    const html = render({
      report: {
        rows: [makeRow({ status: "BELUM_DIKERJAKAN", completedAt: null })],
        total: 1,
      },
    });

    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("menyatakan keadaan kosong dengan jelas, bukan tabel kosong tanpa penjelasan", () => {
    const html = render({ report: { rows: [], total: 0 } });

    expect(html).toContain("Tidak ada penugasan yang cocok dengan filter ini");
  });

  it("menawarkan hapus filter di dalam keadaan kosong bila filter aktif", () => {
    const html = render({
      report: { rows: [], total: 0 },
      filters: { status: "SELESAI" },
    });

    expect(html).toContain("Tidak ada penugasan yang cocok");
    expect(html).toContain("Hapus filter");
  });
});

describe("halaman laporan: ekspor", () => {
  it("menyediakan tiga tombol: CSV, Excel, dan Cetak", () => {
    const html = render({ report: { rows: [makeRow()], total: 1 } });

    expect(html).toContain("Ekspor CSV");
    expect(html).toContain("Ekspor Excel");
    expect(html).toContain("Cetak / PDF");
  });

  it("tombol ekspor berupa tautan unduhan, bukan tombol yang menunggu", () => {
    // Kop sudah tidak dipakai, jadi tidak ada lagi yang perlu diperiksa sebelum
    // mengunduh. Tautan langsung lebih sederhana dan tidak butuh state.
    const html = render({ report: { rows: [makeRow()], total: 1 } });

    expect(html).toMatch(/href="\/reports\/export[^"]*"/);
    expect(html).toContain("download");
  });

  it("tautan Excel membawa format=xlsx", () => {
    const html = render();
    expect(html).toContain("format=xlsx");
  });

  it("tombol Cetak menuju halaman cetak tersendiri, bukan window.print()", () => {
    // Cacat yang dikunci: mencetak halaman layar lewat `window.print()` hanya
    // menghasilkan 25 baris (satu halaman data), padahal pengguna mengira
    // seluruh hasil filter tercetak.
    const html = render({ report: { rows: [makeRow()], total: 128 } });

    expect(html).toMatch(/href="\/reports\/print[^"]*"/);
    // Tidak boleh ada lagi tombol yang memanggil cetak langsung dari layar.
    expect(html).not.toContain("Cetak sekarang");
  });

  it("tautan cetak tidak membawa nomor halaman", () => {
    const html = renderToStaticMarkup(
      <ReportsClient
        role="ADMIN"
        report={makeReport({ rows: [makeRow()], total: 128, totalPages: 6, page: 3 })}
        filters={EMPTY_FILTERS}
        {...baseProps()}
        paging={{ page: 3, pageSize: 25 }}
      />,
    );

    const printHref = html.match(/href="(\/reports\/print[^"]*)"/)?.[1] ?? "";
    expect(printHref).toContain("/reports/print");
    expect(printHref).not.toContain("page=");
    expect(printHref).not.toContain("perPage=");
  });

  it("menyatakan bahwa ekspor memuat seluruh hasil filter, bukan satu halaman", () => {
    const html = render({ report: { rows: [makeRow()], total: 128 } });

    expect(html).toContain("seluruh");
    expect(html).toContain("128");
    expect(html).toContain("bukan hanya halaman ini");
  });

  it("tidak menyebut Excel untuk berkas CSV", () => {
    // Label harus sesuai format sungguhan: CSV adalah CSV, Excel adalah xlsx.
    const html = render();
    const csvLink = html.slice(html.indexOf("Ekspor CSV") - 300, html.indexOf("Ekspor CSV"));
    expect(csvLink).not.toMatch(/xlsx/i);
  });
});

describe("halaman laporan: ringkasan", () => {
  it("menampilkan ringkasan sebagai satu baris di kepala tabel", () => {
    const html = render({
      report: {
        rows: [makeRow()],
        total: 128,
        summary: { total: 128, completed: 96, late: 7, overdue: 3, cancelled: 2, archived: 96 },
      },
    });

    expect(html).toContain("128");
    expect(html).toContain("selesai");
    expect(html).toContain("96");
    expect(html).toContain("terlambat");
    expect(html).toContain("lewat tenggat");
  });
});

describe("halaman laporan: paginasi", () => {
  it("menyebut rentang baris yang sedang dilihat", () => {
    const html = renderToStaticMarkup(
      <ReportsClient
        role="ADMIN"
        report={makeReport({ rows: [makeRow()], total: 128, totalPages: 6 })}
        filters={EMPTY_FILTERS}
        {...baseProps()}
      />,
    );

    expect(html).toContain("Menampilkan");
    expect(html).toContain("1");
    expect(html).toContain("25");
    expect(html).toContain("128");
  });

  it("menandai halaman aktif lewat aria-current, bukan hanya warna", () => {
    const html = render();
    expect(html).toContain('aria-current="page"');
  });

  it("menonaktifkan tombol Sebelumnya di halaman pertama", () => {
    const html = render();
    expect(html).toContain("disabled");
  });
});

describe("halaman laporan: filter divisi menurut peran", () => {
  it("Super Admin mendapat pemilih divisi berisi semua divisi", () => {
    const html = render({ role: "SUPER_ADMIN" });

    expect(html).toContain("Semua divisi");
    expect(html).toContain("Pengawasan");
  });

  it("Admin melihat divisinya sebagai teks, bukan pemilih yang bisa diubah", () => {
    const html = render({ role: "ADMIN" });

    // Nama divisi tetap tampil, tetapi tidak ada opsi divisi lain.
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).not.toContain("Pengawasan");
  });
});

describe("halaman laporan: rentang tanggal", () => {
  it("menjelaskan rentang yang belum lengkap, bukan mengabaikannya", () => {
    const html = render({
      report: { rangeIssue: "partial" },
      filters: { dateFrom: "2026-10-01", dateTo: "" },
    });

    expect(html).toContain('role="status"');
    expect(html).toContain("Rentang tanggal belum lengkap");
    expect(html).toContain("periode preset");
  });

  it("menjelaskan rentang terbalik, bukan membaliknya diam-diam", () => {
    const html = render({
      report: { rangeIssue: "reversed" },
      filters: { dateFrom: "2026-10-20", dateTo: "2026-10-01" },
    });

    expect(html).toContain("Tanggal mulai melewati tanggal selesai");
  });

  it("tidak menampilkan tanggal pengganti saat kolomnya kosong", () => {
    const html = render({
      report: { rangeIssue: "partial" },
      filters: { dateFrom: "2026-10-01", dateTo: "" },
    });

    expect(html).toMatch(/id="[^"]*-to"[^>]*value=""/);
  });

  it("menyebut acuan tanggal yang sedang dipakai", () => {
    const html = render({
      report: { dateBasis: "tenggat", dateBasisLabel: "Tanggal tenggat" },
      filters: { dateBasis: "tenggat" },
    });

    expect(html).toContain("Tanggal tenggat");
  });
});
