import { describe, expect, it } from "vitest";
import { buildReportCsv, csvField } from "./report-csv";
import type { ReportRow, ReportRowsResult } from "@/db/queries/reports";

const REPORT: ReportRowsResult = {
  rows: [],
  total: 2,
  page: 1,
  pageSize: 25,
  totalPages: 1,
  summary: {
    total: 2,
    completed: 1,
    late: 1,
    overdue: 0,
    cancelled: 0,
    archived: 1,
  },
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
};

function row(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    assignmentId: "asg_1",
    taskId: "tsk_1",
    taskNumber: "HUK/2026/10/007",
    title: "Laporan Hasil Pengawasan Wilayah A",
    categoryName: "Kegiatan dan Laporan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    staffName: "Ahmad Fauzi",
    staffNip: null,
    staffPosition: null,
    priority: "MENDESAK",
    status: "SELESAI",
    revisionCount: 0,
    dueAt: Date.UTC(2026, 9, 18, 16, 59) / 1000,
    completedAt: Date.UTC(2026, 9, 17, 16, 59) / 1000,
    archived: true,
    ...overrides,
  };
}

const HEADERS = ["No", "Nomor Tugas", "Judul"];
const valuesOf = (r: ReportRow, index: number) => [
  String(index + 1),
  r.taskNumber,
  r.title,
];

describe("csvField", () => {
  it("membiarkan nilai biasa apa adanya", () => {
    expect(csvField("Hukum & Sengketa")).toBe("Hukum & Sengketa");
  });

  it("mengapit nilai yang memuat koma", () => {
    expect(csvField("Selesai, terlambat")).toBe('"Selesai, terlambat"');
  });

  it("menggandakan kutip di dalam nilai berkutip", () => {
    expect(csvField('Dokumen "C1"')).toBe('"Dokumen ""C1"""');
  });

  it("mengapit nilai yang memuat baris baru", () => {
    expect(csvField("baris satu\nbaris dua")).toBe('"baris satu\nbaris dua"');
  });
});

describe("buildReportCsv", () => {
  it("menyertakan kepala berkas, ringkasan, dan seluruh baris", () => {
    const csv = buildReportCsv({
      report: REPORT,
      rows: [row(), row({ assignmentId: "asg_2", taskNumber: "HUK/2026/10/008" })],
      headers: HEADERS,
      valuesOf,
    });

    expect(csv).toContain("LAPORAN PENUGASAN");
    expect(csv).toContain("Bulan berjalan (1 Okt 2026 sampai 31 Okt 2026)");
    expect(csv).toContain("Acuan tanggal,Tanggal selesai");
    expect(csv).toContain("Total,2");
    expect(csv).toContain("HUK/2026/10/007");
    expect(csv).toContain("HUK/2026/10/008");
  });

  it("memakai BOM agar Excel membaca huruf beraksen dengan benar", () => {
    const csv = buildReportCsv({ report: REPORT, rows: [row()], headers: HEADERS, valuesOf });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("memakai akhir baris CRLF seperti yang diharapkan Excel", () => {
    const csv = buildReportCsv({ report: REPORT, rows: [row()], headers: HEADERS, valuesOf });
    expect(csv).toContain("\r\n");
    // Tidak boleh ada LF tunggal yang tidak didahului CR.
    expect(csv.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("menuliskan ringkasan keterlambatan dengan dua arti yang berbeda", () => {
    // "Terlambat" (selesai melewati tenggat) dan "lewat tenggat" (belum selesai)
    // adalah dua hal berbeda; menyamakan keduanya membuat laporan salah arti.
    const csv = buildReportCsv({ report: REPORT, rows: [], headers: HEADERS, valuesOf });

    expect(csv).toContain("Terlambat (selesai melewati tenggat),1");
    expect(csv).toContain("Belum selesai dan lewat tenggat,0");
  });

  it("mengapit nilai yang memuat koma di dalam baris data", () => {
    const csv = buildReportCsv({
      report: REPORT,
      rows: [row({ title: "Laporan, revisi kedua" })],
      headers: HEADERS,
      valuesOf,
    });

    expect(csv).toContain('"Laporan, revisi kedua"');
  });

  it("tetap menghasilkan berkas sah saat tidak ada baris sama sekali", () => {
    const csv = buildReportCsv({ report: REPORT, rows: [], headers: HEADERS, valuesOf });
    expect(csv).toContain("Daftar penugasan");
    expect(csv).toContain("No,Nomor Tugas,Judul");
  });
});
