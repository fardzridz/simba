import type { AssignmentStatus, Role } from "@/db/schema";

/**
 * Mesin status kanonik (§3.2). Satu tempat yang memutuskan transisi sah.
 * Tabel transisi, guard, dan efek ada di dokumentasi; di sini hanya aturannya,
 * supaya UI dan server tidak pernah berbeda pendapat.
 */
export type TransitionActor = Extract<Role, "USER" | "ADMIN">;

export type TransitionContext = {
  hasCommittedAttachment: boolean;
  note?: string | null;
  reason?: string | null;
};

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

const STATUSES: readonly AssignmentStatus[] = [
  "BELUM_DIKERJAKAN",
  "SEDANG_DIKERJAKAN",
  "MENUNGGU_VERIFIKASI",
  "SELESAI",
  "DIBATALKAN",
];

export function isAssignmentStatus(value: string): value is AssignmentStatus {
  return (STATUSES as readonly string[]).includes(value);
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Status final tidak dapat diubah lagi oleh siapa pun (§3.2). */
export function isFinalStatus(status: AssignmentStatus): boolean {
  return status === "SELESAI" || status === "DIBATALKAN";
}

export function checkTransition(
  from: AssignmentStatus,
  to: AssignmentStatus,
  actor: TransitionActor,
  context: TransitionContext,
): TransitionCheck {
  if (from === to) return { ok: false, reason: "Status tujuan sama dengan status sekarang." };
  if (!isAssignmentStatus(to)) return { ok: false, reason: `Status "${to}" tidak dikenal.` };
  if (isFinalStatus(from)) return { ok: false, reason: `Tugas berstatus ${from} tidak dapat diubah lagi.` };

  if (from === "BELUM_DIKERJAKAN" && to === "DIBATALKAN") {
    if (actor !== "ADMIN") return { ok: false, reason: "Hanya Admin divisi yang dapat membatalkan tugas." };
    if (!hasText(context.reason)) return { ok: false, reason: "Alasan pembatalan wajib diisi." };
    return { ok: true };
  }

  if (from === "SEDANG_DIKERJAKAN" && to === "DIBATALKAN") {
    if (actor !== "ADMIN") return { ok: false, reason: "Hanya Admin divisi yang dapat membatalkan tugas." };
    if (!hasText(context.reason)) return { ok: false, reason: "Alasan pembatalan wajib diisi." };
    return { ok: true };
  }

  if (from === "BELUM_DIKERJAKAN" && to === "SEDANG_DIKERJAKAN") {
    if (actor !== "USER") return { ok: false, reason: "Hanya pelaksana yang dapat memulai tugas." };
    return { ok: true };
  }

  if (from === "SEDANG_DIKERJAKAN" && to === "MENUNGGU_VERIFIKASI") {
    if (actor !== "USER") return { ok: false, reason: "Hanya pelaksana yang dapat mengirim pengumpulan." };
    if (!context.hasCommittedAttachment) {
      return { ok: false, reason: "Pengumpulan wajib menyertakan minimal satu berkas yang berhasil terunggah." };
    }
    return { ok: true };
  }

  if (from === "MENUNGGU_VERIFIKASI" && to === "SELESAI") {
    if (actor !== "ADMIN") return { ok: false, reason: "Hanya Admin divisi yang dapat menyetujui pengumpulan." };
    if (!context.hasCommittedAttachment) {
      return { ok: false, reason: "Pengumpulan belum memiliki berkas yang tersimpan." };
    }
    return { ok: true };
  }

  if (from === "MENUNGGU_VERIFIKASI" && to === "SEDANG_DIKERJAKAN") {
    if (actor !== "ADMIN") return { ok: false, reason: "Hanya Admin divisi yang dapat meminta revisi." };
    if (!hasText(context.note)) return { ok: false, reason: "Catatan revisi wajib diisi." };
    return { ok: true };
  }

  return { ok: false, reason: `Transisi ${from} → ${to} tidak termasuk alur yang diizinkan.` };
}
