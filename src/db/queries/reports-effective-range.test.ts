import { describe, expect, it } from "vitest";
import {
  effectiveRange,
  readReportFilters,
  REPORT_DEFAULT_PERIOD,
  type ReportFilters,
} from "@/db/queries/reports";
import type { Scope } from "@/lib/auth/scope";
import { JAKARTA_OFFSET_SECONDS } from "@/lib/time";

/**
 * Regresi audit #10 lanjutan: label rentang harus berasal dari rentang yang
 * BENAR-BENAR dipakai menghitung angka.
 *
 * Cacat lama: `rangeLabel` dihitung dari `reportPeriodRange(filters.period)`
 * tanpa melihat rentang kustom. Memilih 1 sampai 15 Okt menghasilkan angka
 * untuk 15 hari, tetapi labelnya menyebut "1 Okt sampai 31 Okt". Pada laporan
 * resmi, label yang salah lebih berbahaya daripada angka yang salah, karena
 * pembaca tidak punya cara mengetahui ada yang tidak cocok.
 */

const SCOPE: Scope = {
  role: "ADMIN",
  divisionId: "div_hukum",
  allDivisions: false,
} as Scope;

/** 15 Okt 2026 12:00 WIB, dipakai sebagai "sekarang" agar hasil deterministik. */
const NOW = Date.UTC(2026, 9, 15, 5, 0) / 1000;

function filtersFor(dateFrom?: string, dateTo?: string): ReportFilters {
  return readReportFilters({ dateFrom, dateTo }, SCOPE);
}

describe("effectiveRange: label mengikuti rentang yang dipakai", () => {
  it("memakai rentang kustom untuk kueri DAN label", () => {
    const range = effectiveRange(filtersFor("2026-10-01", "2026-10-15"), NOW);

    expect(range.isCustom).toBe(true);
    expect(range.label).toBe("1 Okt 2026 sampai 15 Okt 2026");
    // Label lama akan berbunyi "1 Okt 2026 sampai 31 Okt 2026" (akhir bulan).
    expect(range.label).not.toContain("31 Okt");
  });

  it("rentang kustom satu hari menyebut satu tanggal, bukan dua", () => {
    const range = effectiveRange(filtersFor("2026-10-05", "2026-10-05"), NOW);
    expect(range.label).toBe("5 Okt 2026 sampai 5 Okt 2026");
  });

  it("batas `to` bersifat eksklusif sehingga tanggal selesai ikut terhitung", () => {
    const range = effectiveRange(filtersFor("2026-10-01", "2026-10-15"), NOW);
    const endOfLastDay = range.to - 1;

    // to - 1 harus 15 Okt 2026 23:59:59 WIB.
    expect(new Date(endOfLastDay * 1000).toISOString()).toBe("2026-10-15T16:59:59.000Z");
    expect(endOfLastDay - range.from).toBe(15 * 86_400 - 1);
  });

  it("jatuh ke periode preset saat rentang tidak sah, dan labelnya ikut preset", () => {
    for (const [from, to] of [
      ["2026-10-01", ""],
      ["", "2026-10-15"],
      ["2026-10-20", "2026-10-01"],
    ] as const) {
      const range = effectiveRange(filtersFor(from, to), NOW);
      expect(range.isCustom).toBe(false);
      // NOW berada di Oktober 2026, jadi preset "bulan_ini" = 1 sampai 31 Okt.
      expect(range.label).toBe("1 Okt 2026 sampai 31 Okt 2026");
    }
  });

  it("label preset dan rentang kustom tidak pernah tertukar", () => {
    const preset = effectiveRange(filtersFor(), NOW);
    const custom = effectiveRange(filtersFor("2026-10-01", "2026-10-15"), NOW);

    expect(preset.isCustom).toBe(false);
    expect(custom.isCustom).toBe(true);
    expect(preset.label).not.toBe(custom.label);
  });

  it("rentang kustom memakai batas WIB, bukan zona waktu mesin", () => {
    const range = effectiveRange(filtersFor("2026-10-01", "2026-10-01"), NOW);

    // 1 Okt 2026 00:00 WIB
    expect(new Date(range.from * 1000).toISOString()).toBe("2026-09-30T17:00:00.000Z");
  });

  it("periode preset tetap dihitung dalam WIB", () => {
    const range = effectiveRange(
      { ...filtersFor(), period: REPORT_DEFAULT_PERIOD },
      NOW,
    );

    // 1 Okt 2026 00:00 WIB, bukan 1 Okt 00:00 UTC.
    expect(new Date(range.from * 1000).toISOString()).toBe("2026-09-30T17:00:00.000Z");
    // Selisih terhadap tengah malam UTC: 17:00 UTC = 61200 detik, yaitu
    // 24 jam dikurangi offset WIB. Bila implementasi memakai tengah malam UTC,
    // sisanya akan 0.
    expect(range.from % 86_400).toBe(86_400 - JAKARTA_OFFSET_SECONDS);
  });
});
