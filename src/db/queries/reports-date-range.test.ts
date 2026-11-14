import { describe, expect, it } from "vitest";
import { readReportFilters } from "@/db/queries/reports";
import type { Scope } from "@/lib/auth/scope";
import { JAKARTA_OFFSET_SECONDS } from "@/lib/time";

/**
 * Regresi audit #10 dan #11: filter rentang tanggal laporan.
 *
 * Tiga cacat yang dikunci di sini:
 *
 * 1. Tanggal dibaca sebagai tengah malam zona waktu SERVER (`new Date` +
 *    `setHours`), sehingga batas rentang bergeser bila server tidak berjalan
 *    di WIB. Seharusnya tanggal kalender WIB.
 * 2. Rentang yang hanya terisi satu ujung diabaikan diam-diam, tanpa cara
 *    pengguna mengetahui filternya tidak berlaku.
 * 3. Rentang terbalik tidak ditangani sama sekali.
 */

const SCOPE_ADMIN: Scope = {
  role: "ADMIN",
  divisionId: "div_hukum",
  allDivisions: false,
} as Scope;

const SCOPE_SUPER: Scope = {
  role: "SUPER_ADMIN",
  divisionId: "div_hukum",
  allDivisions: true,
} as Scope;

/** Epoch detik dari "YYYY-MM-DD HH:mm:ss" WIB, untuk perbandingan yang jelas. */
function wibSeconds(date: string, hour = 0, minute = 0, second = 0): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!, hour, minute, second) / 1000 - JAKARTA_OFFSET_SECONDS;
}

describe("readReportFilters: rentang tanggal kustom", () => {
  it("memetakan tanggal mulai ke 00:00:00 WIB, bukan tengah malam zona server", () => {
    const filters = readReportFilters(
      { dateFrom: "2026-10-01", dateTo: "2026-10-15" },
      SCOPE_ADMIN,
    );

    expect(filters.customRange).not.toBeNull();
    expect(filters.customRange!.from).toBe(wibSeconds("2026-10-01"));
  });

  it("memetakan tanggal selesai ke 23:59:59 WIB sehingga harinya ikut terhitung", () => {
    const filters = readReportFilters(
      { dateFrom: "2026-10-01", dateTo: "2026-10-15" },
      SCOPE_ADMIN,
    );

    expect(filters.customRange!.to).toBe(wibSeconds("2026-10-15", 23, 59, 59));
  });

  it("hasilnya tidak bergantung pada zona waktu mesin yang menjalankan", () => {
    // Nilai harapan ditulis sebagai konstanta UTC eksplisit. Bila implementasi
    // kembali memakai setHours (zona server), tes ini gagal di mesin non-WIB.
    const filters = readReportFilters(
      { dateFrom: "2026-10-01", dateTo: "2026-10-01" },
      SCOPE_ADMIN,
    );

    // 1 Okt 2026 00:00 WIB = 30 Sep 2026 17:00 UTC
    expect(new Date(filters.customRange!.from * 1000).toISOString()).toBe(
      "2026-09-30T17:00:00.000Z",
    );
    // 1 Okt 2026 23:59:59 WIB = 1 Okt 2026 16:59:59 UTC
    expect(new Date(filters.customRange!.to * 1000).toISOString()).toBe(
      "2026-10-01T16:59:59.000Z",
    );
  });

  it("menandai rentang yang hanya terisi satu ujung, bukan mengabaikannya", () => {
    const hanyaMulai = readReportFilters({ dateFrom: "2026-10-01" }, SCOPE_ADMIN);
    expect(hanyaMulai.customRange).toBeNull();
    expect(hanyaMulai.rangeIssue).toBe("partial");

    const hanyaSelesai = readReportFilters({ dateTo: "2026-10-15" }, SCOPE_ADMIN);
    expect(hanyaSelesai.customRange).toBeNull();
    expect(hanyaSelesai.rangeIssue).toBe("partial");
  });

  it("menolak rentang terbalik alih-alih membaliknya diam-diam", () => {
    const filters = readReportFilters(
      { dateFrom: "2026-10-20", dateTo: "2026-10-01" },
      SCOPE_ADMIN,
    );

    expect(filters.customRange).toBeNull();
    expect(filters.rangeIssue).toBe("reversed");
  });

  it("menerima rentang satu hari (mulai sama dengan selesai)", () => {
    const filters = readReportFilters(
      { dateFrom: "2026-10-05", dateTo: "2026-10-05" },
      SCOPE_ADMIN,
    );

    expect(filters.rangeIssue).toBeNull();
    expect(filters.customRange).not.toBeNull();
    // Rentang satu hari tetap punya panjang 24 jam dikurangi satu detik.
    expect(filters.customRange!.to - filters.customRange!.from).toBe(86_399);
  });

  it("mengabaikan tanggal yang formatnya tidak sah, dan melaporkannya", () => {
    for (const bad of ["2026-13-01", "2026-02-30", "16-10-2026", "2026/10/16"]) {
      const filters = readReportFilters(
        { dateFrom: bad, dateTo: "2026-10-15" },
        SCOPE_ADMIN,
      );
      expect(filters.customRange).toBeNull();
      expect(filters.rangeIssue).toBe("partial");
    }
  });

  it("tanpa tanggal sama sekali tidak melaporkan masalah", () => {
    const filters = readReportFilters({}, SCOPE_ADMIN);
    expect(filters.customRange).toBeNull();
    expect(filters.rangeIssue).toBeNull();
  });

  it("menerima URLSearchParams seperti yang dipakai rute ekspor", () => {
    const params = new URLSearchParams("dateFrom=2026-10-01&dateTo=2026-10-15");
    const filters = readReportFilters(params, SCOPE_SUPER);

    expect(filters.customRange!.from).toBe(wibSeconds("2026-10-01"));
    expect(filters.customRange!.to).toBe(wibSeconds("2026-10-15", 23, 59, 59));
  });

  it("tidak mengubah batas divisi: Admin tetap terikat divisinya sendiri", () => {
    // Super Admin boleh memilih divisi lain; Admin tidak, sekalipun URL meminta.
    const admin = readReportFilters(
      { divisi: "div_lain", dateFrom: "2026-10-01", dateTo: "2026-10-15" },
      SCOPE_ADMIN,
    );
    expect(admin.divisionId).toBe("div_hukum");

    const superAdmin = readReportFilters(
      { divisi: "div_lain", dateFrom: "2026-10-01", dateTo: "2026-10-15" },
      SCOPE_SUPER,
    );
    expect(superAdmin.divisionId).toBe("div_lain");
  });
});
