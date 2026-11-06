"use server";

import { and, count, desc, eq, inArray, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  PRIORITIES,
  activityLogs,
  attachments,
  categories,
  documentArchive,
  divisions,
  notifications,
  taskAssignments,
  taskReviews,
  taskSubmissions,
  tasks,
  users,
} from "@/db/schema";
import { appContext } from "@/env";
import type { Db } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import {
  buildDeliveryRows,
  buildNotificationBatch,
  type BatchItem,
} from "@/lib/notification-outbox";
import { notificationTitle } from "@/lib/notifications";
import { taskNumber, taskNumberPrefix } from "@/lib/task-numbers";
import { checkTransition } from "@/lib/status";
import { newId } from "@/lib/ids";
import {
  endOfJakartaDayFromDateInput,
  formatJakartaNotification,
  jakartaDateInput,
  nowSeconds,
  startOfJakartaDayFromDateInput,
} from "@/lib/time";

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

/**
 * Menghapus tugas Draft/Aktif beserta seluruh penugasannya (permintaan pengguna
 * Fase 6). Hanya Admin divisi sendiri; tugas yang sudah memiliki pengumpulan
 * COMMITTED (menunggu verifikasi atau final/terarsip) tidak boleh dihapus
 * supaya integral data katalog tetap utuh. Pengumpulan PENDING yang tereskal
 * ikut dibersihkan; objek R2-nya dihapus best effort tanpa memblokir.
 */
export async function deleteTask(taskId: string): Promise<ActionResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role !== "ADMIN") {
    return { error: "Hanya Admin divisi yang dapat menghapus tugas." };
  }

  const { db, env } = appContext();

  const [task] = await db
    .select({ id: tasks.id, title: tasks.title, taskNumber: tasks.taskNumber })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.divisionId, scope.divisionId)))
    .limit(1);

  if (!task) {
    return {
      error: "Tugas tidak ditemukan atau berada di luar akses Anda.",
    };
  }

  const [block] = await db
    .select({ total: count() })
    .from(taskSubmissions)
    .innerJoin(
      taskAssignments,
      eq(taskAssignments.id, taskSubmissions.assignmentId),
    )
    .where(
      and(
        eq(taskAssignments.taskId, taskId),
        eq(taskSubmissions.state, "COMMITTED"),
      ),
    );

  if ((block?.total ?? 0) > 0) {
    return {
      error:
        "Tugas tidak dapat dihapus karena ada pengumpulan berkas tersimpan (menunggu verifikasi atau final). Batalkan tugasnya bila perlu menutup pekerjaan.",
    };
  }

  const assignmentIdsSq = db
    .select({ id: taskAssignments.id })
    .from(taskAssignments)
    .where(eq(taskAssignments.taskId, taskId));
  const submissionIdsSq = db
    .select({ id: taskSubmissions.id })
    .from(taskSubmissions)
    .where(inArray(taskSubmissions.assignmentId, assignmentIdsSq));

  const pendingFiles = await db
    .select({ key: attachments.storedKey })
    .from(attachments)
    .where(
      and(
        inArray(attachments.submissionId, submissionIdsSq),
        eq(attachments.state, "PENDING"),
      ),
    );

  await Promise.all(
    pendingFiles.map((f) => env.BUCKET.delete(f.key).catch(() => undefined)),
  );

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  const logMutation = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "task.deleted",
    entityType: "task",
    entityId: taskId,
    newValue: JSON.stringify({
      taskNumber: task.taskNumber,
      title: task.title,
    }),
    createdAt: stamp,
  });

  await db.batch([
    db
      .delete(documentArchive)
      .where(inArray(documentArchive.assignmentId, assignmentIdsSq)),
    db
      .delete(taskReviews)
      .where(inArray(taskReviews.submissionId, submissionIdsSq)),
    db
      .delete(attachments)
      .where(inArray(attachments.submissionId, submissionIdsSq)),
    db
      .delete(taskSubmissions)
      .where(inArray(taskSubmissions.assignmentId, assignmentIdsSq)),
    db
      .delete(notifications)
      .where(and(eq(notifications.entityType, "task"), eq(notifications.entityId, taskId))),
    db
      .delete(notifications)
      .where(
        and(
          eq(notifications.entityType, "assignment"),
          inArray(notifications.entityId, assignmentIdsSq),
        ),
      ),
    db.delete(taskAssignments).where(eq(taskAssignments.taskId, taskId)),
    db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.divisionId, scope.divisionId))),
    logMutation,
  ]);

  revalidateAfterTaskMutation(taskId);

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

  // Penugasan dicari terpisah dari pengumpulan: status MENUNGGU_VERIFIKASI
  // tanpa baris task_submissions COMMITTED (data tidak konsisten) tidak boleh
  // dilaporkan sebagai "berada di luar akses" karena penugasannya sah.
  const [assignment] = await db
    .select({
      assignmentId: taskAssignments.id,
      taskId: tasks.id,
      title: tasks.title,
      divisionId: tasks.divisionId,
      userId: taskAssignments.userId,
      status: taskAssignments.status,
      revisionCount: taskAssignments.revisionCount,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(
      and(
        eq(taskAssignments.id, input.assignmentId),
        eq(tasks.divisionId, scope.divisionId),
      ),
    )
    .limit(1);

  if (!assignment) {
    return {
      error: "Penugasan tidak ditemukan atau berada di luar akses Anda.",
    };
  }

  const [submission] = await db
    .select({
      submissionId: taskSubmissions.id,
      version: taskSubmissions.version,
    })
    .from(taskSubmissions)
    .where(
      and(
        eq(taskSubmissions.assignmentId, assignment.assignmentId),
        eq(taskSubmissions.state, "COMMITTED"),
      ),
    )
    .orderBy(desc(taskSubmissions.version))
    .limit(1);

  if (!submission) {
    return {
      error:
        "Pengumpulan tidak ditemukan untuk penugasan yang menunggu verifikasi. Minta staf mengirim ulang berkas atau minta Super Admin memeriksa konsistensi data.",
    };
  }

  const row = { ...assignment, ...submission };

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

/** Galat per kolom untuk form tugas; pesan sudah bahasa Indonesia dari zod. */
export type TaskFieldErrors = {
  title?: string;
  description?: string;
  categoryId?: string;
  priority?: string;
  startDate?: string;
  dueDate?: string;
  staffIds?: string;
};

/** Hasil aksi mutasi tugas: `fields` diisi bila kegagalan berasal kolom. */
export type TaskMutationResult = ActionResult & {
  fields?: TaskFieldErrors;
  taskId?: string;
};

const TASK_TITLE_MAX_LENGTH = 200;
const TASK_DESCRIPTION_MAX_LENGTH = 2000;
/** D1 membatasi 100 parameter terikat; penugasan memakai 5 kolom per baris. */
const ASSIGNMENT_INSERT_CHUNK = 20;
/** D1 membatasi 100 parameter terikat; menyisakan ruang untuk parameter query lain. */
const QUERY_CHUNK = 90;
/** Nomor urut bulan korban balapan hanya ditembus satu coba ulang (§6.2). */
const TASK_NUMBER_MAX_ATTEMPTS = 2;

const COMMON_TITLE = z
  .string()
  .trim()
  .min(1, "Judul tugas wajib diisi.")
  .max(TASK_TITLE_MAX_LENGTH, `Judul tugas maksimal ${TASK_TITLE_MAX_LENGTH} karakter.`);

const COMMON_DESCRIPTION = z
  .string()
  .trim()
  .max(
    TASK_DESCRIPTION_MAX_LENGTH,
    `Deskripsi penugasan maksimal ${TASK_DESCRIPTION_MAX_LENGTH} karakter.`,
  )
  .optional();

const COMMON_STAFF_IDS = z
  .array(z.string().trim().min(1, "Penerima tidak memiliki identitas."))
  .min(1, "Pilih minimal satu penerima penugasan.");

function fieldErrorsFrom(error: z.ZodError): TaskFieldErrors {
  const fields: TaskFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fields)) {
      fields[key as keyof TaskFieldErrors] = issue.message;
    }
  }
  return fields;
}

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unique/i.test(message);
}

/** Terpenuhi bila minimal satu galat kolom; aksi berhenti sebelum menulis apa pun. */
function hasFieldErrors(fields: TaskFieldErrors): boolean {
  return Object.values(fields).some(Boolean);
}

/**
 * Penerima yang sah: staf pelaksana aktif pada satu divisi yang sama.
 * ID di luar kondisi itu tidak menulis baris penugasan apa pun.
 */
async function validReceiverIds(
  db: Db,
  divisionId: string,
  staffIds: string[],
): Promise<string[]> {
  const uniqueIds = [...new Set(staffIds)];
  if (uniqueIds.length === 0) return [];
  const valid: string[] = [];
  for (let index = 0; index < uniqueIds.length; index += QUERY_CHUNK) {
    const slice = uniqueIds.slice(index, index + QUERY_CHUNK);
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          inArray(users.id, slice),
          eq(users.divisionId, divisionId),
          eq(users.role, "USER"),
          eq(users.isActive, true),
        ),
      );
    valid.push(...rows.map((row) => row.id));
  }
  return valid;
}

function receiverErrorFor(staffIds: string[]): string {
  return `Penerima harus staf pelaksana aktif di divisi Anda (${staffIds.join(", ")}).`;
}

/** Susun statement masuk penugasan sesuai batas parameter D1. */
function assignmentInsertStatements(
  db: Db,
  rows: Array<typeof taskAssignments.$inferInsert>,
): BatchItem[] {
  const statements: BatchItem[] = [];
  for (let index = 0; index < rows.length; index += ASSIGNMENT_INSERT_CHUNK) {
    statements.push(
      db
        .insert(taskAssignments)
        .values(rows.slice(index, index + ASSIGNMENT_INSERT_CHUNK)),
    );
  }
  return statements;
}

/** Meminta tuple; elemen pertama dipastikan ada sebelum sisa ikut. */
async function runTaskBatch(db: Db, items: BatchItem[]): Promise<void> {
  const [first, ...rest] = items;
  if (!first) throw new Error("Batch mutasi tugas kosong.");
  await db.batch([first, ...rest]);
}

/** Jumlah tugas satu divisi pada bulan berjalan; nomor tidak pernah dipakai ulang. */
async function countTasksWithPrefix(
  db: Db,
  divisionId: string,
  prefix: string,
): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(tasks)
    .where(
      and(eq(tasks.divisionId, divisionId), like(tasks.taskNumber, `${prefix}%`)),
    );
  return rows[0]?.total ?? 0;
}

function revalidateAfterTaskMutation(taskId: string): void {
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

const createTaskSchema = z.object({
  title: COMMON_TITLE,
  description: COMMON_DESCRIPTION,
  categoryId: z.string().trim().min(1, "Kategori wajib dipilih."),
  priority: z.enum(PRIORITIES),
  startDate: z.string().trim().optional(),
  dueDate: z.string().trim().min(1, "Tenggat waktu wajib diisi."),
  staffIds: COMMON_STAFF_IDS,
});

/**
 * Menerbitkan tugas baru beserta penugasannya (UC03, §12 #4): nomor tugas
 * `<KODE>/<YYYY>/<MM>/<NNN>` per bulan WIB, tabrakan nomor unik dicoba ulang
 * sekali dengan recount, seluruh tulisan dalam satu batch.
 */
export async function createTask(
  input: unknown,
): Promise<TaskMutationResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role !== "ADMIN") {
    return { error: "Hanya Admin divisi yang dapat membuat tugas." };
  }

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { fields: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const { db } = appContext();

  const [division] = await db
    .select({ id: divisions.id, name: divisions.name, code: divisions.code })
    .from(divisions)
    .where(eq(divisions.id, scope.divisionId))
    .limit(1);

  if (!division) {
    return { error: "Divisi akun tidak ditemukan." };
  }

  const fields: TaskFieldErrors = {};

  const [category] = await db
    .select({ name: categories.name, isActive: categories.isActive })
    .from(categories)
    .where(eq(categories.id, data.categoryId))
    .limit(1);
  if (!category) {
    fields.categoryId = "Kategori tidak ditemukan.";
  } else if (!category.isActive) {
    fields.categoryId = `Kategori ${category.name} sedang nonaktif dan tidak dapat dipakai.`;
  }

  const now = nowSeconds();
  const startInput = data.startDate?.trim();
  const startSeconds = startOfJakartaDayFromDateInput(
    startInput ? startInput : jakartaDateInput(now),
  );
  const dueSeconds = endOfJakartaDayFromDateInput(data.dueDate);
  if (startSeconds === null) {
    fields.startDate = "Tanggal mulai tidak valid.";
  }
  if (dueSeconds === null) {
    fields.dueDate = "Tanggal tenggat tidak valid.";
  } else if (startSeconds !== null && dueSeconds < startSeconds) {
    fields.dueDate = "Tenggat tidak boleh lebih awal daripada tanggal mulai.";
  }

  const targetIds = [...new Set(data.staffIds)];
  const validIds = await validReceiverIds(db, scope.divisionId, targetIds);
  const invalidIds = targetIds.filter((id) => !validIds.includes(id));
  if (invalidIds.length > 0) {
    fields.staffIds = receiverErrorFor(invalidIds);
  }

  if (hasFieldErrors(fields)) {
    return { fields };
  }

  const title = data.title;
  const description = data.description ?? null;
  const priority = data.priority;

  const prefix = taskNumberPrefix(division.code, now);

  for (let remaining = TASK_NUMBER_MAX_ATTEMPTS; ; remaining -= 1) {
    if (remaining <= 0) {
      return { error: "Nomor tugas tidak dapat dibuat, coba beberapa saat lagi." };
    }

    const totalExisting = await countTasksWithPrefix(db, scope.divisionId, prefix);
    const sequence = totalExisting + 1;
    const taskNumberValue = taskNumber(division.code, now, sequence);
    const taskId = newId("task");
    const stamp = new Date(now * 1000);

    const assignmentRows = targetIds.map((userId) => ({
      id: newId("assignment"),
      taskId,
      userId,
      createdAt: stamp,
      updatedAt: stamp,
    }));

    const notificationValues = assignmentRows.map((row) => ({
      id: newId("notification"),
      userId: row.userId,
      type: "TASK_ASSIGNED" as const,
      entityType: "task",
      entityId: taskId,
      message: `${notificationTitle("TASK_ASSIGNED", title)} · Tenggat ${formatJakartaNotification(dueSeconds!)}`,
      createdAt: stamp,
    }));

    const deliveryRows = await buildDeliveryRows(db, notificationValues, stamp);

    const batchItems: BatchItem[] = [
      db.insert(tasks).values({
        id: taskId,
        divisionId: division.id,
        categoryId: data.categoryId,
        taskNumber: taskNumberValue,
        title,
        description,
        priority,
        createdBy: actor.id,
        startAt: new Date(startSeconds! * 1000),
        dueAt: new Date(dueSeconds! * 1000),
        createdAt: stamp,
        updatedAt: stamp,
      }),
      ...assignmentInsertStatements(db, assignmentRows),
      db.insert(activityLogs).values({
        id: newId("log"),
        actorId: actor.id,
        action: "task.created",
        entityType: "task",
        entityId: taskId,
        prevValue: null,
        newValue: JSON.stringify({
          taskNumber: taskNumberValue,
          title,
          priority,
          dueAt: jakartaDateInput(dueSeconds!),
          receivers: targetIds,
        }),
        createdAt: stamp,
      }),
      ...buildNotificationBatch(db, notificationValues, deliveryRows),
    ];

    try {
      await runTaskBatch(db, batchItems);
    } catch (error) {
      if (remaining - 1 > 0 && isUniqueViolation(error)) {
        continue;
      }
      return {
        error: "Pembuatan tugas gagal disimpan, coba beberapa saat lagi.",
      };
    }

    revalidateAfterTaskMutation(taskId);
    return { success: true, taskId };
  }
}

const updateTaskSchema = z.object({
  taskId: z.string().trim().min(1, "Tugas tidak dikenali."),
  title: COMMON_TITLE,
  description: COMMON_DESCRIPTION,
  categoryId: z.string().trim().min(1, "Kategori wajib dipilih."),
  priority: z.enum(PRIORITIES),
  startDate: z.string().trim().optional(),
  dueDate: z.string().trim().min(1, "Tenggat waktu wajib diisi."),
  staffIds: COMMON_STAFF_IDS,
});

const hasFinalStatus = (status: string) =>
  status === "SELESAI" || status === "DIBATALKAN";

/**
 * Mengubah tugas yang belum final (UC06): penerima berstatus selain
 * BELUM_DIKERJAKAN tidak dapat dilepas, penerima baru berstatus awal
 * BELUM_DIKERJAKAN, log `task.updated` hanya bila ada perubahan nyata.
 */
export async function updateTask(
  input: unknown,
): Promise<TaskMutationResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role !== "ADMIN") {
    return { error: "Hanya Admin divisi yang dapat mengubah tugas." };
  }

  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { fields: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const { db } = appContext();

  const [row] = await db
    .select({
      taskId: tasks.id,
      title: tasks.title,
      description: tasks.description,
      categoryId: tasks.categoryId,
      priority: tasks.priority,
      startAt: tasks.startAt,
      dueAt: tasks.dueAt,
    })
    .from(tasks)
    .where(and(eq(tasks.id, data.taskId), eq(tasks.divisionId, scope.divisionId)))
    .limit(1);

  if (!row) {
    return { error: "Tugas tidak ditemukan atau berada di luar akses Anda." };
  }

  const assignments = await db
    .select({
      userId: taskAssignments.userId,
      status: taskAssignments.status,
      name: users.fullName,
    })
    .from(taskAssignments)
    .innerJoin(users, eq(users.id, taskAssignments.userId))
    .where(eq(taskAssignments.taskId, row.taskId));

  if (assignments.length === 0) {
    return { error: "Tugas ini tidak memiliki penerima penugasan." };
  }

  if (assignments.some((row_) => hasFinalStatus(row_.status))) {
    return {
      error:
        "Tugas ini memuat penugasan yang sudah selesai atau dibatalkan, sehingga rincian tidak dapat diubah lagi.",
    };
  }

  const fields: TaskFieldErrors = {};

  const [category] = await db
    .select({ name: categories.name, isActive: categories.isActive })
    .from(categories)
    .where(eq(categories.id, data.categoryId))
    .limit(1);
  if (!category) {
    fields.categoryId = "Kategori tidak ditemukan.";
  } else if (!category.isActive) {
    fields.categoryId = `Kategori ${category.name} sedang nonaktif dan tidak dapat dipakai.`;
  }

  const now = nowSeconds();
  const startInput = data.startDate?.trim();
  const startSeconds = startOfJakartaDayFromDateInput(
    startInput ? startInput : jakartaDateInput(now),
  );
  const dueSeconds = endOfJakartaDayFromDateInput(data.dueDate);
  if (startSeconds === null) {
    fields.startDate = "Tanggal mulai tidak valid.";
  }
  if (dueSeconds === null) {
    fields.dueDate = "Tanggal tenggat tidak valid.";
  } else if (startSeconds !== null && dueSeconds < startSeconds) {
    fields.dueDate = "Tenggat tidak boleh lebih awal daripada tanggal mulai.";
  }

  const targetIds = [...new Set(data.staffIds)];
  const assignedIds = assignments.map((row_) => row_.userId);
  const removedIds = assignedIds.filter((id) => !targetIds.includes(id));
  const releasedWithProgress = assignments.filter(
    (row_) => removedIds.includes(row_.userId) && row_.status !== "BELUM_DIKERJAKAN",
  );
  if (releasedWithProgress.length > 0) {
    fields.staffIds = `Penerima berikut sudah memulai pengumpulan sehingga tidak dapat dilepas: ${releasedWithProgress
      .map((row_) => row_.name)
      .join(", ")}.`;
  }

  const addedIds = targetIds.filter((id) => !assignedIds.includes(id));
  const validAddedIds = await validReceiverIds(db, scope.divisionId, addedIds);
  const invalidAddedIds = addedIds.filter((id) => !validAddedIds.includes(id));
  if (invalidAddedIds.length > 0) {
    fields.staffIds = receiverErrorFor(invalidAddedIds);
  }

  if (hasFieldErrors(fields)) {
    return { fields };
  }

  const title = data.title;
  const description = data.description ?? null;
  const priority = data.priority;
  const stamp = new Date(now * 1000);
  const storedStartSeconds = Math.floor(
    new Date(row.startAt).getTime() / 1000,
  );
  const storedDueSeconds = Math.floor(
    new Date(row.dueAt).getTime() / 1000,
  );

  const unchanged =
    row.title === title &&
    (row.description ?? null) === description &&
    row.categoryId === data.categoryId &&
    row.priority === priority &&
    storedStartSeconds === startSeconds &&
    storedDueSeconds === dueSeconds &&
    removedIds.length === 0 &&
    addedIds.length === 0;

  // Simpan tanpa tulis apa pun selain sukses; log kosong tidak menguntungkan audit.
  if (unchanged) {
    return { success: true, taskId: row.taskId };
  }

  const batchItems: BatchItem[] = [
    db
      .update(tasks)
      .set({
        title,
        description,
        categoryId: data.categoryId,
        priority,
        startAt: new Date(startSeconds! * 1000),
        dueAt: new Date(dueSeconds! * 1000),
        updatedAt: stamp,
      })
      .where(eq(tasks.id, row.taskId)),
  ];
  for (let index = 0; index < removedIds.length; index += QUERY_CHUNK) {
    batchItems.push(
      db
        .delete(taskAssignments)
        .where(
          and(
            eq(taskAssignments.taskId, row.taskId),
            inArray(taskAssignments.userId, removedIds.slice(index, index + QUERY_CHUNK)),
          ),
        ),
    );
  }

  const addedRows = addedIds.map((userId) => ({
    id: newId("assignment"),
    taskId: row.taskId,
    userId,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  batchItems.push(...assignmentInsertStatements(db, addedRows));

  const notificationValues = addedRows.map((row_) => ({
    id: newId("notification"),
    userId: row_.userId,
    type: "TASK_ASSIGNED" as const,
    entityType: "task",
    entityId: row_.taskId,
    message: `${notificationTitle("TASK_ASSIGNED", title)} · Tenggat ${formatJakartaNotification(dueSeconds!)}`,
    createdAt: stamp,
  }));
  const deliveryRows = await buildDeliveryRows(db, notificationValues, stamp);
  batchItems.push(...buildNotificationBatch(db, notificationValues, deliveryRows));

  batchItems.push(
    db.insert(activityLogs).values({
      id: newId("log"),
      actorId: actor.id,
      action: "task.updated",
      entityType: "task",
      entityId: row.taskId,
      prevValue: JSON.stringify({
        title: row.title,
        description: row.description,
        categoryId: row.categoryId,
        priority: row.priority,
        startDate: jakartaDateInput(storedStartSeconds),
        dueDate: jakartaDateInput(storedDueSeconds),
        receivers: assignedIds,
      }),
      newValue: JSON.stringify({
        title,
        description,
        categoryId: data.categoryId,
        priority,
        startDate: jakartaDateInput(startSeconds!),
        dueDate: jakartaDateInput(dueSeconds!),
        receivers: targetIds,
        removedReceivers: removedIds,
        addedReceivers: addedIds,
      }),
      createdAt: stamp,
    }),
  );

  try {
    await runTaskBatch(db, batchItems);
  } catch {
    return { error: "Perubahan tugas gagal disimpan, coba beberapa saat lagi." };
  }

  revalidateAfterTaskMutation(row.taskId);
  return { success: true, taskId: row.taskId };
}

const EXTEND_REASON_MAX_LENGTH = 500;

const extendDeadlineSchema = z.object({
  taskId: z.string().trim().min(1, "Tugas tidak dikenali."),
  newDueDate: z.string().trim().min(1, "Pilih tanggal tenggat baru."),
  reason: z
    .string()
    .trim()
    .max(
      EXTEND_REASON_MAX_LENGTH,
      `Alasan perubahan tenggat maksimal ${EXTEND_REASON_MAX_LENGTH} karakter.`,
    )
    .optional(),
});

/**
 * Perpanjangan tenggat (UC06, §3.2): bukan transisi status, hanya mengubah
 * `due_at` dan menulis log berisi nilai lama dan baru. Seluruh penugasan final
 * membuat permintaan ditolak; penerima final tidak diberi notifikasi.
 */
export async function extendDeadline(
  input: unknown,
): Promise<ActionResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role !== "ADMIN") {
    return { error: "Hanya Admin divisi yang dapat memperpanjang tenggat." };
  }

  const parsed = extendDeadlineSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak sah." };
  }
  const data = parsed.data;

  const dueSeconds = endOfJakartaDayFromDateInput(data.newDueDate);
  if (dueSeconds === null) {
    return { error: "Pilih tanggal tenggat baru yang valid." };
  }
  const reason = data.reason ?? "";

  const { db } = appContext();
  const now = nowSeconds();

  const [row] = await db
    .select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt })
    .from(tasks)
    .where(and(eq(tasks.id, data.taskId), eq(tasks.divisionId, scope.divisionId)))
    .limit(1);

  if (!row) {
    return { error: "Tugas tidak ditemukan atau berada di luar akses Anda." };
  }

  const assignments = await db
    .select({ assignmentId: taskAssignments.id, userId: taskAssignments.userId, status: taskAssignments.status })
    .from(taskAssignments)
    .where(eq(taskAssignments.taskId, row.id));

  if (assignments.length === 0) {
    return { error: "Tugas ini tidak memiliki penerima penugasan." };
  }

  if (assignments.every((row_) => hasFinalStatus(row_.status))) {
    return {
      error:
        "Seluruh penugasan sudah selesai atau dibatalkan sehingga tenggat tidak dapat diperpanjang.",
    };
  }

  const currentDueSeconds = Math.floor(new Date(row.dueAt).getTime() / 1000);
  if (dueSeconds <= currentDueSeconds) {
    return { error: "Tenggat baru harus lebih lanjut daripada tenggat saat ini." };
  }
  if (dueSeconds < now) {
    return { error: "Tanggal tenggat baru tidak boleh sudah lewat." };
  }

  const stamp = new Date(now * 1000);
  const receivers = assignments.filter((row_) => !hasFinalStatus(row_.status));

  const notificationValues = receivers.map((row_) => ({
    id: newId("notification"),
    userId: row_.userId,
    type: "TASK_DUE_EXTENDED" as const,
    entityType: "task",
    entityId: row.id,
    message: `Tenggat baru ${formatJakartaNotification(dueSeconds)}${reason ? ` · Alasan: ${reason}` : ""}`,
    createdAt: stamp,
  }));
  const deliveryRows = await buildDeliveryRows(db, notificationValues, stamp);

  await db.batch([
    db
      .update(tasks)
      .set({ dueAt: new Date(dueSeconds * 1000), updatedAt: stamp })
      .where(eq(tasks.id, row.id)),
    db.insert(activityLogs).values({
      id: newId("log"),
      actorId: actor.id,
      action: "due_date.extended",
      entityType: "task",
      entityId: row.id,
      prevValue: JSON.stringify({ dueAt: jakartaDateInput(currentDueSeconds) }),
      newValue: JSON.stringify({ dueAt: jakartaDateInput(dueSeconds), reason: reason || null }),
      createdAt: stamp,
    }),
    ...buildNotificationBatch(db, notificationValues, deliveryRows),
  ]);

  revalidateAfterTaskMutation(row.id);
  return { success: true };
}

