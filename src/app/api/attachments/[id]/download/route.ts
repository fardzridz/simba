import { and, eq } from "drizzle-orm";
import {
  attachments,
  taskAssignments,
  taskSubmissions,
  tasks,
} from "@/db/schema";
import { appContext } from "@/env";
import { loadActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

function contentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "berkas";
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Unduh lewat route server setelah pemeriksaan scope (§D5). Bucket privat;
 * tidak ada URL publik atau presign. Hanya attachment COMMITTED yang dilayani.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await loadActor();
  if (!actor) {
    return new Response("Sesi tidak valid.", { status: 401 });
  }

  const { id } = await params;
  const { env, db } = appContext();
  const scope = resolveScope(actor);

  const [row] = await db
    .select({
      storedKey: attachments.storedKey,
      fileName: attachments.originalName,
      mimeType: attachments.mimeType,
      sizeBytes: attachments.sizeBytes,
      state: attachments.state,
      userId: taskAssignments.userId,
      divisionId: tasks.divisionId,
    })
    .from(attachments)
    .innerJoin(
      taskSubmissions,
      eq(taskSubmissions.id, attachments.submissionId),
    )
    .innerJoin(
      taskAssignments,
      eq(taskAssignments.id, taskSubmissions.assignmentId),
    )
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(
      and(
        eq(attachments.id, id),
        eq(attachments.state, "COMMITTED"),
      ),
    )
    .limit(1);

  if (!row) {
    return new Response("Berkas tidak ditemukan.", { status: 404 });
  }

  const allowed =
    scope.role === "USER"
      ? row.userId === actor.id
      : scope.allDivisions || row.divisionId === scope.divisionId;

  if (!allowed) {
    return new Response("Berkas berada di luar akses Anda.", { status: 403 });
  }

  const object = await env.BUCKET.get(row.storedKey);
  if (!object) {
    return new Response("Objek berkas tidak ditemukan di penyimpanan.", {
      status: 404,
    });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": row.mimeType || "application/octet-stream",
      "Content-Length": String(row.sizeBytes),
      "Content-Disposition": contentDisposition(row.fileName),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
