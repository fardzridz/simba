import { and, eq, inArray } from "drizzle-orm";
import {
  notificationDeliveries,
  notificationPreferences,
  notifications as notificationTable,
  users,
} from "@/db/schema";
import type { Db } from "@/env";
import type { Channel } from "@/db/schema";
import { newId } from "@/lib/ids";

/** D1 menerima maksimal 100 parameter per statement; 10 baris × 10 kolom. */
const DELIVERY_INSERT_CHUNK = 10;

/** Satu perintah yang boleh ikut dalam `db.batch()` D1. */
export type BatchItem = Parameters<Db["batch"]>[0][number];

export type NotificationRow = {
  id: string;
  userId: string;
  type: string;
  entityType: string;
  entityId: string;
  message: string;
  createdAt: Date;
};

type PreferenceRow = {
  userId: string;
  channel: Channel;
};

/**
 * Baris outbox untuk kanal luar yang menyala pada penerima notifikasi (§1 D8).
 * Kanal yang mati atau alamatnya belum terverifikasi tidak menulis baris apa pun,
 * bukan baris `SKIPPED`.
 */
export async function buildDeliveryRows(
  db: Db,
  notifications: NotificationRow[],
  now: Date,
): Promise<Array<typeof notificationDeliveries.$inferInsert>> {
  if (notifications.length === 0) return [];

  const userIds = [...new Set(notifications.map((row) => row.userId))];
  const preferences: PreferenceRow[] = [];
  for (let index = 0; index < userIds.length; index += DELIVERY_INSERT_CHUNK) {
    const slice = userIds.slice(index, index + DELIVERY_INSERT_CHUNK);
    const rows = await db
      .select({
        userId: notificationPreferences.userId,
        channel: notificationPreferences.channel,
      })
      .from(notificationPreferences)
      .where(
        and(
          inArray(notificationPreferences.userId, slice),
          eq(notificationPreferences.enabled, true),
        ),
      );
    preferences.push(...rows);
  }
  if (preferences.length === 0) return [];

  const targets: Array<{
    id: string;
    email: string | null;
    emailVerifiedAt: Date | null;
    waNumber: string | null;
    waVerifiedAt: Date | null;
  }> = [];
  for (let index = 0; index < userIds.length; index += DELIVERY_INSERT_CHUNK) {
    const slice = userIds.slice(index, index + DELIVERY_INSERT_CHUNK);
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        waNumber: users.waNumber,
        waVerifiedAt: users.waVerifiedAt,
      })
      .from(users)
      .where(inArray(users.id, slice));
    targets.push(...rows);
  }

  const byUser = new Map(targets.map((row) => [row.id, row]));
  const rows: Array<typeof notificationDeliveries.$inferInsert> = [];

  for (const notification of notifications) {
    const target = byUser.get(notification.userId);
    if (!target) continue;

    for (const preference of preferences) {
      if (preference.userId !== notification.userId) continue;

      const reachable =
        preference.channel === "EMAIL"
          ? Boolean(target.email && target.emailVerifiedAt)
          : Boolean(target.waNumber && target.waVerifiedAt);
      if (!reachable) continue;

      rows.push({
        id: newId("delivery"),
        notificationId: notification.id,
        channel: preference.channel,
        status: "PENDING",
        attempts: 0,
        nextAttemptAt: now,
        createdAt: now,
      });
    }
  }

  return rows;
}

/**
 * Statement batch untuk notifikasi in-app beserta outbox-nya. Notifikasi tetap
 * ditulis lebih dulu; baris pengiriman hanya pelengkap sehingga kegagalan kanal
 * luar tidak menghalangi sumber kebenaran.
 */
export function buildNotificationBatch(
  db: Db,
  notifications: Array<typeof notificationTable.$inferInsert>,
  deliveries: Array<typeof notificationDeliveries.$inferInsert>,
): BatchItem[] {
  const mutations: BatchItem[] = [];

  for (let index = 0; index < notifications.length; index += DELIVERY_INSERT_CHUNK) {
    mutations.push(
      db
        .insert(notificationTable)
        .values(notifications.slice(index, index + DELIVERY_INSERT_CHUNK)),
    );
  }
  for (let index = 0; index < deliveries.length; index += DELIVERY_INSERT_CHUNK) {
    mutations.push(
      db
        .insert(notificationDeliveries)
        .values(deliveries.slice(index, index + DELIVERY_INSERT_CHUNK)),
    );
  }

  return mutations;
}
