import type { NotificationType } from "@/db/schema";
import { formatJakartaNotification } from "@/lib/time";

/**
 * Identitas pengirim. Nomor WhatsApp gateway tidak menjelaskan asal pesan,
 * jadi setiap pesan luar membuka dengan nama portal dan instansi.
 */
export const APP_NAME = "Portal Penugasan";
export const APP_ORG = "Bawaslu Kota Pasuruan";
export const APP_SIGNATURE = `${APP_NAME} · ${APP_ORG}`;

const HEADLINE: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Tugas baru",
  REVISION_REQUESTED: "Perlu revisi",
  SUBMISSION_RECEIVED: "Pengumpulan masuk",
  TASK_CANCELLED: "Tugas dibatalkan",
  DUE_SOON: "Tenggat mendekat",
};

export type NotificationBlockInput = {
  type: NotificationType;
  taskNumber: string | null;
  taskTitle: string | null;
  dueAt: number | null;
  /** Satu kalimat isi: catatan admin, alasan batal, jumlah berkas, sisa waktu. */
  detail: string | null;
  link: string | null;
};

export type NotificationBlock = {
  headline: string;
  subject: string;
  text: string;
};

function compactLine(parts: Array<string | null | undefined>): string {
  return parts.filter((part) => part && part.trim()).join(" · ");
}

/**
 * Pesan kanal luar: tanda pengirim, nomor + judul tugas, status, satu kalimat
 * isi, tenggat, lalu tautan. Tanpa salam dan tanpa baris yang mengulang baris
 * lain; WhatsApp memakai penanda tebal untuk nomor tugas dan status.
 */
export function formatNotificationBlock(
  input: NotificationBlockInput,
): NotificationBlock {
  const headline = HEADLINE[input.type];
  const lines: string[] = [APP_SIGNATURE, ""];

  if (input.taskNumber) {
    lines.push(`*${input.taskNumber}*`);
  }
  if (input.taskTitle) {
    lines.push(input.taskTitle);
  }
  if (input.taskNumber || input.taskTitle) {
    lines.push("");
  }

  lines.push(`*${headline}*`);
  if (input.detail?.trim()) lines.push(input.detail.trim());
  if (input.dueAt) {
    lines.push(`Tenggat ${formatJakartaNotification(input.dueAt)}`);
  }
  if (input.link) {
    lines.push("", `Buka: ${input.link}`);
  }

  return {
    headline,
    subject: `[${APP_NAME}] ${compactLine([headline, input.taskNumber])}`,
    text: lines.join("\n"),
  };
}

/** Tautan absolut ke detail tugas; `null` bila basis URL belum diatur. */
export function taskLink(
  baseUrl: string | undefined,
  taskId: string,
  assignmentId?: string | null,
): string | null {
  const raw = baseUrl?.trim();
  if (!raw) return null;
  try {
    const path = `/tasks/${encodeURIComponent(taskId)}${
      assignmentId ? `?assignment=${encodeURIComponent(assignmentId)}` : ""
    }`;
    return new URL(path, new URL(raw).origin).toString();
  } catch {
    return null;
  }
}

/**
 * Tautan relatif untuk UI. Entitas `assignment` membawa id tugasnya sekaligus,
 * sehingga notifikasi revisi atau pembatalan mendarat di penugasan yang tepat.
 */
export function notificationHref(input: {
  entityType: string;
  taskId: string | null;
  assignmentId?: string | null;
}): string {
  if (!input.taskId) return "/tasks";
  const base = `/tasks/${encodeURIComponent(input.taskId)}`;
  return input.assignmentId
    ? `${base}?assignment=${encodeURIComponent(input.assignmentId)}`
    : base;
}
