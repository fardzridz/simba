import { eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import {
  getActivityLogList,
  LOG_ACTION_CLASSES,
  LOG_ENTITY_TYPES,
} from "@/db/queries/logs";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import { nowSeconds } from "@/lib/time";
import ForbiddenState from "../forbidden-state";
import LogsClient from "./logs-client";

export const dynamic = "force-dynamic";

const PERIODE_DURATIONS = new Map<string, number>([
  ["7", 7],
  ["30", 30],
  ["90", 90],
]);

export default async function LogsPage(props: {
  searchParams: Promise<{
    q?: string;
    aksi?: string;
    entitas?: string;
    periode?: string;
    page?: string;
  }>;
}) {
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
  const params = await props.searchParams;

  const q = params.q?.trim() || undefined;
  const aksi = params.aksi?.trim() || undefined;
  const entitas = params.entitas?.trim() || undefined;
  const page = Math.max(1, Number(params.page) || 1);

  // Preset periode bergerak: batas bawah rentang dihitung di server sehingga
  // filter benar-benar di klausa WHERE, bukan disaring di memori.
  const periodeDays = PERIODE_DURATIONS.get(params.periode ?? "");
  const dari = periodeDays ? nowSeconds() - periodeDays * 86_400 : undefined;

  const [result, ownDivision] = await Promise.all([
    getActivityLogList(db, scope, { q, aksi, entitas, dari, page }),
    scope.allDivisions
      ? Promise.resolve(null)
      : db
          .select({ name: divisions.name })
          .from(divisions)
          .where(eq(divisions.id, scope.divisionId))
          .limit(1)
          .then((rows) => rows[0] ?? null),
  ]);

  return (
    <LogsClient
      userRole={scope.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"}
      userDivisionName={ownDivision?.name ?? "divisi Anda"}
      items={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      filters={{
        q: q ?? "",
        aksi: aksi ?? "",
        entitas: entitas ?? "",
        periode: params.periode ?? "",
      }}
      actionOptions={LOG_ACTION_CLASSES.map((cls) => ({ id: cls.id, label: cls.label }))}
      entityOptions={LOG_ENTITY_TYPES}
    />
  );
}
