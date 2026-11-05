import { and, eq, gte, lte } from "drizzle-orm";
import type { Db } from "@/env";
import { documentArchive, divisions, taskAssignments, tasks } from "@/db/schema";
import type { Scope } from "@/lib/auth/scope";
import {
  JAKARTA_OFFSET_SECONDS,
  isOverdue,
  nowSeconds,
  startOfJakartaDay,
} from "@/lib/time";

export type ReportPeriod = {
  key: string;
  label: string;
  startEpoch: number;
  endEpoch: number;
};

export type ReportRecapRow = {
  divisionId: string;
  divisionName: string;
  divisionCode: string;
  totalAssignments: number;
  completed: number;
  onTime: number;
  overdue: number;
  finalDocuments: number;
  cancelled: number;
};

const MONTH_NAMES_LONG = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function jakartaDateParts(epochSeconds: number) {
  const shifted = new Date((epochSeconds + JAKARTA_OFFSET_SECONDS) * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** Epoch detik dari tanggal 00:00 WIB pada bagian tanggal Jakarta yang diberikan. */
function jakartaDayStartOf(year: number, month: number, day: number): number {
  const utcMidnight = Date.UTC(year, month, day, 0, 0, 0);
  return Math.floor(utcMidnight / 1000) - JAKARTA_OFFSET_SECONDS;
}

/**
 * Pilihan periode laporan dihitung dari jam Jakarta saat halaman dibuka:
 * batas periode selalu tanggal 1 pada pukul 00:00 WIB, batas akhir "berjalan"
 * adalah detik ini, bukan angka yang mengeras.
 */
export function reportPeriodOptions(now = nowSeconds()): ReportPeriod[] {
  const { year, month } = jakartaDateParts(now);
  const today = startOfJakartaDay(now);

  const thisMonthStart = jakartaDayStartOf(year, month, 1);
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthStart = jakartaDayStartOf(prevMonthYear, prevMonth, 1);
  const thisMonthStartAgain = jakartaDayStartOf(year, month, 1);
  const quarterStartMonth = month - (month % 3);
  const quarterStart = jakartaDayStartOf(year, quarterStartMonth, 1);
  const yearStart = jakartaDayStartOf(year, 0, 1);

  const rangeLabel = (startEpoch: number, endEpoch: number) => {
    const from = jakartaDateParts(startEpoch);
    const to = jakartaDateParts(endEpoch);
    return `${from.day} ${MONTH_NAMES_LONG[from.month]} sampai ${to.day} ${MONTH_NAMES_LONG[to.month]} ${to.year}`;
  };

  return [
    {
      key: "bulan_berjalan",
      label: `Bulan berjalan (${rangeLabel(thisMonthStart, today)})`,
      startEpoch: thisMonthStart,
      endEpoch: now,
    },
    {
      key: "bulan_lalu",
      label: `Bulan lalu (${rangeLabel(prevMonthStart, thisMonthStartAgain - 1)})`,
      startEpoch: prevMonthStart,
      endEpoch: thisMonthStartAgain - 1,
    },
    {
      key: "triwulan_berjalan",
      label: `Triwulan berjalan (${rangeLabel(quarterStart, today)})`,
      startEpoch: quarterStart,
      endEpoch: now,
    },
    {
      key: "tahun_berjalan",
      label: `Tahun berjalan (${rangeLabel(yearStart, today)})`,
      startEpoch: yearStart,
      endEpoch: now,
    },
  ];
}

export function resolveReportPeriod(key: string, now = nowSeconds()): ReportPeriod {
  const options = reportPeriodOptions(now);
  return options.find((option) => option.key === key) ?? options[0]!;
}

/**
 * Rekap per divisi untuk satu periode (§7.1, UC12): penugasan dihitung dari
 * tugas yang dibuat dalam periode, terlambat memakai keadaan hari ini,
 * dokumen final dihitung dari baris arsip penugasan yang sama.
 */
export async function getReportRecap(
  db: Db,
  scope: Scope,
  period: ReportPeriod,
): Promise<ReportRecapRow[]> {
  const scopeFilter = scope.allDivisions
    ? undefined
    : eq(tasks.divisionId, scope.divisionId);

  const rows = await db
    .select({
      divisionId: divisions.id,
      divisionName: divisions.name,
      divisionCode: divisions.code,
      status: taskAssignments.status,
      completedAt: taskAssignments.completedAt,
      dueAt: tasks.dueAt,
      archiveId: documentArchive.id,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .innerJoin(divisions, eq(divisions.id, tasks.divisionId))
    .leftJoin(documentArchive, eq(documentArchive.assignmentId, taskAssignments.id))
    .where(
      and(
        gte(tasks.createdAt, new Date(period.startEpoch * 1000)),
        lte(tasks.createdAt, new Date(period.endEpoch * 1000)),
        scopeFilter,
      ),
    );

  const now = nowSeconds();
  const byDivision = new Map<string, ReportRecapRow>();
  for (const row of rows) {
    let recap = byDivision.get(row.divisionId);
    if (!recap) {
      recap = {
        divisionId: row.divisionId,
        divisionName: row.divisionName,
        divisionCode: row.divisionCode,
        totalAssignments: 0,
        completed: 0,
        onTime: 0,
        overdue: 0,
        finalDocuments: 0,
        cancelled: 0,
      };
      byDivision.set(row.divisionId, recap);
    }

    if (row.status === "DIBATALKAN") {
      recap.cancelled += 1;
      continue;
    }
    recap.totalAssignments += 1;
    if (row.status === "SELESAI") {
      recap.completed += 1;
      if (row.completedAt && row.completedAt.getTime() <= row.dueAt.getTime()) {
        recap.onTime += 1;
      }
    }
    if (
      isOverdue({
        dueAt: row.dueAt.getTime() / 1000,
        status: row.status,
        now,
      })
    ) {
      recap.overdue += 1;
    }
    if (row.archiveId) {
      recap.finalDocuments += 1;
    }
  }

  return Array.from(byDivision.values()).sort((a, b) =>
    a.divisionName.localeCompare(b.divisionName),
  );
}
