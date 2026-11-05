import { asc, eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import {
  getReportRecap,
  reportPeriodOptions,
  resolveReportPeriod,
} from "@/db/queries/reports";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import ForbiddenState from "../forbidden-state";
import ReportsClient from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage(props: {
  searchParams: Promise<{ periode?: string; divisi?: string }>;
}) {
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
  const params = await props.searchParams;
  const periods = reportPeriodOptions();
  const period = resolveReportPeriod(params.periode ?? "");
  const activeDivision =
    scope.allDivisions && params.divisi && params.divisi !== "semua"
      ? params.divisi
      : "semua";

  const recapRows = await getReportRecap(db, scope, period);
  const rows =
    activeDivision === "semua"
      ? recapRows
      : recapRows.filter((row) => row.divisionName === activeDivision);

  const divisionNames = scope.allDivisions
    ? (
        await db
          .select({ name: divisions.name })
          .from(divisions)
          .orderBy(asc(divisions.name))
      ).map((row) => row.name)
    : [];

  const divisionRows = await db
    .select({ id: divisions.id, name: divisions.name })
    .from(divisions)
    .where(eq(divisions.id, actor.divisionId))
    .limit(1);
  const userDivisionName = divisionRows[0]?.name ?? "";

  return (
    <ReportsClient
      rows={rows}
      periods={periods.map((option) => ({ key: option.key, label: option.label }))}
      activePeriodKey={period.key}
      periodLabel={period.label}
      activeDivision={activeDivision}
      divisionNames={divisionNames}
      userRole={scope.role}
      userDivisionName={userDivisionName}
    />
  );
}
