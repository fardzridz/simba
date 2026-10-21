import { eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import ForbiddenState from "../forbidden-state";
import ReportsClient from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  // Staf pelaksana (USER) tidak memiliki akses ke modul laporan ekspor
  if (scope.role === "USER") {
    return (
      <ForbiddenState
        title="Akses Laporan Ditolak"
        message="Laporan rekapitulasi penugasan dan ekspor hanya dapat diakses oleh Admin Divisi dan Super Admin."
        supportHint="Hubungi Admin Divisimu jika Anda membutuhkan rekapitulasi dokumen pekerjaan."
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
    <ReportsClient
      userRole={scope.role}
      userDivisionName={division?.name ?? "Hukum & Sengketa"}
    />
  );
}
