import type { NotificationType } from "@/db/schema";

/**
 * Notifikasi in-app menyimpan satu kalimat pesan di `notifications.message`.
 * Judul diturunkan dari tipe agar tabel tetap ringkas (§6.1), sedangkan
 * entitas menyimpan tautan tujuan.
 */
const TITLE_PREFIX: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Tugas baru",
  REVISION_REQUESTED: "Perlu revisi",
  SUBMISSION_RECEIVED: "Pengumpulan masuk",
  TASK_CANCELLED: "Tugas dibatalkan",
  DUE_SOON: "Tenggat dekat",
};

export type NotificationTone = "error" | "warning" | "neutral";

export function notificationTitle(
  type: NotificationType,
  taskTitle: string,
): string {
  return `${TITLE_PREFIX[type]}: ${taskTitle}`;
}


export function notificationTone(
  type: NotificationType,
): NotificationTone | null {
  if (type === "REVISION_REQUESTED") return "error";
  if (type === "DUE_SOON" || type === "SUBMISSION_RECEIVED") return "warning";
  if (type === "TASK_CANCELLED") return "neutral";
  return null;
}
