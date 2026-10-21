import { describe, expect, it } from "vitest";
import { checkTransition, isFinalStatus, type TransitionContext } from "@/lib/status";

const ready: TransitionContext = { hasCommittedAttachment: true, note: "perbaiki tanda tangan", reason: "tidak relevan" };
const withoutAttachment: TransitionContext = { hasCommittedAttachment: false, note: "catatan", reason: "alasan" };

describe("checkTransition", () => {
  it("mengizinkan pelaksana memulai dan mengirim pekerjaan", () => {
    expect(checkTransition("BELUM_DIKERJAKAN", "SEDANG_DIKERJAKAN", "USER", ready).ok).toBe(true);
    expect(checkTransition("SEDANG_DIKERJAKAN", "MENUNGGU_VERIFIKASI", "USER", ready).ok).toBe(true);
  });

  it("mengizinkan pelaksana mengirim ulang setelah revisi", () => {
    expect(checkTransition("SEDANG_DIKERJAKAN", "MENUNGGU_VERIFIKASI", "USER", ready).ok).toBe(true);
  });

  it("menolak pengiriman tanpa berkas tersimpan", () => {
    const result = checkTransition("SEDANG_DIKERJAKAN", "MENUNGGU_VERIFIKASI", "USER", withoutAttachment);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("berkas") });
  });

  it("mengizinkan admin menyetujui pengumpulan", () => {
    expect(checkTransition("MENUNGGU_VERIFIKASI", "SELESAI", "ADMIN", ready).ok).toBe(true);
  });

  it("mewajibkan catatan saat meminta revisi", () => {
    const withoutNote = checkTransition("MENUNGGU_VERIFIKASI", "SEDANG_DIKERJAKAN", "ADMIN", {
      hasCommittedAttachment: true,
      note: "   ",
    });
    expect(withoutNote.ok).toBe(false);
    expect(checkTransition("MENUNGGU_VERIFIKASI", "SEDANG_DIKERJAKAN", "ADMIN", ready).ok).toBe(true);
  });

  it("mewajibkan alasan saat membatalkan", () => {
    const withoutReason = checkTransition("BELUM_DIKERJAKAN", "DIBATALKAN", "ADMIN", {
      hasCommittedAttachment: false,
      reason: "",
    });
    expect(withoutReason.ok).toBe(false);
    expect(checkTransition("SEDANG_DIKERJAKAN", "DIBATALKAN", "ADMIN", ready).ok).toBe(true);
  });

  it("menolak transisi yang tidak ada di tabel", () => {
    expect(checkTransition("BELUM_DIKERJAKAN", "MENUNGGU_VERIFIKASI", "USER", ready).ok).toBe(false);
    expect(checkTransition("BELUM_DIKERJAKAN", "SELESAI", "ADMIN", ready).ok).toBe(false);
    expect(checkTransition("SEDANG_DIKERJAKAN", "SELESAI", "ADMIN", ready).ok).toBe(false);
    expect(checkTransition("MENUNGGU_VERIFIKASI", "DIBATALKAN", "ADMIN", ready).ok).toBe(false);
  });

  it("menolak transisi oleh aktor yang salah peran", () => {
    expect(checkTransition("BELUM_DIKERJAKAN", "SEDANG_DIKERJAKAN", "ADMIN", ready).ok).toBe(false);
    expect(checkTransition("MENUNGGU_VERIFIKASI", "SELESAI", "USER", ready).ok).toBe(false);
    expect(checkTransition("SEDANG_DIKERJAKAN", "DIBATALKAN", "USER", ready).ok).toBe(false);
  });

  it("menolak perubahan apa pun setelah status final", () => {
    for (const target of ["SEDANG_DIKERJAKAN", "MENUNGGU_VERIFIKASI", "DIBATALKAN"] as const) {
      expect(checkTransition("SELESAI", target, "ADMIN", ready).ok).toBe(false);
      expect(checkTransition("DIBATALKAN", target, "ADMIN", ready).ok).toBe(false);
    }
    expect(isFinalStatus("SELESAI")).toBe(true);
    expect(isFinalStatus("DIBATALKAN")).toBe(true);
    expect(isFinalStatus("MENUNGGU_VERIFIKASI")).toBe(false);
  });

  it("menolak status tujuan yang sama", () => {
    expect(checkTransition("SEDANG_DIKERJAKAN", "SEDANG_DIKERJAKAN", "USER", ready).ok).toBe(false);
  });
});
