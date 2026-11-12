import { and, eq } from "drizzle-orm";
import {
  activityLogs,
  attachments,
  taskAssignments,
  taskSubmissions,
  tasks,
} from "@/db/schema";
import { appContext } from "@/env";
import { loadActor } from "@/lib/auth/current";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Hapus satu berkas draf (attachment PENDING, permintaan pengguna Fase 6).
 * Hanya pemilik penugasan saat status Sedang Dikerjakan; berkas milik
 * submission PENDING miliknya sendiri. Objek R2 dihapus best effort; kegagalan
 * objek tidak memblokir penghapusan barisnya.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string; attachmentId: string }> },
) {
  const actor = await loadActor();
  if (!actor) {
    return Response.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  if (actor.role !== "USER") {
    return Response.json(
      { error: "Hanya staf pelaksana yang dapat menghapus berkas drafnya." },
      { status: 403 },
    );
  }

  const { assignmentId, attachmentId } = await params;
  const { db, env } = appContext();

  const [assignment] = await db
    .select({ id: taskAssignments.id, status: taskAssignments.status })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(
      and(
        eq(taskAssignments.id, assignmentId),
        eq(taskAssignments.userId, actor.id),
        eq(tasks.divisionId, actor.divisionId),
      ),
    )
    .limit(1);

  if (!assignment) {
    return Response.json(
      { error: "Penugasan tidak ditemukan atau berada di luar akses Anda." },
      { status: 404 },
    );
  }

  if (assignment.status !== "SEDANG_DIKERJAKAN") {
    return Response.json(
      {
        error:
          "Berkas draf hanya dapat dihapus saat tugas berstatus Sedang Dikerjakan.",
      },
      { status: 409 },
    );
  }

  const [attachment] = await db
    .select({
      id: attachments.id,
      originalName: attachments.originalName,
      storedKey: attachments.storedKey,
      submissionId: attachments.submissionId,
    })
    .from(attachments)
    .innerJoin(taskSubmissions, eq(taskSubmissions.id, attachments.submissionId))
    .where(
      and(
        eq(attachments.id, attachmentId),
        eq(attachments.state, "PENDING"),
        eq(attachments.uploadedBy, actor.id),
        eq(taskSubmissions.assignmentId, assignmentId),
        eq(taskSubmissions.state, "PENDING"),
        eq(taskSubmissions.submittedBy, actor.id),
      ),
    )
    .limit(1);

  if (!attachment) {
    return Response.json(
      { error: "Berkas draf tidak ditemukan atau sudah tidak dapat dihapus." },
      { status: 404 },
    );
  }

  const deleted = await db
    .delete(attachments)
    .where(
      and(eq(attachments.id, attachment.id), eq(attachments.state, "PENDING")),
    )
    .returning({ id: attachments.id });

  if (deleted.length === 0) {
    return Response.json(
      { error: "Berkas draf sudah tidak dapat dihapus." },
      { status: 409 },
    );
  }

  // Objek R2 dihapus best effort; baris metadata sudah hilang sehingga berkas
  // tidak dapat diakses lagi walau pembersihan objek gagal.
  await env.BUCKET.delete(attachment.storedKey).catch(() => undefined);

  await db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "task.draft_attachment_deleted",
    entityType: "attachment",
    entityId: attachment.id,
    prevValue: null,
    newValue: JSON.stringify({
      name: attachment.originalName,
      submissionId: attachment.submissionId,
      assignmentId,
    }),
    createdAt: new Date(nowSeconds() * 1000),
  });

  return Response.json({ success: true });
}
