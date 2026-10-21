import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import {
  notifications,
  taskAssignments,
  tasks,
  type NotificationType,
} from "@/db/schema";
import type { Db } from "@/env";
import {
  notificationTone,
  notificationTitle,
  type NotificationTone,
} from "@/lib/notifications";
import { notificationHref } from "@/lib/notification-format";
import { formatJakartaNotification } from "@/lib/time";

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  tone: NotificationTone | null;
  targetUrl: string;
  isRead: boolean;
  createdAtLabel: string;
};

export type NotificationListResult = {
  items: NotificationListItem[];
  unreadCount: number;
};

/**
 * Daftar notifikasi milik satu pengguna, terbaru lebih dulu.
 * Batas 200 baris mencegah satu akun memuat riwayat tak terbatas;
 * lencana belum dibaca dihitung dari seluruh baris, bukan hanya yang tampil.
 */
export async function getNotifications(
  db: Db,
  userId: string,
): Promise<NotificationListResult> {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      message: notifications.message,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      taskTitle: tasks.title,
      taskId: tasks.id,
    })
    .from(notifications)
    // Notifikasi baru menunjuk penugasan; data lama menunjuk tugas. Keduanya
    // harus bisa menampilkan judul dan tautan yang benar.
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
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(200);

  const unreadCount = await countUnreadNotifications(db, userId);

  return {
    items: rows.map((row) => {
      const taskTitle = row.taskTitle ?? "Tugas";
      return {
        id: row.id,
        type: row.type,
        title: notificationTitle(row.type, taskTitle),
        message: row.message,
        tone: notificationTone(row.type),
        targetUrl: notificationHref({
          entityType: row.entityType,
          taskId: row.taskId ?? null,
          assignmentId: row.entityType === "assignment" ? row.entityId : null,
        }),
        isRead: row.readAt !== null,
        createdAtLabel: formatJakartaNotification(row.createdAt),
      };
    }),
    unreadCount,
  };
}

/** Lencana top bar: satu angka, bukan memuat seluruh daftar. */
export async function countUnreadNotifications(
  db: Db,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return Number(row?.total ?? 0);
}
