import { and, count, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import {
  ASSIGNMENT_STATUSES,
  categories,
  divisions,
  documentArchive,
  taskAssignments,
  tasks,
  type AssignmentStatus,
} from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import { formatWibDate, JAKARTA_OFFSET_SECONDS, nowSeconds } from "@/lib/time";
import { isAssignmentStatus } from "@/lib/status";

/**
 * Rekapitulasi laporan (§7.1): satuan penugasan (assignment). Periode memfiltrasi
 * penugasan yang diterbitkan (tasks.created_at) dalam rentang WIB [from, to),
 * seluruh metrik dihitung atas himpunan yang sama sehingga layar dan ekspor
 * selalu memuat angka identik.
 */
export type ReportPeriod = "bulan_ini" | "bulan_lalu" | "triwulan_lalu" | "tahun_ini";

export const REPORT_PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "bulan_ini", label: "Bulan berjalan" },
  { id: "bulan_lalu", label: "Bulan lalu" },
  { id: "triwulan_lalu", label: "Triwulan lalu" },
  { id: "tahun_ini", label: "Tahun berjalan" },
];

export const REPORT_DEFAULT_PERIOD: ReportPeriod = "bulan_ini";

export function isReportPeriod(value: string): value is ReportPeriod {
  return REPORT_PERIODS.some((item) => item.id === value);
}

export function reportPeriodLabel(period: ReportPeriod): string {
  return REPORT_PERIODS.find((item) => item.id === period)?.label ?? period;
}

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  BELUM_DIKERJAKAN: "Belum Dikerjakan",
  SEDANG_DIKERJAKAN: "Sedang Dikerjakan",
  MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

/**
 * Batas periode WIB [from, to) dalam epoch detik UTC. WIB tidak pernah berubah
 * (tanpa DST), jadi menggeser ke "waktu lokal", menormalkan lewat Date.UTC,
 * lalu menggeser balik selalu benar termasuk lintas tahun.
 */
function wibMonthStart(year: number, month0: number): number {
  return (Date.UTC(year, month0, 1) as number) / 1000 - JAKARTA_OFFSET_SECONDS;
}

export function reportPeriodRange(
  period: ReportPeriod,
  now: number,
): { from: number; to: number } {
  const shifted = new Date((now + JAKARTA_OFFSET_SECONDS) * 1000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const quarterStartMonth = month - (month % 3);

  switch (period) {
    case "bulan_ini":
      return { from: wibMonthStart(year, month), to: wibMonthStart(year, month + 1) };
    case "bulan_lalu":
      return { from: wibMonthStart(year, month - 1), to: wibMonthStart(year, month) };
    case "triwulan_lalu":
      return {
        from: wibMonthStart(year, quarterStartMonth - 3),
        to: wibMonthStart(year, quarterStartMonth),
      };
    case "tahun_ini":
      return { from: wibMonthStart(year, 0), to: wibMonthStart(year + 1, 0) };
  }
}

export type ReportFilters = {
  period: ReportPeriod;
  /** null berarti semua divisi; hanya Super Admin yang boleh memilih selain divisinya. */
  divisionId: string | null;
  status: AssignmentStatus | null;
  categoryId: string | null;
  /** Custom date range overrides period if provided */
  dateFrom?: Date | null;
  dateTo?: Date | null;
};

export type ReportSummary = {
  totalAssignments: number;
  completed: number;
  onTime: number;
  overdue: number;
  cancelled: number;
  finalDocuments: number;
};

export type ReportDivisionRow = {
  divisionId: string;
  divisionName: string;
  divisionCode: string;
  totalAssignments: number;
  completed: number;
  overdue: number;
  finalDocuments: number;
};

export type ReportView = {
  period: ReportPeriod;
  periodLabel: string;
  rangeLabel: string;
  summary: ReportSummary;
  rows: ReportDivisionRow[];
  scopeLabels: {
    division: string;
    status: string;
    category: string;
  };
};

/**
 * Membaca dan menormalkan filter dari query URL. Halaman dan rute ekspor memakai
 * fungsi yang sama agar filter layar tidak pernah beda dengan filter ekspor.
 */
export function readReportFilters(
  input: URLSearchParams | { period?: string; divisi?: string; status?: string; kategori?: string; dateFrom?: string; dateTo?: string },
  scope: Scope,
): ReportFilters {
  const values =
    input instanceof URLSearchParams
      ? {
          period: input.get("period") ?? undefined,
          divisi: input.get("divisi") ?? undefined,
          status: input.get("status") ?? undefined,
          kategori: input.get("kategori") ?? undefined,
          dateFrom: input.get("dateFrom") ?? undefined,
          dateTo: input.get("dateTo") ?? undefined,
        }
      : input;

  const period =
    values.period !== undefined && isReportPeriod(values.period)
      ? values.period
      : REPORT_DEFAULT_PERIOD;

  // Super Admin boleh memilih semua (kosong) atau satu divisi; Admin/Card lain terikat divisi sendiri.
  const requestedDivision = values.divisi?.trim() || null;
  const divisionId = scope.allDivisions ? requestedDivision : scope.divisionId;

  const status =
    values.status !== undefined && values.status !== "" && isAssignmentStatus(values.status)
      ? values.status
      : null;

  const categoryId = values.kategori?.trim() || null;

  // Parse custom date range if provided
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;
  
  if (values.dateFrom) {
    try {
      dateFrom = new Date(values.dateFrom);
      // Normalize to midnight WIB
      dateFrom.setHours(0, 0, 0, 0);
    } catch (e) {
      console.error("Invalid dateFrom:", values.dateFrom);
    }
  }
  
  if (values.dateTo) {
    try {
      dateTo = new Date(values.dateTo);
      // Add one day to include full end date
      dateTo.setHours(23, 59, 59, 999);
    } catch (e) {
      console.error("Invalid dateTo:", values.dateTo);
    }
  }

  return { period, divisionId, status, categoryId, dateFrom, dateTo };
}

function reportWhere(scope: Scope, filters: ReportFilters): SQL {
  let from: number;
  let to: number;
  
  // If custom date range is provided, use it; otherwise use period-based range
  if (filters.dateFrom && filters.dateTo) {
    from = Math.floor(filters.dateFrom.getTime() / 1000);
    to = Math.ceil(filters.dateTo.getTime() / 1000) + 1;
  } else {
    const periodRange = reportPeriodRange(filters.period, nowSeconds());
    from = periodRange.from;
    to = periodRange.to;
  }
  
  const conditions: SQL[] = [
    gte(tasks.createdAt, new Date(from * 1000)),
    lt(tasks.createdAt, new Date(to * 1000)),
  ];

  const divisionId = scope.allDivisions ? filters.divisionId : scope.divisionId;
  if (divisionId) conditions.push(eq(tasks.divisionId, divisionId));
  if (filters.status) conditions.push(eq(taskAssignments.status, filters.status));
  if (filters.categoryId) conditions.push(eq(tasks.categoryId, filters.categoryId));

  return and(...conditions)!;
}

/**
 * Kumpulan angka laporan yang dihitung lewat dua kueri agregasi (penugasan dan
 * arsip), lalu digabung atas daftar divisi lengkap sehingga divisi tanpa data
 * tampil dengan 0, bukan dihilangkan.
 */
export async function getReport(
  db: Db,
  scope: Scope,
  filters: ReportFilters,
): Promise<ReportView> {
  const { from, to } = reportPeriodRange(filters.period, nowSeconds());
  const whereClause = reportWhere(scope, filters);
  const now = nowSeconds();

  const [assignmentRows, archiveRows, divisionRows, categoryRow] = await Promise.all([
    db
      .select({
        divisionId: tasks.divisionId,
        total: count(),
        completed: sql<number>`sum(case when ${taskAssignments.status} = 'SELESAI' then 1 else 0 end)`,
        onTime: sql<number>`sum(case when ${taskAssignments.status} = 'SELESAI' and ${taskAssignments.completedAt} is not null and ${taskAssignments.completedAt} <= ${tasks.dueAt} then 1 else 0 end)`,
        cancelled: sql<number>`sum(case when ${taskAssignments.status} = 'DIBATALKAN' then 1 else 0 end)`,
        overdue: sql<number>`sum(case when ${tasks.dueAt} < ${now} and ${taskAssignments.status} not in ('SELESAI', 'DIBATALKAN') then 1 else 0 end)`,
      })
      .from(taskAssignments)
      .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
      .where(whereClause)
      .groupBy(tasks.divisionId),
    db
      .select({
        divisionId: documentArchive.divisionId,
        total: count(),
      })
      .from(documentArchive)
      .innerJoin(taskAssignments, eq(documentArchive.assignmentId, taskAssignments.id))
      .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
      .where(whereClause)
      .groupBy(documentArchive.divisionId),
    db
      .select({
        id: divisions.id,
        name: divisions.name,
        code: divisions.code,
      })
      .from(divisions)
      .where(scope.allDivisions ? undefined : eq(divisions.id, scope.divisionId))
      .orderBy(divisions.name),
    filters.categoryId
      ? db
          .select({ name: categories.name })
          .from(categories)
          .where(eq(categories.id, filters.categoryId))
          .limit(1)
      : Promise.resolve([] as { name: string }[]),
  ]);

  const assignmentsByDivision = new Map(
    assignmentRows.map((row) => [
      row.divisionId,
      {
        total: Number(row.total),
        completed: Number(row.completed),
        onTime: Number(row.onTime),
        cancelled: Number(row.cancelled),
        overdue: Number(row.overdue),
      },
    ]),
  );
  const archiveByDivision = new Map(
    archiveRows.map((row) => [row.divisionId, Number(row.total)]),
  );

  const rows: ReportDivisionRow[] = divisionRows.map((division) => {
    const aggregate = assignmentsByDivision.get(division.id) ?? {
      total: 0,
      completed: 0,
      onTime: 0,
      cancelled: 0,
      overdue: 0,
    };
    return {
      divisionId: division.id,
      divisionName: division.name,
      divisionCode: division.code,
      totalAssignments: aggregate.total,
      completed: aggregate.completed,
      overdue: aggregate.overdue,
      finalDocuments: archiveByDivision.get(division.id) ?? 0,
    };
  });

  const summary: ReportSummary = {
    totalAssignments: rows.reduce((sum, row) => sum + row.totalAssignments, 0),
    completed: rows.reduce((sum, row) => sum + row.completed, 0),
    onTime: assignmentRows.reduce((sum: number, row) => sum + Number(row.onTime), 0),
    cancelled: assignmentRows.reduce((sum: number, row) => sum + Number(row.cancelled), 0),
    overdue: rows.reduce((sum, row) => sum + row.overdue, 0),
    finalDocuments: rows.reduce((sum, row) => sum + row.finalDocuments, 0),
  };

  let divisionLabel = "Semua divisi";
  if (!scope.allDivisions || filters.divisionId) {
    const match = divisionRows.find(
      (d) => d.id === (scope.allDivisions ? filters.divisionId : scope.divisionId),
    );
    if (match) divisionLabel = match.name;
  }

  return {
    period: filters.period,
    periodLabel: reportPeriodLabel(filters.period),
    rangeLabel: `${formatWibDate(from)} sampai ${formatWibDate(to - 1)}`,
    summary,
    rows,
    scopeLabels: {
      division: divisionLabel,
      status: filters.status ? STATUS_LABELS[filters.status] : "Semua status",
      category: categoryRow[0]?.name ?? "Kategori: semua",
    },
  };
}

/**
 * Daftar opsi filter untuk layar laporan: divisi (nanti Super Admin saja) dan
 * semua kategori meski nonaktif, karena tugas lama bisa memakainya.
 */
export async function getReportFilterOptions(
  db: Db,
  scope: Scope,
): Promise<{
  divisionOptions: { id: string; name: string }[];
  categoryOptions: { id: string; name: string }[];
}> {
  const [divisionOptions, categoryOptions] = await Promise.all([
    scope.allDivisions
      ? db
          .select({ id: divisions.id, name: divisions.name })
          .from(divisions)
          .orderBy(divisions.name)
      : Promise.resolve([] as { id: string; name: string }[]),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(categories.name),
  ]);
  return { divisionOptions, categoryOptions };
}

/** Label status kanonik untuk header cetak dan ekspor. */
export function assignmentStatusLabel(status: AssignmentStatus): string {
  return STATUS_LABELS[status];
}

/** Jaga agar daftar status boleh dipakai modul lain tanpa merefer schema langsung. */
export const REPORT_STATUS_OPTIONS = ASSIGNMENT_STATUSES;
