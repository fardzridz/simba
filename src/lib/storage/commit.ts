import { and, eq, inArray, sql } from "drizzle-orm";
import {
  activityLogs,
  attachments,
  taskAssignments,
  taskSubmissions,
  tasks,
  users,
} from "@/db/schema";
import type { Db } from "@/env";
import type { Actor } from "@/lib/auth/scope";
import { checkTransition } from "@/lib/status";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";
import {
  buildDeliveryRows,
  buildNotificationBatch,
} from "@/lib/notification-outbox";
import { getUploadSettings } from "./settings";
import { IDEMPOTENCY_KEY_PATTERN, loadSubmissionContext } from "./upload";

export const NOTES_MAX_LENGTH = 2000;

export type CommitFailure = { ok: false; status: number; error: string };
export type CommitSuccess = {
  ok: true;
  submissionId: string;
  version: number;
  alreadyCommitted: boolean;
};

function validNotes(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, NOTES_MAX_LENGTH);
}

/**
 * Commit satu pengumpulan. Semua efek status ditulis dalam satu batch:
 * attachment → COMMITTED, submission → COMMITTED, assignment → MENUNGGU_VERIFIKASI,
 * log, dan notifikasi ke Admin divisi. Idempotency key mengembalikan hasil yang
 * sama pada pengiriman ulang (§8.3).
 */
export async function commitSubmission(
  db: Db,
  actor: Actor,
  assignmentId: string,
  idempotencyKey: string,
  notesInput: unknown,
): Promise<CommitFailure | CommitSuccess> {
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return { ok: false, status: 400, error: "Kunci idempotensi tidak valid." };
  }

  const context = await loadSubmissionContext(db, actor.id, assignmentId);
  if (!context) {
    return {
      ok: false,
      status: 404,
      error: "Penugasan tidak ditemukan atau berada di luar akses Anda.",
    };
  }

  if (typeof notesInput === "string" && notesInput.length > NOTES_MAX_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Catatan maksimal ${NOTES_MAX_LENGTH} karakter.`,
    };
  }
  const notes = validNotes(notesInput);

  const [existing] = await db
    .select({
      id: taskSubmissions.id,
      version: taskSubmissions.version,
      state: taskSubmissions.state,
    })
    .from(taskSubmissions)
    .where(
      and(
        eq(taskSubmissions.assignmentId, assignmentId),
        eq(taskSubmissions.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  if (existing?.state === "COMMITTED") {
    return {
      ok: true,
      submissionId: existing.id,
      version: existing.version,
      alreadyCommitted: true,
    };
  }

  if (!existing) {
    return {
      ok: false,
      status: 409,
      error: "Tidak ada berkas yang siap dikomit untuk pengumpulan ini.",
    };
  }

  const pendingAttachments = await db
    .select({
      id: attachments.id,
      state: attachments.state,
      sizeBytes: attachments.sizeBytes,
      storedKey: attachments.storedKey,
    })
    .from(attachments)
    .where(
      and(
        eq(attachments.submissionId, existing.id),
        eq(attachments.state, "PENDING"),
        eq(attachments.uploadedBy, actor.id),
      ),
    );

  if (pendingAttachments.length === 0) {
    return {
      ok: false,
      status: 409,
      error: "Tidak ada berkas yang siap dikomit untuk pengumpulan ini.",
    };
  }

  const settings = await getUploadSettings(db);
  if (pendingAttachments.length > settings.maxFilesPerSubmission) {
    return {
      ok: false,
      status: 400,
      error: `Maksimal ${settings.maxFilesPerSubmission} berkas per pengumpulan.`,
    };
  }
  if (pendingAttachments.some((row) => row.sizeBytes > settings.maxFileBytes)) {
    return {
      ok: false,
      status: 400,
      error: "Ada berkas yang melebihi batas ukuran.",
    };
  }

  const check = checkTransition(
    context.status,
    "MENUNGGU_VERIFIKASI",
    "USER",
    { hasCommittedAttachment: pendingAttachments.length > 0, note: notes },
  );
  if (!check.ok) {
    return { ok: false, status: 409, error: check.reason };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  // Admin divisi pemilik tugas menerima notifikasi in-app.
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.divisionId, context.divisionId),
        eq(users.role, "ADMIN"),
        eq(users.isActive, true),
      ),
    );

  const [submitter] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, actor.id))
    .limit(1);

  const notificationValues = admins.map((admin) => ({
    id: newId("notification"),
    userId: admin.id,
    type: "SUBMISSION_RECEIVED" as const,
    entityType: "assignment",
    entityId: context.assignmentId,
    message: `${submitter?.fullName ?? "Pelaksana"} mengirim ${pendingAttachments.length} berkas, versi ${existing.version}. Menunggu verifikasi Anda.`,
    createdAt: stamp,
  }));

  // Kanal luar hanya menerima baris bila preferensi menyala dan alamat terverifikasi.
  const deliveryRows = await buildDeliveryRows(db, notificationValues, stamp);
  const notificationMutations = buildNotificationBatch(
    db,
    notificationValues,
    deliveryRows,
  );

  const attachmentIds = pendingAttachments.map((row) => row.id);

  try {
    await db.batch([
      db
        .update(taskSubmissions)
        .set({ state: "COMMITTED", notes })
        .where(eq(taskSubmissions.id, existing.id)),
      db
        .update(attachments)
        .set({ state: "COMMITTED" })
        .where(inArray(attachments.id, attachmentIds)),
      db
        .update(taskAssignments)
        .set({
          status: "MENUNGGU_VERIFIKASI",
          needsRevision: false,
          submittedAt: stamp,
          updatedAt: stamp,
        })
        .where(eq(taskAssignments.id, assignmentId)),
      db.insert(activityLogs).values({
        id: newId("log"),
        actorId: actor.id,
        action: "task.submit",
        entityType: "assignment",
        entityId: assignmentId,
        prevValue: context.status,
        newValue: JSON.stringify({
          status: "MENUNGGU_VERIFIKASI",
          version: existing.version,
          files: pendingAttachments.length,
        }),
        createdAt: stamp,
      }),
      ...notificationMutations,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Dua commit paralel dengan key sama: yang kalah balapan membaca hasil pemenang.
    if (message.includes("UNIQUE") || message.includes("constraint")) {
      const [winner] = await db
        .select({
          id: taskSubmissions.id,
          version: taskSubmissions.version,
          state: taskSubmissions.state,
        })
        .from(taskSubmissions)
        .where(eq(taskSubmissions.id, existing.id))
        .limit(1);
      if (winner?.state === "COMMITTED") {
        return {
          ok: true,
          submissionId: winner.id,
          version: winner.version,
          alreadyCommitted: true,
        };
      }
    }
    throw error;
  }

  return {
    ok: true,
    submissionId: existing.id,
    version: existing.version,
    alreadyCommitted: false,
  };
}

export async function countCommittedAttachments(
  db: Db,
  assignmentId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(attachments)
    .innerJoin(taskSubmissions, eq(taskSubmissions.id, attachments.submissionId))
    .where(
      and(
        eq(taskSubmissions.assignmentId, assignmentId),
        eq(attachments.state, "COMMITTED"),
      ),
    );
  return Number(row?.total ?? 0);
}
