import { appContext } from "@/env";
import { loadActor } from "@/lib/auth/current";
import {
  IDEMPOTENCY_KEY_PATTERN,
  loadSubmissionContext,
  storePendingAttachment,
} from "@/lib/storage/upload";

export const dynamic = "force-dynamic";

/**
 * Unggah satu berkas ke R2 dan catat attachment `PENDING` (§8.3 langkah 1–2).
 * Server mengulang seluruh validasi klien; keputusan menerima berkas ada di sini.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const actor = await loadActor();
  if (!actor) {
    return Response.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  if (actor.role !== "USER") {
    return Response.json(
      { error: "Hanya staf pelaksana yang dapat mengumpulkan berkas." },
      { status: 403 },
    );
  }

  const { assignmentId } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Body multipart tidak valid." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Berkas tidak ditemukan." }, { status: 400 });
  }

  const idempotencyKey = String(form.get("idempotencyKey") ?? "");
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return Response.json(
      { error: "Kunci idempotensi tidak valid." },
      { status: 400 },
    );
  }

  const { env, db } = appContext();
  const context = await loadSubmissionContext(db, actor.id, assignmentId);
  if (!context) {
    return Response.json(
      { error: "Penugasan tidak ditemukan atau berada di luar akses Anda." },
      { status: 404 },
    );
  }

  const result = await storePendingAttachment(
    env,
    db,
    actor,
    context,
    file,
    idempotencyKey,
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    attachmentId: result.attachmentId,
    name: result.name,
    sizeBytes: result.sizeBytes,
  });
}
