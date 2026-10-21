import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import {
  attachments,
  notifications,
  taskAssignments,
  taskSubmissions,
  tasks,
} from "@/db/schema";
import type { AppEnv, Db } from "@/env";
import {
  buildDeliveryRows,
  buildNotificationBatch,
} from "@/lib/notification-outbox";
import { getUploadSettings } from "@/lib/storage/settings";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";

/** Batas umur berkas yatim sebelum dibersihkan (§1 D6, §8.4). */
export const PENDING_TTL_SECONDS = 24 * 60 * 60;
const SWEEP_BATCH = 50;

export type SweepSummary = {
  attachmentsDeleted: number;
  objectsDeleted: number;
  objectsFailed: number;
  submissionsDeleted: number;
  pendingRemaining: number;
};

/**
 * Bersihkan attachment `PENDING` yang lebih tua dari 24 jam: objek R2 dulu,
 * baru barisnya. Aman dijalankan berulang; setiap kegagalan dihitung, bukan
 * menghentikan sisa batch (§8.4).
 */
export async function sweepPendingAttachments(
  env: AppEnv,
  db: Db,
  now: number = nowSeconds(),
): Promise<SweepSummary> {
  const cutoff = new Date((now - PENDING_TTL_SECONDS) * 1000);

  const stale = await db
    .select({
      id: attachments.id,
      storedKey: attachments.storedKey,
      submissionId: attachments.submissionId,
    })
    .from(attachments)
    .where(
      and(
        eq(attachments.state, "PENDING"),
        lt(attachments.createdAt, cutoff),
      ),
    )
    .limit(SWEEP_BATCH);

  let objectsDeleted = 0;
  let objectsFailed = 0;
  const removable: string[] = [];

  for (const row of stale) {
    try {
      await env.BUCKET.delete(row.storedKey);
      objectsDeleted += 1;
      removable.push(row.id);
    } catch {
      objectsFailed += 1;
    }
  }

  let attachmentsDeleted = 0;
  if (removable.length > 0) {
    await db.delete(attachments).where(inArray(attachments.id, removable));
    attachmentsDeleted = removable.length;
  }

  // Submission staging yang tidak menyisakan attachment juga dibuang.
  const orphanSubmissions = await db
    .select({ id: taskSubmissions.id })
    .from(taskSubmissions)
    .where(
      and(
        eq(taskSubmissions.state, "PENDING"),
        lt(taskSubmissions.createdAt, cutoff),
        sql`not exists (select 1 from ${attachments} where ${attachments.submissionId} = ${taskSubmissions.id})`,
      ),
    )
    .limit(SWEEP_BATCH);

  let submissionsDeleted = 0;
  if (orphanSubmissions.length > 0) {
    await db.delete(taskSubmissions).where(
      inArray(
        taskSubmissions.id,
        orphanSubmissions.map((row) => row.id),
      ),
    );
    submissionsDeleted = orphanSubmissions.length;
  }

  const [remaining] = await db
    .select({ total: sql<number>`count(*)` })
    .from(attachments)
    .where(eq(attachments.state, "PENDING"));

  return {
    attachmentsDeleted,
    objectsDeleted,
    objectsFailed,
    submissionsDeleted,
    pendingRemaining: Number(remaining?.total ?? 0),
  };
}

export type DueSoonSummary = {
  created: number;
};

/**
 * Notifikasi `DUE_SOON` ditulis job terjadwal, bukan aksi pengguna, dan hanya
 * sekali per penugasan per ambang (§6.4). Ambang dibaca dari `app_settings`.
 */
export async function notifyDueSoon(
  db: Db,
  now: number = nowSeconds(),
): Promise<DueSoonSummary> {
  const settings = await getUploadSettings(db);
  const windowSeconds = settings.dueSoonDays * 24 * 60 * 60;
  const horizon = new Date((now + windowSeconds) * 1000);

  const rows = await db
    .select({
      assignmentId: taskAssignments.id,
      userId: taskAssignments.userId,
      taskId: tasks.id,
      taskNumber: tasks.taskNumber,
      dueAt: tasks.dueAt,
      existingId: sql<string | null>`(
        select n.id from notifications n
        where n.type = 'DUE_SOON'
          and n.entity_type = 'task'
          and n.entity_id = ${tasks.id}
        limit 1
      )`,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(
      and(
        or(
          eq(taskAssignments.status, "BELUM_DIKERJAKAN"),
          eq(taskAssignments.status, "SEDANG_DIKERJAKAN"),
        ),
        // Kolom waktu disimpan sebagai epoch detik; bandingkan dengan angka,
        // jangan dengan objek Date yang tidak bisa diikat D1.
        sql`${tasks.dueAt} > ${now}`,
        sql`${tasks.dueAt} <= ${Math.floor(horizon.getTime() / 1000)}`,
      ),
    )
    .limit(SWEEP_BATCH);

  const fresh = rows.filter((row) => row.existingId === null);
  if (fresh.length === 0) return { created: 0 };

  const stamp = new Date(now * 1000);
  const values = fresh.map((row) => ({
    id: newId("notification"),
    userId: row.userId,
    type: "DUE_SOON" as const,
    entityType: "task",
    entityId: row.taskId,
    message: `Sisa ${settings.dueSoonDays} hari atau kurang.`,
    createdAt: stamp,
  }));

  // Batch dibatasi 10 baris per statement (D1: maksimal 100 parameter).
  const deliveries = await buildDeliveryRows(db, values, stamp);
  const [first, ...rest] = buildNotificationBatch(db, values, deliveries);
  if (first) await db.batch([first, ...rest]);

  return { created: values.length };
}
