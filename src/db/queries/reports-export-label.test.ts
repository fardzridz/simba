import { describe, expect, it } from "vitest";
import { readReportFilters, effectiveRange } from "@/db/queries/reports";
import type { Scope } from "@/lib/auth/scope";
import { jakartaDateInput } from "@/lib/time";

/**
 * Regresi audit #10 pada berkas ekspor.
 *
 * Dua cacat yang dikunci:
 *
 * 1. Nama berkas memakai `new Date().toISOString()` yang berpatokan UTC. Ekspor
 *    pukul 06.00 WIB tanggal 13 menghasilkan nama berkas bertanggal 12.
 * 2. Baris "Rentang Tanggal" di CSV diformat ulang dari objek Date dengan
 *    `toLocaleDateString`, sehingga tanggalnya bisa berbeda dari label yang
 *    dipakai layar untuk rentang yang sama.
 */

const SCOPE: Scope = {
  role: "ADMIN",
  divisionId: "div_hukum",
  allDivisions: false,
} as Scope;

describe("nama berkas ekspor CSV", () => {
  it("memakai tanggal kalender WIB, bukan UTC", () => {
    // 13 Okt 2026 06:00 WIB = 12 Okt 2026 23:00 UTC.
    const instant = Math.floor(Date.UTC(2026, 9, 12, 23, 0) / 1000);

    expect(jakartaDateInput(instant)).toBe("2026-10-13");
    // Perilaku lama: nama berkas akan bertanggal 12.
    expect(new Date(instant * 1000).toISOString().slice(0, 10)).toBe("2026-10-12");
  });

  it("menghasilkan format nama berkas yang sah", () => {
    const instant = Math.floor(Date.UTC(2026, 9, 12, 23, 0) / 1000);
    const filename = `laporan-penugasan-custom-${jakartaDateInput(instant)}.csv`;

    expect(filename).toBe("laporan-penugasan-custom-2026-10-13.csv");
    expect(filename).toMatch(/^[a-z0-9-]+\.csv$/);
  });
});

describe("rentang tanggal di berkas ekspor", () => {
  it("memakai satu sumber label yang sama dengan layar", () => {
    const filters = readReportFilters(
      { dateFrom: "2026-10-01", dateTo: "2026-10-15" },
      SCOPE,
    );
    const range = effectiveRange(filters, Date.UTC(2026, 9, 15, 5, 0) / 1000);

    // CSV memakai `report.rangeLabel`; label ini harus menyebut 15 Okt, bukan
    // akhir bulan, karena itulah rentang yang dipakai menghitung angkanya.
    expect(range.label).toBe("1 Okt 2026 sampai 15 Okt 2026");
    expect(range.isCustom).toBe(true);
  });

  it("menyatakan rentang kustom hanya bila memang dipakai", () => {
    const kustom = readReportFilters(
      { dateFrom: "2026-10-01", dateTo: "2026-10-15" },
      SCOPE,
    );
    expect(effectiveRange(kustom, Date.UTC(2026, 9, 15) / 1000).isCustom).toBe(true);

    // Rentang tidak lengkap: CSV tidak boleh menyebut "Tanggal Custom", karena
    // angkanya dihitung dari periode preset.
    const sebagian = readReportFilters({ dateFrom: "2026-10-01" }, SCOPE);
    expect(effectiveRange(sebagian, Date.UTC(2026, 9, 15) / 1000).isCustom).toBe(false);
  });
});
