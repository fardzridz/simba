import { describe, expect, it } from "vitest";
import { jakartaDateInput, formatWibDate } from "@/lib/time";

/**
 * Regresi audit #10: nilai awal tanggal di antarmuka laporan.
 *
 * Cacat lama: tombol "Custom Tanggal" mengisi nilai awal dengan
 * `new Date().toISOString().split("T")[0]`, yang berpatokan UTC. Antara pukul
 * 00.00 dan 06.59 WIB, UTC masih berada di hari sebelumnya, sehingga kolom
 * tanggal terisi tanggal kemarin tanpa disadari pengguna.
 *
 * Label rentang tanggal sendiri tidak lagi dibuat di peramban: nilainya datang
 * dari server lewat `report.rangeLabel` (lihat `formatWibDate` di bawah dan
 * `reports-effective-range.test.ts`). Itu menghapus seluruh kelas bug pergeseran
 * tanggal akibat zona waktu peramban.
 */
describe("jakartaDateInput sebagai nilai awal tanggal", () => {
  it("memakai kalender WIB, bukan UTC", () => {
    // 1 Jan 2026 00:30 WIB = 31 Des 2025 17:30 UTC.
    const instant = Math.floor(Date.UTC(2025, 11, 31, 17, 30) / 1000);
    expect(jakartaDateInput(instant)).toBe("2026-01-01");

    // Perilaku lama pada instant yang sama: tanggal kemarin.
    expect(new Date(instant * 1000).toISOString().slice(0, 10)).toBe("2025-12-31");
  });

  it("benar pada seluruh jam rawan 00.00 sampai 06.59 WIB", () => {
    for (const hourWib of [0, 1, 3, 6]) {
      // Jam WIB dikurangi 7 jam menjadi UTC hari sebelumnya.
      const utcHour = hourWib + 24 - 7;
      const instant = Math.floor(Date.UTC(2026, 9, 12, utcHour, 0) / 1000);
      expect(jakartaDateInput(instant)).toBe("2026-10-13");
    }
  });

  it("tidak terpengaruh zona waktu mesin yang menjalankan", () => {
    // Nilai harapan berupa tanggal kalender eksplisit, bukan hasil toLocaleString.
    const instant = Math.floor(Date.UTC(2026, 9, 1, 3, 0) / 1000);
    expect(jakartaDateInput(instant)).toBe("2026-10-01");
  });
});

describe("formatWibDate untuk label rentang dari server", () => {
  it("menyebut tanggal kalender WIB, bukan UTC", () => {
    // 1 Okt 2026 00:00 WIB = 30 Sep 2026 17:00 UTC.
    const startOfWibDay = Math.floor(Date.UTC(2026, 9, 1, 0, 0) / 1000) - 7 * 3600;
    expect(formatWibDate(startOfWibDay)).toBe("1 Okt 2026");
  });

  it("tidak pernah menghasilkan tanggal sehari lebih awal", () => {
    const startOfWibDay = Math.floor(Date.UTC(2026, 9, 1, 0, 0) / 1000) - 7 * 3600;
    expect(formatWibDate(startOfWibDay)).not.toBe("30 Sep 2026");
  });
});
