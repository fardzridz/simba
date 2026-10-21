import type { AssignmentStatus } from "@/db/schema";
import type { IconName } from "@/app/icons";

/**
 * Nama tampilan status kanonik (§4 DESIGN-SYSTEM.md). Label dan ikon berdampingan
 * supaya status tidak pernah dibedakan warna saja (§9 aturan 1).
 */
export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  BELUM_DIKERJAKAN: "Belum Dikerjakan",
  SEDANG_DIKERJAKAN: "Sedang Dikerjakan",
  MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export const STATUS_ICON: Record<AssignmentStatus, IconName> = {
  BELUM_DIKERJAKAN: "belum",
  SEDANG_DIKERJAKAN: "sedang",
  MENUNGGU_VERIFIKASI: "menunggu",
  SELESAI: "selesai",
  DIBATALKAN: "dibatalkan",
};
