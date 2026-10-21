import { asc, eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import { appContext } from "@/env";
import { loadActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

/**
 * Daftar divisi yang boleh dilihat pelaku. Cakupan diterapkan di query (bukan
 * penyaringan di sisi klien), sehingga Admin divisi lain tidak pernah menerima
 * baris di luar divisinya (§9.3).
 */
export async function GET() {
  const actor = await loadActor();
  if (!actor) {
    return Response.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  const scope = resolveScope(actor);
  const { db } = appContext();
  const rows = await db
    .select({ id: divisions.id, name: divisions.name, code: divisions.code })
    .from(divisions)
    .where(scope.allDivisions ? eq(divisions.isActive, true) : eq(divisions.id, scope.divisionId))
    .orderBy(asc(divisions.name));

  return Response.json({ scope: { role: scope.role, divisionId: scope.divisionId, allDivisions: scope.allDivisions }, divisions: rows });
}
