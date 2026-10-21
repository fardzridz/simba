import { and, eq, sql } from "drizzle-orm";
import {
  attachments,
  taskAssignments,
  taskSubmissions,
  tasks,
} from "@/db/schema";
import type { AppEnv, Db } from "@/env";
import type { Actor } from "@/lib/auth/scope";
import { checkTransition } from "@/lib/status";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";
import {
  extensionOf,
  getUploadSettings,
  mimeMatches,
  signatureMatches,
  type CanonicalType,
} from "./settings";

export const ATTACHMENT_STATE_PENDING = "PENDING" as const;
export const ATTACHMENT_STATE_COMMITTED = "COMMITTED" as const;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export type UploadFailure = {
  ok: false;
  status: number;
  error: string;
};

export type UploadSuccess = {
  ok: true;
  attachmentId: string;
  name: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type SubmissionContext = {
  assignmentId: string;
  taskId: string;
  divisionId: string;
  userId: string;
  status: (typeof taskAssignments.$inferSelect)["status"];
  needsRevision: boolean;
};

/**
 * Cek assignment yang boleh diunggah oleh pelaku. USER hanya assignment miliknya,
 * ADMIN/SUPER_ADMIN tidak diizinkan mengunggah (§2, UC09).
 */
export async function loadSubmissionContext(
  db: Db,
  actorId: string,
  assignmentId: string,
): Promise<SubmissionContext | null> {
  const [row] = await db
    .select({
      assignmentId: taskAssignments.id,
      taskId: tasks.id,
      divisionId: tasks.divisionId,
      userId: taskAssignments.userId,
      status: taskAssignments.status,
      needsRevision: taskAssignments.needsRevision,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(
      and(
        eq(taskAssignments.id, assignmentId),
        eq(taskAssignments.userId, actorId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Validasi + tulis satu berkas ke R2, lalu simpan metadata `PENDING`.
 * Objek dihapus kembali bila insert DB gagal, supaya tidak ada objek tanpa metadata.
 */
export async function storePendingAttachment(
  env: AppEnv,
  db: Db,
  actor: Actor,
  context: SubmissionContext,
  file: File,
  idempotencyKey: string,
): Promise<UploadSuccess | UploadFailure> {
  if (context.status !== "SEDANG_DIKERJAKAN") {
    return {
      ok: false,
      status: 409,
      error:
        context.status === "BELUM_DIKERJAKAN"
          ? "Mulai kerjakan tugas sebelum mengumpulkan berkas."
          : "Tugas ini tidak sedang dalam status dikerjakan.",
    };
  }

  const settings = await getUploadSettings(db);
  const type = extensionOf(file.name) as CanonicalType;
  if (!settings.allowedTypes.includes(type)) {
    return {
      ok: false,
      status: 400,
      error: `Tipe berkas .${type || "?"} tidak diizinkan.`,
    };
  }
  if (file.size <= 0) {
    return { ok: false, status: 400, error: "Berkas kosong tidak dapat diunggah." };
  }
  if (file.size > settings.maxFileBytes) {
    return {
      ok: false,
      status: 400,
      error: `Ukuran berkas melebihi batas ${Math.round(settings.maxFileBytes / (1024 * 1024))} MB.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(type, bytes)) {
    return {
      ok: false,
      status: 400,
      error: "Isi berkas tidak sesuai dengan ekstensinya.",
    };
  }
  if (!mimeMatches(type, file.type)) {
    return { ok: false, status: 400, error: "MIME berkas tidak sesuai." };
  }

  const checksum = await sha256Hex(bytes);
  const now = new Date();
  const month = new Date(
    now.getTime() + 7 * 3600 * 1000,
  ).toISOString().slice(0, 7).replace("-", "");
  const storedKey = `uploads/${context.divisionId}/${month}/${crypto.randomUUID()}.${type}`;

  const [existingSubmission] = await db
    .select({ id: taskSubmissions.id })
    .from(taskSubmissions)
    .where(
      and(
        eq(taskSubmissions.assignmentId, context.assignmentId),
        eq(taskSubmissions.idempotencyKey, idempotencyKey),
        eq(taskSubmissions.submittedBy, actor.id),
      ),
    )
    .limit(1);

  let submissionId = existingSubmission?.id;
  if (!submissionId) {
    const [maxRow] = await db
      .select({ maxVersion: sql<number>`coalesce(max(${taskSubmissions.version}), 0)` })
      .from(taskSubmissions)
      .where(eq(taskSubmissions.assignmentId, context.assignmentId));
    const nextVersion = Number(maxRow?.maxVersion ?? 0) + 1;
    submissionId = newId("submission");

    try {
      await db.insert(taskSubmissions).values({
        id: submissionId,
        assignmentId: context.assignmentId,
        version: nextVersion,
        notes: null,
        state: "PENDING",
        idempotencyKey,
        submittedBy: actor.id,
        createdAt: now,
      });
    } catch {
      // Klien mengirim beberapa berkas paralel dengan key yang sama; pakai baris
      // staging yang lebih dulu dibuat.
      const [raced] = await db
        .select({ id: taskSubmissions.id })
        .from(taskSubmissions)
        .where(
          and(
            eq(taskSubmissions.assignmentId, context.assignmentId),
            eq(taskSubmissions.idempotencyKey, idempotencyKey),
            eq(taskSubmissions.submittedBy, actor.id),
          ),
        )
        .limit(1);
      if (!raced) {
        await env.BUCKET.delete(storedKey).catch(() => undefined);
        throw new Error("Gagal menyiapkan pengumpulan.");
      }
      submissionId = raced.id;
    }
  }

  const [pendingCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(attachments)
    .where(
      and(
        eq(attachments.submissionId, submissionId),
        eq(attachments.state, "PENDING"),
        eq(attachments.uploadedBy, actor.id),
      ),
    );

  if (Number(pendingCount?.total ?? 0) >= settings.maxFilesPerSubmission) {
    return {
      ok: false,
      status: 400,
      error: `Maksimal ${settings.maxFilesPerSubmission} berkas per pengumpulan.`,
    };
  }

  await env.BUCKET.put(storedKey, bytes, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  const attachmentId = newId("attachment");
  try {
    await db.insert(attachments).values({
      id: attachmentId,
      submissionId,
      originalName: file.name,
      storedKey,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      checksumSha256: checksum,
      state: "PENDING",
      uploadedBy: actor.id,
      createdAt: now,
    });
  } catch (error) {
    await env.BUCKET.delete(storedKey).catch(() => undefined);
    throw error;
  }

  return {
    ok: true,
    attachmentId,
    name: file.name,
    sizeBytes: file.size,
    checksumSha256: checksum,
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const data = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(data).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
