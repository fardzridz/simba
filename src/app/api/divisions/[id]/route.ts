import { eq } from "drizzle-orm";
import { activityLogs, divisions } from "@/db/schema";
import { appContext } from "@/env";
import { loadActor } from "@/lib/auth/current";
import { assertDivisionAccess, resolveScope } from "@/lib/auth/scope";
import { newId } from "@/lib/ids";

export const dynamic = "force-dynamic";

/**
 * Detail satu divisi. Permintaan yang mencoba menembus divisi lain ditolak 403
 * tanpa detail internal dan dicatat ke log aktivitas (§9.3); inilah uji IDOR
 * yang dijalankan pada langkah smoke test.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await loadActor();
  if (!actor) {
    return Response.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  const { id } = await params;
  const scope = resolveScope(actor);
  const decision = assertDivisionAccess(scope, id);
  const { db } = appContext();

  if (!decision.ok) {
    await db.insert(activityLogs).values({
      id: newId("log"),
      actorId: actor.id,
      action: "authz.denied",
      entityType: "divisions",
      entityId: id,
      prevValue: null,
      newValue: JSON.stringify({ reason: decision.reason, role: scope.role, divisionId: scope.divisionId }),
      ipAddress: null,
      createdAt: new Date(),
    });
    return Response.json({ error: decision.reason }, { status: decision.status });
  }

  const [row] = await db
    .select({ id: divisions.id, name: divisions.name, code: divisions.code })
    .from(divisions)
    .where(eq(divisions.id, id))
    .limit(1);

  if (!row) return Response.json({ error: "Divisi tidak ditemukan." }, { status: 404 });
  return Response.json({ division: row });
}
