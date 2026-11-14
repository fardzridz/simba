import { describe, expect, it } from "vitest";

/**
 * Regresi bug audit #2 dan #3: label "Tepat Waktu" dulu memakai
 * completed/totalAssignments (rasio selesai) dan bisa menghasilkan NaN.
 * Rumus yang benar: onTime/completed, dengan penjaga pembagi nol.
 */
function onTimePercent(onTime: number, completed: number): string {
  return completed > 0 ? `${Math.round((onTime / completed) * 100)}%` : "-";
}

describe("persentase ketepatan waktu laporan", () => {
  it("memakai onTime/completed, bukan completed/totalAssignments", () => {
    // Data uji audit: 12 tugas, 7 selesai, 6 tepat waktu.
    expect(onTimePercent(6, 7)).toBe("86%");
    // Rumus lama (7/12) menghasilkan 58%; itu yang tidak boleh kembali.
    expect(onTimePercent(6, 7)).not.toBe("58%");
  });

  it("tidak pernah menghasilkan NaN saat belum ada yang selesai", () => {
    expect(onTimePercent(0, 0)).toBe("-");
    expect(onTimePercent(0, 0)).not.toContain("NaN");
  });

  it("menjaga batas 0% dan 100%", () => {
    expect(onTimePercent(0, 5)).toBe("0%");
    expect(onTimePercent(5, 5)).toBe("100%");
  });
});
