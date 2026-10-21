"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  activityLogs,
  documentArchive,
  taskAssignments,
  taskReviews,
  taskSubmissions,
  tasks,
} from "@/db/schema";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import { buildDeliveryRows, buildNotificationBatch } from "@/lib/notification-outbox";
import { checkTransition } from "@/lib/status";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";

export type ActionResult = {
  success?: boolean;
  error?: string;
};

/**
 * Memulai pengerjaan tugas (BELUM_DIKERJAKAN → SEDANG_DIKERJAKAN).
 * Dijalankan oleh staf pelaksana yang ditugaskan (§3.2, L06).
 */
export async function startTask(assignmentId: string): Promise<ActionResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role !== "USER") {
    return {
      error: "Hanya staf pelaksana yang dapat memulai tugas.",
    };
  }

  const { db } = appContext();

  // Ambil data penugasan dan pastikan milik user yang sedang aktif
  const [row] = await db
    .select({
      id: taskAssignments.id,
      status: taskAssignments.status,
      userId: taskAssignments.userId,
      divisionId: tasks.divisionId,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(
      and(
        eq(taskAssignments.id, assignmentId),
        eq(taskAssignments.userId, scope.userId),
        eq(tasks.divisionId, scope.divisionId),
      ),
    )
    .limit(1);

  if (!row) {
    return {
      error: "Penugasan tidak ditemukan atau berada di luar akses Anda.",
    };
  }

  const check = checkTransition(row.status, "SEDANG_DIKERJAKAN", "USER", {
    hasCommittedAttachment: false,
  });

  if (!check.ok) {
    return {
      error: check.reason,
    };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  const updateMutation = db
    .update(taskAssignments)
    .set({
      status: "SEDANG_DIKERJAKAN",
      startedAt: stamp,
      updatedAt: stamp,
    })
    .where(eq(taskAssignments.id, row.id));

  const logMutation = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "task.start",
    entityType: "assignment",
    entityId: row.id,
    prevValue: row.status,
    newValue: "SEDANG_DIKERJAKAN",
    createdAt: stamp,
  });

  await db.batch([updateMutation, logMutation]);

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  return { success: true };
}

const CANCEL_REASON_MAX_LENGTH = 500;
// D1 membatasi 100 parameter terikat per statement; satu notifikasi memakai 7 kolom.

/**
 * Membatalkan tugas beserta seluruh penugasannya (BELUM/SEDANG → DIBATALKAN).
 * Admin divisi hanya boleh membatalkan tugas divisinya sendiri; alasan wajib.
 * Notifikasi in-app ditulis pada batch yang sama dengan perubahan status (§3.2).
 */
export async function cancelTask(
  taskId: string,
  reasonInput: string,
): Promise<ActionResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role !== "ADMIN") {
    return { error: "Hanya Admin divisi yang dapat membatalkan tugas." };
  }

  const reason = reasonInput.trim();
  if (!reason) {
    return { error: "Alasan pembatalan wajib diisi." };
  }
  if (reason.length > CANCEL_REASON_MAX_LENGTH) {
    return {
      error: `Alasan pembatalan maksimal ${CANCEL_REASON_MAX_LENGTH} karakter.`,
    };
  }

  const { db } = appContext();

  const rows = await db
    .select({
      assignmentId: taskAssignments.id,
      userId: taskAssignments.userId,
      status: taskAssignments.status,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(
      and(
        eq(taskAssignments.taskId, taskId),
        eq(tasks.divisionId, scope.divisionId),
      ),
    );

  if (rows.length === 0) {
    return {
      error: "Tugas tidak ditemukan atau berada di luar akses Anda.",
    };
  }

  for (const row of rows) {
    const check = checkTransition(row.status, "DIBATALKAN", "ADMIN", {
      hasCommittedAttachment: false,
      reason,
    });
    if (!check.ok) {
      return { error: check.reason };
    }
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  const updateTask = db
    .update(tasks)
    .set({
      cancelledAt: stamp,
      cancelReason: reason,
      updatedAt: stamp,
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.divisionId, scope.divisionId)));

  const cancelAssignments = db
    .update(taskAssignments)
    .set({
      status: "DIBATALKAN",
      cancelledAt: stamp,
      updatedAt: stamp,
    })
    .where(eq(taskAssignments.taskId, taskId));

  const logMutation = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "task.cancel",
    entityType: "task",
    entityId: taskId,
    prevValue: JSON.stringify(
      Object.fromEntries(rows.map((row) => [row.assignmentId, row.status])),
    ),
    newValue: JSON.stringify({ status: "DIBATALKAN", reason }),
    createdAt: stamp,
  });

  const notificationValues = rows.map((row) => ({
    id: newId("notification"),
    userId: row.userId,
    type: "TASK_CANCELLED" as const,
    entityType: "assignment",
    entityId: row.assignmentId,
    message: `Alasan: ${reason}`,
    createdAt: stamp,
  }));

  const deliveryRows = await buildDeliveryRows(db, notificationValues, stamp);
  const notificationMutations = buildNotificationBatch(
    db,
    notificationValues,
    deliveryRows,
  );

  await db.batch([
    updateTask,
    cancelAssignments,
    logMutation,
    ...notificationMutations,
  ]);

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  return { success: true };
}

export type ReviewDecision = "APPROVED" | "REVISION_REQUIRED";
export type ReviewActionInput = {
  assignmentId: string;
  decision: ReviewDecision;
  note?: string;
};

const REVIEW_NOTE_MAX_LENGTH = 2000;

/**
 * Review pengumpulan oleh Admin divisi (UC10).
 * - APPROVED: assignment SELESAI, completed_at, satu baris document_archive
 *   (upsert per assignment), log task.completed + archive.created, notifikasi.
 * - REVISION_REQUIRED: assignment kembali SEDANG_DIKERJAKAN, needs_revision,
 *   revision_count+1, log review, notifikasi ke pelaksana.
 * Seluruh perubahan ditulis dalam satu batch; kegagalan tidak mengubah status.
 */
export async function reviewSubmission(
  input: ReviewActionInput,
): Promise<ActionResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role !== "ADMIN") {
    return { error: "Hanya Admin divisi yang dapat memverifikasi pengumpulan." };
  }

  const note = input.note?.trim() ?? "";
  if (note.length > REVIEW_NOTE_MAX_LENGTH) {
    return {
      error: `Catatan maksimal ${REVIEW_NOTE_MAX_LENGTH} karakter.`,
    };
  }
  if (input.decision === "REVISION_REQUIRED" && !note) {
    return { error: "Catatan revisi wajib diisi." };
  }

  const { db } = appContext();

  const [row] = await db
    .select({
      assignmentId: taskAssignments.id,
      taskId: tasks.id,
      title: tasks.title,
      divisionId: tasks.divisionId,
      userId: taskAssignments.userId,
      status: taskAssignments.status,
      revisionCount: taskAssignments.revisionCount,
      submissionId: taskSubmissions.id,
      version: taskSubmissions.version,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .innerJoin(
      taskSubmissions,
      and(
        eq(taskSubmissions.assignmentId, taskAssignments.id),
        eq(taskSubmissions.state, "COMMITTED"),
      ),
    )
    .where(
      and(
        eq(taskAssignments.id, input.assignmentId),
        eq(tasks.divisionId, scope.divisionId),
      ),
    )
    .orderBy(desc(taskSubmissions.version))
    .limit(1);

  if (!row) {
    return {
      error: "Penugasan tidak ditemukan atau berada di luar akses Anda.",
    };
  }

  const targetStatus =
    input.decision === "APPROVED" ? "SELESAI" : "SEDANG_DIKERJAKAN";
  const check = checkTransition(row.status, targetStatus, "ADMIN", {
    hasCommittedAttachment: true,
    note,
  });
  if (!check.ok) return { error: check.reason };

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  const reviewMutation = db.insert(taskReviews).values({
    id: newId("review"),
    submissionId: row.submissionId,
    reviewerId: actor.id,
    decision: input.decision,
    feedback: note || null,
    createdAt: stamp,
  });

  const notificationValue = {
    id: newId("notification"),
    userId: row.userId,
    type:
      input.decision === "APPROVED"
        ? ("SUBMISSION_RECEIVED" as const)
        : ("REVISION_REQUESTED" as const),
    entityType: "assignment",
    entityId: row.assignmentId,
    message:
      input.decision === "APPROVED"
        ? `Versi ${row.version} disetujui. Dokumen final masuk katalog.`
        : `Catatan admin: ${note}`,
    createdAt: stamp,
  };
  const notificationBatch = buildNotificationBatch(
    db,
    [notificationValue],
    await buildDeliveryRows(db, [notificationValue], stamp),
  );

  const baseLog = {
    id: newId("log"),
    actorId: actor.id,
    entityType: "assignment",
    entityId: row.assignmentId,
    createdAt: stamp,
  };

  if (input.decision === "APPROVED") {
    const archiveId = newId("archive");

    await db.batch([
      reviewMutation,
      db
        .update(taskAssignments)
        .set({
          status: "SELESAI",
          needsRevision: false,
          completedAt: stamp,
          updatedAt: stamp,
        })
        .where(eq(taskAssignments.id, row.assignmentId)),
      db
        .insert(documentArchive)
        .values({
          id: archiveId,
          assignmentId: row.assignmentId,
          submissionId: row.submissionId,
          taskId: row.taskId,
          divisionId: row.divisionId,
          title: row.title,
          archivedAt: stamp,
        })
        .onConflictDoUpdate({
          target: documentArchive.assignmentId,
          set: {
            submissionId: row.submissionId,
            title: row.title,
            archivedAt: stamp,
          },
        }),
      db.insert(activityLogs).values({
        ...baseLog,
        action: "task.completed",
        prevValue: row.status,
        newValue: JSON.stringify({
          status: "SELESAI",
          version: row.version,
          submissionId: row.submissionId,
        }),
      }),
      db.insert(activityLogs).values({
        ...baseLog,
        id: newId("log"),
        action: "archive.created",
        prevValue: null,
        newValue: JSON.stringify({
          archiveId,
          submissionId: row.submissionId,
          taskId: row.taskId,
        }),
      }),
      ...notificationBatch,
    ]);
  } else {
    await db.batch([
      reviewMutation,
      db
        .update(taskAssignments)
        .set({
          status: "SEDANG_DIKERJAKAN",
          needsRevision: true,
          revisionCount: row.revisionCount + 1,
          updatedAt: stamp,
        })
        .where(eq(taskAssignments.id, row.assignmentId)),
      db.insert(activityLogs).values({
        ...baseLog,
        action: "task.revision",
        prevValue: row.status,
        newValue: JSON.stringify({
          status: "SEDANG_DIKERJAKAN",
          version: row.version,
          note,
        }),
      }),
      ...notificationBatch,
    ]);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${row.taskId}`);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/", "layout");

  return { success: true };
}
