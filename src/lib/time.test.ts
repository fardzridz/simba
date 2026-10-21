import { describe, expect, it } from "vitest";
import {
  endOfJakartaDayFromDateInput,
  formatJakarta,
  formatJakartaNotification,
  humanizeRemaining,
  isDueSoon,
  isOverdue,
  startOfJakartaDay,
} from "@/lib/time";

// 16 Okt 2026 23:59:59 WIB = 16:59:59 UTC = 1792256399
const DUE_16_OKT = endOfJakartaDayFromDateInput("2026-10-16")!;

describe("endOfJakartaDayFromDateInput", () => {
  it("memetakan tanggal ke akhir hari WIB dalam epoch detik UTC", () => {
    expect(DUE_16_OKT).toBe(Math.floor(Date.UTC(2026, 9, 16, 16, 59, 59) / 1000));
    expect(new Date(DUE_16_OKT * 1000).toISOString()).toBe("2026-10-16T16:59:59.000Z");
  });

  it("menolak format yang tidak valid atau tanggal yang tidak ada", () => {
    for (const bad of ["", "16-10-2026", "2026/10/16", "2026-13-01", "2026-02-30", "2026-2-3"]) {
      expect(endOfJakartaDayFromDateInput(bad)).toBeNull();
    }
  });

  it("menerima tanggal akhir bulan dan tahun kabisat", () => {
    expect(endOfJakartaDayFromDateInput("2028-02-29")).not.toBeNull();
    expect(endOfJakartaDayFromDateInput("2026-12-31")).not.toBeNull();
  });
});

describe("startOfJakartaDay", () => {
  it("memotong ke 00:00 WIB dari tengah hari", () => {
    const noonWib = Math.floor(Date.UTC(2026, 9, 16, 5, 0, 0) / 1000);
    expect(startOfJakartaDay(noonWib)).toBe(Math.floor(Date.UTC(2026, 9, 15, 17, 0, 0) / 1000));
  });
});

describe("isOverdue / isDueSoon", () => {
  it("menandai lewat tenggat hanya untuk status yang belum final", () => {
    const now = DUE_16_OKT + 60;
    expect(isOverdue({ dueAt: DUE_16_OKT, status: "SEDANG_DIKERJAKAN", now })).toBe(true);
    expect(isOverdue({ dueAt: DUE_16_OKT, status: "BELUM_DIKERJAKAN", now })).toBe(true);
    expect(isOverdue({ dueAt: DUE_16_OKT, status: "SELESAI", now })).toBe(false);
    expect(isOverdue({ dueAt: DUE_16_OKT, status: "DIBATALKAN", now })).toBe(false);
    expect(isOverdue({ dueAt: DUE_16_OKT, status: "MENUNGGU_VERIFIKASI", now })).toBe(true);
  });

  it("menandai tenggat dekat dalam 3 hari untuk pekerjaan yang masih berjalan", () => {
    const threeDaysBefore = DUE_16_OKT - 3 * 24 * 60 * 60;
    const fourDaysBefore = DUE_16_OKT - 4 * 24 * 60 * 60;
    expect(isDueSoon({ dueAt: DUE_16_OKT, status: "SEDANG_DIKERJAKAN", now: threeDaysBefore })).toBe(true);
    expect(isDueSoon({ dueAt: DUE_16_OKT, status: "SEDANG_DIKERJAKAN", now: fourDaysBefore })).toBe(false);
    expect(isDueSoon({ dueAt: DUE_16_OKT, status: "MENUNGGU_VERIFIKASI", now: threeDaysBefore })).toBe(false);
    expect(isDueSoon({ dueAt: DUE_16_OKT, status: "SELESAI", now: threeDaysBefore })).toBe(false);
  });
});

describe("humanizeRemaining", () => {
  it("menampilkan sisa waktu dalam jam atau hari", () => {
    expect(humanizeRemaining(DUE_16_OKT, DUE_16_OKT - 4 * 3600)).toBe("4 jam");
    expect(humanizeRemaining(DUE_16_OKT, DUE_16_OKT - 27 * 3600)).toBe("1 hari 3 jam");
    expect(humanizeRemaining(DUE_16_OKT, DUE_16_OKT - 48 * 3600)).toBe("2 hari");
    expect(humanizeRemaining(DUE_16_OKT, DUE_16_OKT + 1)).toBe("lewat tenggat");
  });
});

describe("formatJakarta", () => {
  it("menampilkan waktu dalam WIB", () => {
    expect(formatJakarta(DUE_16_OKT)).toBe("2026-10-16 23:59 WIB");
    expect(formatJakarta(Math.floor(Date.UTC(2026, 9, 16, 3, 5, 0) / 1000))).toBe("2026-10-16 10:05 WIB");
  });
});

describe("formatJakartaNotification", () => {
  it("memakai bulan singkat Indonesia dan tanpa angka nol di depan", () => {
    expect(formatJakartaNotification(DUE_16_OKT)).toBe("16 Okt 2026 23:59 WIB");
    expect(
      formatJakartaNotification(Math.floor(Date.UTC(2026, 0, 2, 1, 5, 0) / 1000)),
    ).toBe("2 Jan 2026 08:05 WIB");
  });

  it("menerima Date maupun epoch detik", () => {
    expect(formatJakartaNotification(new Date(DUE_16_OKT * 1000))).toBe(
      "16 Okt 2026 23:59 WIB",
    );
  });
});
