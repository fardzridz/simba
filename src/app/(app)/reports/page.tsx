import { eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import {
  getReport,
  getReportFilterOptions,
  readReportFilters,
  REPORT_PERIODS,
} from "@/db/queries/reports";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import ForbiddenState from "../forbidden-state";
import ReportsClient from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage(props: {
  searchParams: Promise<{
    period?: string;
    divisi?: string;
    status?: string;
    kategori?: string;
  }>;
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
  const filters = readReportFilters(params, scope);

  const [report, filterOptions, ownDivision] = await Promise.all([
    getReport(db, scope, filters),
    getReportFilterOptions(db, scope),
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
    <ReportsClient
      role={scope.role}
      report={report}
      filters={{
        period: filters.period,
        divisionId: filters.divisionId,
        status: filters.status ?? "",
        categoryId: filters.categoryId ?? "",
      }}
      periodOptions={REPORT_PERIODS}
      divisionOptions={filterOptions.divisionOptions}
      categoryOptions={filterOptions.categoryOptions}
      ownDivisionName={ownDivision?.name ?? "Divisi Anda"}
    />
  );
}
