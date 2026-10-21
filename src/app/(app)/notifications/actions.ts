"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notifications } from "@/db/schema";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";

export type NotificationActionResult = {
  success?: boolean;
  error?: string;
};

/**
 * Menandai satu notifikasi milik sendiri sebagai dibaca.
 * ID milik akun lain tidak menghasilkan error khusus (tidak membocorkan
 * keberadaan baris); hasilnya tetap sukses tanpa perubahan.
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationActionResult> {
  const actor = await requireActor();
  if (!notificationId) {
    return { error: "Notifikasi tidak ditemukan." };
  }

  const { db } = appContext();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, actor.id),
        isNull(notifications.readAt),
      ),
    );

  revalidatePath("/", "layout");
  return { success: true };
}

/** Tandai semua notifikasi pengguna aktif sebagai dibaca. */
export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const actor = await requireActor();
  const { db } = appContext();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, actor.id), isNull(notifications.readAt)),
    );

  revalidatePath("/", "layout");
  return { success: true };
}
