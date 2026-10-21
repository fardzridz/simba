import { and, eq, inArray, lte, or } from "drizzle-orm";
import {
  notificationDeliveries,
  notifications,
  taskAssignments,
  tasks,
  users,
} from "@/db/schema";
import type { AppEnv, Db } from "@/env";
import {
  ChannelDeliveryError,
  isEmailConfigured,
  sendEmail,
} from "@/lib/channels/mail";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/channels/fonnte";
import {
  formatNotificationBlock,
  taskLink,
} from "@/lib/notification-format";
import { nowSeconds } from "@/lib/time";

const DELIVERY_BATCH = 20;
const MAX_ATTEMPTS = 5;

type DueDelivery = {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  attempts: number;
  message: string;
  type: (typeof notifications.$inferSelect)["type"];
  entityId: string;
  entityType: string;
  taskId: string | null;
  email: string | null;
  emailVerifiedAt: Date | null;
  waNumber: string | null;
  waVerifiedAt: Date | null;
  taskNumber: string | null;
  taskTitle: string | null;
  dueAt: Date | null;
};

export type DeliverySummary = {
  processed: number;
  sent: number;
  failed: number;
  retrying: number;
};

/**
 * Kirim keluar hanya di produksi, atau bila dinyalakan eksplisit. Mencegah
 * kredensial pengembangan mengirim pesan nyata saat pengujian lokal.
 */
function externalChannelsAllowed(env: AppEnv): boolean {
  return env.APP_ENV === "production" || env.EXTERNAL_CHANNELS_ENABLED === "true";
}

function backoffSeconds(attempts: number): number {
  // 1, 2, 4, 8, 16 menit; job berjalan tiap menit.
  return 60 * 2 ** Math.max(0, attempts - 1);
}

/**
 * Kirim antrean kanal luar. Status yang bisa dijamin hanya "diterima penyedia";
 * kegagalan dicatat dan dijadwalkan ulang, bukan menghilangkan notifikasi.
 * Rahasia/OTP tidak pernah ditulis ke log.
 */
export async function processDeliveries(
  env: AppEnv,
  db: Db,
  now: number = nowSeconds(),
): Promise<DeliverySummary> {
  const due = await db
    .select({
      id: notificationDeliveries.id,
      channel: notificationDeliveries.channel,
      attempts: notificationDeliveries.attempts,
      message: notifications.message,
      type: notifications.type,
      entityId: notifications.entityId,
      entityType: notifications.entityType,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      waNumber: users.waNumber,
      waVerifiedAt: users.waVerifiedAt,
      taskId: tasks.id,
      taskNumber: tasks.taskNumber,
      taskTitle: tasks.title,
      dueAt: tasks.dueAt,
    })
    .from(notificationDeliveries)
    .innerJoin(
      notifications,
      eq(notifications.id, notificationDeliveries.notificationId),
    )
    .innerJoin(users, eq(users.id, notifications.userId))
    .leftJoin(
      taskAssignments,
      and(
        eq(notifications.entityType, "assignment"),
        eq(taskAssignments.id, notifications.entityId),
      ),
    )
    .leftJoin(
      tasks,
      or(
        and(
          eq(notifications.entityType, "task"),
          eq(tasks.id, notifications.entityId),
        ),
        eq(tasks.id, taskAssignments.taskId),
      ),
    )
    .where(
      and(
        eq(notificationDeliveries.status, "PENDING"),
        lte(notificationDeliveries.nextAttemptAt, new Date(now * 1000)),
      ),
    )
    .limit(DELIVERY_BATCH);

  if (due.length === 0) {
    return { processed: 0, sent: 0, failed: 0, retrying: 0 };
  }

  // Klaim baris lebih dulu supaya dua worker tidak mengirim pesan yang sama.
  const ids = due.map((row) => row.id);
  await db
    .update(notificationDeliveries)
    .set({ status: "SENDING" })
    .where(
      and(
        inArray(notificationDeliveries.id, ids),
        eq(notificationDeliveries.status, "PENDING"),
      ),
    );

  // Tanpa kredensial, kanal gagal tertutup: baris dibiarkan PENDING dan tidak
  // menghabiskan jatah percobaan, supaya aktivasi kredensial tidak kehilangan
  // notifikasi yang tertunda.
  const allowed = externalChannelsAllowed(env);
  const emailReady = allowed && isEmailConfigured(env);
  const waReady = allowed && isWhatsAppConfigured(env);

  let sent = 0;
  let failed = 0;
  let retrying = 0;

  for (const row of due) {
    const target =
      row.channel === "EMAIL"
        ? row.emailVerifiedAt
          ? row.email
          : null
        : row.waVerifiedAt
          ? row.waNumber
          : null;

    if (!target) {
      await db
        .update(notificationDeliveries)
        .set({
          status: "FAILED",
          attempts: row.attempts + 1,
          lastError: "Alamat tujuan tidak lagi terverifikasi.",
        })
        .where(eq(notificationDeliveries.id, row.id));
      failed += 1;
      continue;
    }

    const ready = row.channel === "EMAIL" ? emailReady : waReady;
    if (!ready) {
      await db
        .update(notificationDeliveries)
        .set({
          status: "PENDING",
          lastError: allowed
            ? "Kanal belum dikonfigurasi."
            : "Kanal eksternal dinonaktifkan di luar produksi.",
          nextAttemptAt: new Date((now + 15 * 60) * 1000),
        })
        .where(eq(notificationDeliveries.id, row.id));
      retrying += 1;
      continue;
    }

    try {
      const block = formatNotificationBlock({
        type: row.type,
        taskNumber: row.taskNumber,
        taskTitle: row.taskTitle,
        dueAt: row.dueAt ? Math.floor(row.dueAt.getTime() / 1000) : null,
        detail: row.message,
        link: row.taskId
          ? taskLink(
              env.APP_BASE_URL,
              row.taskId,
              row.entityType === "assignment" ? row.entityId : null,
            )
          : null,
      });
      let providerRef: string | null = null;
      if (row.channel === "EMAIL") {
        await sendEmail(env, {
          to: target,
          subject: block.subject,
          text: block.text,
        });
      } else {
        providerRef = await sendWhatsAppMessage(env, target, block.text);
      }

      await db
        .update(notificationDeliveries)
        .set({
          status: "SENT",
          attempts: row.attempts + 1,
          providerRef,
          lastError: null,
          sentAt: new Date(now * 1000),
        })
        .where(eq(notificationDeliveries.id, row.id));
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const terminal = attempts >= MAX_ATTEMPTS;
      const reason =
        error instanceof ChannelDeliveryError
          ? error.message
          : error instanceof Error
            ? error.name
            : "Gangguan penyedia.";
      await db
        .update(notificationDeliveries)
        .set({
          status: terminal ? "FAILED" : "PENDING",
          attempts,
          lastError: reason.slice(0, 300),
          nextAttemptAt: new Date((now + backoffSeconds(attempts)) * 1000),
        })
        .where(eq(notificationDeliveries.id, row.id));
      if (terminal) failed += 1;
      else retrying += 1;
    }
  }

  return { processed: due.length, sent, failed, retrying };
}
