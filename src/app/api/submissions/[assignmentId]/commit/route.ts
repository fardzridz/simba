import { appContext } from "@/env";
import { loadActor } from "@/lib/auth/current";
import { commitSubmission } from "@/lib/storage/commit";

export const dynamic = "force-dynamic";

/**
 * Commit satu pengumpulan (§8.3 langkah 3). Semua perubahan status ditulis
 * dalam satu batch; pengiriman ulang dengan key sama tidak membuat versi baru.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const payload = body as { idempotencyKey?: unknown; notes?: unknown };
  if (typeof payload.idempotencyKey !== "string") {
    return Response.json(
      { error: "Kunci idempotensi tidak valid." },
      { status: 400 },
    );
  }

  const { db } = appContext();
  const result = await commitSubmission(
    db,
    actor,
    assignmentId,
    payload.idempotencyKey,
    payload.notes,
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    submissionId: result.submissionId,
    version: result.version,
    alreadyCommitted: result.alreadyCommitted,
  });
}
