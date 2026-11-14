import {
  getReportFilterOptions,
  getReportRows,
  readReportFilters,
  readReportPage,
  readReportPageSize,
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
    petugas?: string;
    acuan?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  // Staf pelaksana (USER) tidak memiliki akses ke modul laporan ekspor
  if (scope.role === "USER") {
    return (
      <ForbiddenState
        title="Akses Laporan Ditolak"
        message="Laporan penugasan dan ekspor hanya dapat diakses oleh Admin Divisi dan Super Admin."
        supportHint="Hubungi Admin Divisimu jika Anda membutuhkan rekapitulasi dokumen pekerjaan."
        backHref="/tasks"
        backLabel="Kembali ke Tugas Saya"
      />
    );
  }

  const { db } = appContext();
  const params = await props.searchParams;

  const filters = readReportFilters(params, scope);
  const paging = {
    page: readReportPage(params.page),
    pageSize: readReportPageSize(params.perPage),
  };

  const [report, filterOptions] = await Promise.all([
    getReportRows(db, scope, filters, paging),
    getReportFilterOptions(db, scope, filters.divisionId),
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
        userId: filters.userId ?? "",
        dateBasis: filters.dateBasis,
        // Tanggal dikirim balik sebagai YYYY-MM-DD apa adanya dari URL, bukan
        // diturunkan dari objek Date: konversi bolak-balik lewat UTC bisa
        // menggeser tanggal satu hari terhadap yang dipilih pengguna.
        dateFrom: params.dateFrom ?? "",
        dateTo: params.dateTo ?? "",
      }}
      paging={{ page: report.page, pageSize: report.pageSize }}      periodOptions={REPORT_PERIODS}
      divisionOptions={filterOptions.divisionOptions}
      categoryOptions={filterOptions.categoryOptions}
      staffOptions={filterOptions.staffOptions}
    />
  );
}
