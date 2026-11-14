import { describe, expect, it } from "vitest";
import {
  EMPTY_CELL,
  PRIORITY_LABELS,
  REPORT_COLUMNS,
  REPORT_COLUMNS_TOTAL_MM,
  accuracyLabel,
  accuracyOf,
  dateCell,
  reportRowValues,
  staffDetailLines,
} from "@/lib/report-row-format";
import type { ReportRow } from "@/db/queries/reports";

/**
 * Format baris dipakai bersama oleh tabel layar, hasil cetak, CSV, dan Excel.
 * Tes ini mengunci dua hal yang paling mudah rusak tanpa terlihat:
 * arti "tepat waktu" per baris, dan kesesuaian lebar kolom dengan kertas A4.
 */

const NOW = Date.UTC(2026, 9, 20, 5, 0) / 1000;

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
    staffNip: "198705122010011001",
    staffPosition: "Staf Pelaksana",
    priority: "MENDESAK",
    status: "SELESAI",
    revisionCount: 0,
    dueAt: NOW,
    completedAt: NOW - 3600,
    archived: true,
    ...overrides,
  };
}

describe("accuracyOf: arti tepat waktu per baris", () => {
  it("selesai sebelum tenggat dihitung tepat waktu", () => {
    const accuracy = accuracyOf(row({ dueAt: NOW, completedAt: NOW - 3600 }));
    expect(accuracy.kind).toBe("tepat");
    expect(accuracyLabel(accuracy)).toBe("Tepat waktu");
  });

  it("selesai TEPAT pada detik tenggat masih tepat waktu", () => {
    // Batas yang dipakai: completedAt <= dueAt.
    const accuracy = accuracyOf(row({ dueAt: NOW, completedAt: NOW }));
    expect(accuracy.kind).toBe("tepat");
  });

  it("selesai satu detik setelah tenggat sudah terlambat", () => {
    const accuracy = accuracyOf(row({ dueAt: NOW, completedAt: NOW + 1 }));
    expect(accuracy.kind).toBe("terlambat");
    // Satu detik terlambat tetap dilaporkan "1 hari", bukan "0 hari" yang
    // terbaca seolah tidak terlambat.
    expect(accuracyLabel(accuracy)).toBe("Terlambat 1 hari");
  });

  it("membulatkan keterlambatan ke atas, bukan ke bawah", () => {
    const accuracy = accuracyOf(row({ dueAt: NOW, completedAt: NOW + 86_400 + 60 }));
    expect(accuracy.kind).toBe("terlambat");
    if (accuracy.kind === "terlambat") expect(accuracy.days).toBe(2);
  });

  it("tugas yang belum selesai tidak punya ketepatan waktu sama sekali", () => {
    // Bukan "tepat waktu" dan bukan "terlambat": belum ada hasilnya.
    for (const status of ["BELUM_DIKERJAKAN", "SEDANG_DIKERJAKAN", "MENUNGGU_VERIFIKASI"] as const) {
      const accuracy = accuracyOf(row({ status, completedAt: null }));
      expect(accuracy.kind).toBe("belum");
      expect(accuracyLabel(accuracy)).toBe(EMPTY_CELL);
    }
  });

  it("tugas yang dibatalkan juga tidak dihitung tepat waktu", () => {
    const accuracy = accuracyOf(row({ status: "DIBATALKAN", completedAt: null }));
    expect(accuracy.kind).toBe("belum");
  });
});

describe("dateCell", () => {
  it("memakai tanggal WIB, bukan UTC", () => {
    // 1 Okt 2026 00:30 WIB = 30 Sep 2026 17:30 UTC.
    const instant = Date.UTC(2026, 8, 30, 17, 30) / 1000;
    expect(dateCell(instant)).toBe("1 Okt 2026");
  });

  it("menampilkan tanda kosong bila belum ada tanggal", () => {
    expect(dateCell(null)).toBe(EMPTY_CELL);
  });
});

describe("staffDetailLines: NIP dan jabatan di dalam sel Petugas", () => {
  it("memuat nama, jabatan, divisi, dan NIP berurutan", () => {
    expect(staffDetailLines(row())).toEqual([
      "Ahmad Fauzi",
      "Staf Pelaksana",
      "Hukum & Sengketa",
      "NIP 198705122010011001",
    ]);
  });

  it("melewati jabatan dan NIP yang memang tidak diisi, tanpa baris kosong", () => {
    const lines = staffDetailLines(row({ staffPosition: null, staffNip: null }));
    expect(lines).toEqual(["Ahmad Fauzi", "Hukum & Sengketa"]);
    expect(lines.every((line) => line.length > 0)).toBe(true);
  });
});

describe("REPORT_COLUMNS: susunan kolom", () => {
  it("berisi 11 kolom sesuai kesepakatan", () => {
    expect(REPORT_COLUMNS.map((column) => column.header)).toEqual([
      "No",
      "Nomor Tugas",
      "Judul & Kategori",
      "Petugas & Divisi",
      "Prioritas",
      "Status",
      "Tenggat",
      "Selesai",
      "Ketepatan Waktu",
      "Revisi",
      "Dokumen",
    ]);
  });

  it("muat di A4 landscape: total lebar di bawah 267mm bersih", () => {
    // A4 landscape 297mm dikurangi margin 2x12mm = 273mm; dipakai batas 267mm
    // sebagai sisa aman. Bila kolom ditambah tanpa mengurangi yang lain, tes
    // ini gagal sebelum laporan dicetak dan kolom terakhirnya terpotong.
    expect(REPORT_COLUMNS_TOTAL_MM).toBeLessThanOrEqual(267);
    // Dan TIDAK muat di A4 portrait (210mm - 2x15mm = 180mm), yang menjadi
    // alasan halaman ini dicetak landscape.
    expect(REPORT_COLUMNS_TOTAL_MM).toBeGreaterThan(180);
  });

  it("setiap kolom punya nilai teks, termasuk saat data kosong", () => {
    const values = reportRowValues(
      row({ staffNip: null, staffPosition: null, completedAt: null, status: "BELUM_DIKERJAKAN", archived: false }),
      0,
    );

    expect(values).toHaveLength(REPORT_COLUMNS.length);
    expect(values.every((value) => typeof value === "string")).toBe(true);
    // Tidak boleh ada "undefined" atau "null" yang bocor ke CSV/Excel.
    expect(values.join(" ")).not.toMatch(/undefined|null/);
  });

  it("memakai label Indonesia, bukan kode status mentah", () => {
    const values = reportRowValues(row({ status: "MENUNGGU_VERIFIKASI" }), 0);
    const status = values[REPORT_COLUMNS.findIndex((c) => c.key === "status")]!;
    const priority = values[REPORT_COLUMNS.findIndex((c) => c.key === "priority")]!;

    expect(status).toBe("Menunggu Verifikasi");
    expect(priority).toBe(PRIORITY_LABELS.MENDESAK);
    // Kode mentah tidak boleh muncul di dokumen yang dibaca orang luar.
    expect(status).not.toContain("_");
  });

  it("menggabungkan judul dan kategori dalam satu sel", () => {
    const values = reportRowValues(row(), 0);
    const title = values[REPORT_COLUMNS.findIndex((c) => c.key === "title")]!;
    expect(title).toBe("Laporan Hasil Pengawasan Wilayah A (Kegiatan dan Laporan)");
  });

  it("menomori baris mengikuti posisinya di halaman", () => {
    // Nomor urut harus melanjutkan penomoran halaman berikutnya, bukan mulai
    // dari 1 lagi di setiap halaman.
    expect(reportRowValues(row(), 24)[0]).toBe("25");
    expect(reportRowValues(row(), 49)[0]).toBe("50");
  });
});
