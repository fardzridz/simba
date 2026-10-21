import { eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import ForbiddenState from "../forbidden-state";
import LogsClient from "./logs-client";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  // Staf pelaksana (USER) tidak memiliki akses ke log aktivitas audit trail
  if (scope.role === "USER") {
    return (
      <ForbiddenState
        title="Akses Log Aktivitas Ditolak"
        message="Log aktivitas dan rekam jejak audit trail hanya dapat diakses oleh Admin Divisi dan Super Admin."
        supportHint="Hubungi Admin Divisimu bila Anda membutuhkan verifikasi rekam aktivitas."
        backHref="/tasks"
        backLabel="Kembali ke Tugas Saya"
      />
    );
  }

  const { db } = appContext();
  const [division] = await db
    .select({ name: divisions.name })
    .from(divisions)
    .where(eq(divisions.id, actor.divisionId))
    .limit(1);

  return (
    <LogsClient
      userRole={scope.role}
      userDivisionName={division?.name ?? "Hukum & Sengketa"}
    />
  );
}
