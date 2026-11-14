import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import {
  ASSIGNMENT_STATUSES,
  categories,
  divisions,
  documentArchive,
  taskAssignments,
  tasks,
  users,
  type AssignmentStatus,
  type Priority,
} from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import {
  endOfJakartaDayFromDateInput,
  formatWibDate,
  JAKARTA_OFFSET_SECONDS,
  nowSeconds,
  startOfJakartaDayFromDateInput,
} from "@/lib/time";
import { isAssignmentStatus } from "@/lib/status";

/**
 * Laporan penugasan tingkat baris (bukan rekap per divisi).
 *
 * Satu baris = satu penugasan pada satu petugas. Bentuk ini dipilih karena
 * halaman laporan harus dapat menjawab "tugas siapa yang terlambat", bukan
 * hanya "divisi mana yang punya angka terlambat". Konsekuensi pentingnya:
 * tabel di layar dan berkas ekspor memakai kueri, filter, dan urutan yang sama,
 * sehingga "yang terlihat itulah yang diekspor" benar-benar berlaku.
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

/**
 * Tanggal acuan filter: kolom mana yang dibandingkan dengan rentang tanggal.
 *
 * Ini bukan pilihan gaya. Arti "laporan Oktober" bergantung padanya:
 * - `dibuat`: tugas yang DITERBITKAN di Oktober. Tugas yang dibuat September
 *   dan selesai Oktober tidak akan muncul.
 * - `selesai`: tugas yang SELESAI di Oktober, yaitu arti yang biasa dipakai
 *   laporan bulanan instansi. Tugas yang belum selesai tidak punya tanggal
 *   selesai, sehingga ia dihitung memakai tanggal dibuat; tanpa itu, pekerjaan
 *   yang masih berjalan akan hilang dari laporan bulan berjalan.
 * - `tenggat`: tugas yang TENGGATNYA jatuh di Oktober, dipakai untuk menilai
 *   beban kerja dan keterlambatan pada periode tertentu.
 */
export type ReportDateBasis = "dibuat" | "selesai" | "tenggat";

export const REPORT_DATE_BASES: { id: ReportDateBasis; label: string; hint: string }[] = [
  {
    id: "selesai",
    label: "Tanggal selesai",
    hint: "Tugas yang selesai pada rentang ini. Tugas yang belum selesai dihitung memakai tanggal dibuat.",
  },
  {
    id: "dibuat",
    label: "Tanggal dibuat",
    hint: "Tugas yang diterbitkan pada rentang ini, tanpa melihat kapan selesainya.",
  },
  {
    id: "tenggat",
    label: "Tanggal tenggat",
    hint: "Tugas yang tenggatnya jatuh pada rentang ini.",
  },
];

export const REPORT_DEFAULT_DATE_BASIS: ReportDateBasis = "selesai";

export function isReportDateBasis(value: string): value is ReportDateBasis {
  return REPORT_DATE_BASES.some((item) => item.id === value);
}

export function reportDateBasisLabel(basis: ReportDateBasis): string {
  return REPORT_DATE_BASES.find((item) => item.id === basis)?.label ?? basis;
}

export const REPORT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  BELUM_DIKERJAKAN: "Belum Dikerjakan",
  SEDANG_DIKERJAKAN: "Sedang Dikerjakan",
  MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export function assignmentStatusLabel(status: AssignmentStatus): string {
  return REPORT_STATUS_LABELS[status];
}

/** Daftar status untuk pemilih filter, termasuk Dibatalkan. */
export const REPORT_STATUS_OPTIONS: { id: AssignmentStatus; label: string }[] =
  ASSIGNMENT_STATUSES.map((status) => ({
    id: status,
    label: REPORT_STATUS_LABELS[status],
  }));

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
  /** Filter petugas; null berarti semua petugas dalam cakupan. */
  userId: string | null;
  /** Kolom tanggal yang dipakai membandingkan rentang. */
  dateBasis: ReportDateBasis;
  /**
   * Rentang tanggal kustom dalam epoch detik UTC, sudah dinormalkan ke batas
   * hari WIB [from, to]. null berarti periode preset yang dipakai.
   */
  customRange: { from: number; to: number } | null;
  /**
   * Masalah pada rentang tanggal kustom, agar antarmuka bisa menjelaskan alasan
   * filter tidak diterapkan alih-alih mengabaikannya diam-diam.
   * - `partial`: hanya satu ujung rentang yang diisi.
   * - `reversed`: tanggal mulai sesudah tanggal selesai.
   */
  rangeIssue: "partial" | "reversed" | null;
};

/**
 * Rentang efektif laporan: kustom bila sah, periode preset bila tidak.
 *
 * Satu sumber untuk kueri, label rentang, dan ekspor, sehingga ketiganya tidak
 * mungkin menyebut rentang yang berbeda. Diekspor agar bisa diuji langsung:
 * label rentang yang salah adalah cacat yang tidak terlihat dari angka saja.
 */
export function effectiveRange(
  filters: ReportFilters,
  now: number,
): { from: number; to: number; isCustom: boolean; label: string } {
  if (filters.customRange) {
    const { from, to } = filters.customRange;
    return {
      from,
      to: to + 1,
      isCustom: true,
      label: `${formatWibDate(from)} sampai ${formatWibDate(to)}`,
    };
  }
  const periodRange = reportPeriodRange(filters.period, now);
  return {
    from: periodRange.from,
    to: periodRange.to,
    isCustom: false,
    label: `${formatWibDate(periodRange.from)} sampai ${formatWibDate(periodRange.to - 1)}`,
  };
}

/**
 * Membaca dan menormalkan filter dari query URL. Halaman dan rute ekspor memakai
 * fungsi yang sama agar filter layar tidak pernah beda dengan filter ekspor.
 */
export function readReportFilters(
  input:
    | URLSearchParams
    | {
        period?: string;
        divisi?: string;
        status?: string;
        kategori?: string;
        petugas?: string;
        acuan?: string;
        dateFrom?: string;
        dateTo?: string;
      },
  scope: Scope,
): ReportFilters {
  const values =
    input instanceof URLSearchParams
      ? {
          period: input.get("period") ?? undefined,
          divisi: input.get("divisi") ?? undefined,
          status: input.get("status") ?? undefined,
          kategori: input.get("kategori") ?? undefined,
          petugas: input.get("petugas") ?? undefined,
          acuan: input.get("acuan") ?? undefined,
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
  const userId = values.petugas?.trim() || null;

  const dateBasis =
    values.acuan !== undefined && isReportDateBasis(values.acuan)
      ? values.acuan
      : REPORT_DEFAULT_DATE_BASIS;

  // Rentang tanggal kustom dibaca sebagai tanggal KALENDER WIB, memakai helper
  // yang sama dengan form tenggat tugas. Sebelumnya `new Date(...)` + `setHours`
  // menormalkan ke tengah malam zona waktu SERVER, sehingga di server non-WIB
  // batas rentangnya bergeser beberapa jam dari yang dipilih pengguna.
  const dateFromSeconds = values.dateFrom
    ? startOfJakartaDayFromDateInput(values.dateFrom)
    : null;
  const dateToSeconds = values.dateTo
    ? endOfJakartaDayFromDateInput(values.dateTo)
    : null;

  // Rentang hanya berlaku bila KEDUA ujungnya sah. Satu ujung saja tidak bisa
  // diartikan: pengguna yang baru mengisi tanggal mulai belum tentu ingin
  // "sampai hari ini", dan diam-diam menebak adalah cara paling halus untuk
  // menampilkan angka yang tidak diminta.
  const partialRange = (dateFromSeconds !== null) !== (dateToSeconds !== null);
  const hasCustomRange = dateFromSeconds !== null && dateToSeconds !== null;

  // Rentang terbalik (mulai sesudah selesai) tidak menghasilkan data apa pun dan
  // mudah terjadi saat mengetik. Ditolak sebagai rentang tidak sah, bukan
  // dibalik diam-diam, supaya pengguna melihat kesalahannya.
  const reversedRange = hasCustomRange && dateFromSeconds! > dateToSeconds!;

  const customRange =
    hasCustomRange && !reversedRange
      ? { from: dateFromSeconds!, to: dateToSeconds! }
      : null;

  return {
    period,
    divisionId,
    status,
    categoryId,
    userId,
    dateBasis,
    customRange,
    rangeIssue: reversedRange ? "reversed" : partialRange ? "partial" : null,
  };
}

/**
 * Kolom tanggal yang dibandingkan dengan rentang, sesuai `dateBasis`.
 *
 * Dinyatakan sebagai SQL karena `selesai` memakai dua kolom sekaligus
 * (`coalesce`), sehingga tidak bisa diwakili satu objek kolom Drizzle.
 */
function dateBasisColumn(basis: ReportDateBasis): SQL {
  switch (basis) {
    case "selesai":
      return sql`coalesce(${taskAssignments.completedAt}, ${tasks.createdAt})`;
    case "tenggat":
      return sql`${tasks.dueAt}`;
    case "dibuat":
      return sql`${tasks.createdAt}`;
  }
}

/**
 * Syarat kueri bersama untuk layar dan ekspor.
 *
 * Perbandingan memakai epoch detik (integer), bukan objek Date: kolom waktu di
 * SQLite disimpan sebagai detik, dan mengikat Date mentah ke SQL berisiko
 * ditafsirkan sebagai milidetik.
 */
function reportWhere(scope: Scope, filters: ReportFilters): SQL {
  const { from, to } = effectiveRange(filters, nowSeconds());
  const column = dateBasisColumn(filters.dateBasis);

  const conditions: SQL[] = [sql`${column} >= ${from}`, sql`${column} < ${to}`];

  const divisionId = scope.allDivisions ? filters.divisionId : scope.divisionId;
  if (divisionId) conditions.push(eq(tasks.divisionId, divisionId));
  if (filters.status) conditions.push(eq(taskAssignments.status, filters.status));
  if (filters.categoryId) conditions.push(eq(tasks.categoryId, filters.categoryId));
  if (filters.userId) conditions.push(eq(taskAssignments.userId, filters.userId));

  return and(...conditions)!;
}

export type ReportRow = {
  assignmentId: string;
  taskId: string;
  taskNumber: string;
  title: string;
  categoryName: string;
  divisionName: string;
  divisionCode: string;
  staffName: string;
  staffNip: string | null;
  staffPosition: string | null;
  priority: Priority;
  status: AssignmentStatus;
  revisionCount: number;
  /** Epoch detik. */
  dueAt: number;
  /** Epoch detik; null bila belum selesai. */
  completedAt: number | null;
  archived: boolean;
};

export type ReportSummary = {
  total: number;
  completed: number;
  /** Selesai SETELAH tenggat. Tugas yang belum selesai tidak dihitung di sini. */
  late: number;
  /** Belum selesai dan tenggatnya sudah lewat saat laporan dibuat. */
  overdue: number;
  cancelled: number;
  archived: number;
};

export type ReportRowsResult = {
  rows: ReportRow[];
  total: number;
  page: number;
  pageSize: ReportPageSize;
  totalPages: number;
  summary: ReportSummary;
  period: ReportPeriod;
  periodLabel: string;
  dateBasis: ReportDateBasis;
  dateBasisLabel: string;
  rangeLabel: string;
  isCustomRange: boolean;
  rangeIssue: "partial" | "reversed" | null;
  scopeLabels: {
    division: string;
    status: string;
    category: string;
    staff: string;
  };
};

export const REPORT_PAGE_SIZES = [25, 50, 100] as const;
export type ReportPageSize = (typeof REPORT_PAGE_SIZES)[number];
export const REPORT_DEFAULT_PAGE_SIZE: ReportPageSize = 25;

export function readReportPage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function readReportPageSize(value: string | undefined): ReportPageSize {
  const parsed = Number(value);
  return (REPORT_PAGE_SIZES as readonly number[]).includes(parsed)
    ? (parsed as ReportPageSize)
    : REPORT_DEFAULT_PAGE_SIZE;
}

/** Ukuran halaman terbesar; dipakai ekspor agar satu kueri memuat lebih banyak. */
export const REPORT_MAX_PAGE_SIZE: ReportPageSize = 100;

/**
 * Urutan baris: terbaru lebih dulu, lalu nomor tugas, lalu nama petugas.
 * Tiga kunci dipakai supaya halaman tidak pernah menampilkan baris yang sama
 * dua kali atau melewatkan baris saat dua tugas punya waktu dibuat identik.
 */
function reportOrder(): SQL[] {
  return [
    desc(tasks.createdAt),
    asc(tasks.taskNumber),
    asc(users.fullName),
    asc(taskAssignments.id),
  ];
}

/**
 * Satu kueri daftar + satu kueri hitung + satu kueri ringkasan, semuanya memakai
 * syarat yang sama. Ringkasan dihitung dari SELURUH hasil filter, bukan dari
 * halaman yang sedang tampil: angka "total 128" tidak boleh berubah menjadi
 * "total 25" hanya karena pengguna berada di halaman pertama.
 */
async function queryReport(
  db: Db,
  scope: Scope,
  filters: ReportFilters,
  window: { limit: number; offset: number },
): Promise<{
  rows: ReportRow[];
  total: number;
  summary: ReportSummary;
  isCustom: boolean;
  rangeLabel: string;
  divisionName: string | null;
  categoryName: string | null;
  staffName: string | null;
}> {
  const { isCustom, label: rangeLabel } = effectiveRange(filters, nowSeconds());
  const whereClause = reportWhere(scope, filters);
  const now = nowSeconds();

  const [rawRows, totalRow, summaryRow, divisionRow, categoryRow, staffRow] =
    await Promise.all([
      db
        .select({
          assignmentId: taskAssignments.id,
          taskId: tasks.id,
          taskNumber: tasks.taskNumber,
          title: tasks.title,
          categoryName: categories.name,
          divisionName: divisions.name,
          divisionCode: divisions.code,
          staffName: users.fullName,
          staffNip: users.nip,
          staffPosition: users.position,
          priority: tasks.priority,
          status: taskAssignments.status,
          revisionCount: taskAssignments.revisionCount,
          dueAt: tasks.dueAt,
          completedAt: taskAssignments.completedAt,
          // Arsip unik per penugasan (indeks unik assignment_id), sehingga
          // left join ini tidak pernah menggandakan baris.
          archiveId: documentArchive.id,
        })
        .from(taskAssignments)
        .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
        .innerJoin(users, eq(users.id, taskAssignments.userId))
        .innerJoin(divisions, eq(divisions.id, tasks.divisionId))
        .innerJoin(categories, eq(categories.id, tasks.categoryId))
        .leftJoin(documentArchive, eq(documentArchive.assignmentId, taskAssignments.id))
        .where(whereClause)
        .orderBy(...reportOrder())
        .limit(window.limit)
        .offset(window.offset),
      db
        .select({ total: count() })
        .from(taskAssignments)
        .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
        .where(whereClause),
      db
        .select({
          total: count(),
          completed: sql<number>`sum(case when ${taskAssignments.status} = 'SELESAI' then 1 else 0 end)`,
          late: sql<number>`sum(case when ${taskAssignments.status} = 'SELESAI' and ${taskAssignments.completedAt} is not null and ${taskAssignments.completedAt} > ${tasks.dueAt} then 1 else 0 end)`,
          overdue: sql<number>`sum(case when ${taskAssignments.status} not in ('SELESAI', 'DIBATALKAN') and ${tasks.dueAt} < ${now} then 1 else 0 end)`,
          cancelled: sql<number>`sum(case when ${taskAssignments.status} = 'DIBATALKAN' then 1 else 0 end)`,
          archived: sql<number>`sum(case when ${documentArchive.id} is not null then 1 else 0 end)`,
        })
        .from(taskAssignments)
        .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
        .leftJoin(documentArchive, eq(documentArchive.assignmentId, taskAssignments.id))
        .where(whereClause),
      filters.divisionId || !scope.allDivisions
        ? db
            .select({ name: divisions.name })
            .from(divisions)
            .where(
              eq(divisions.id, (scope.allDivisions ? filters.divisionId : scope.divisionId)!),
            )
            .limit(1)
        : Promise.resolve([] as { name: string }[]),
      filters.categoryId
        ? db
            .select({ name: categories.name })
            .from(categories)
            .where(eq(categories.id, filters.categoryId))
            .limit(1)
        : Promise.resolve([] as { name: string }[]),
      filters.userId
        ? db
            .select({ name: users.fullName })
            .from(users)
            .where(eq(users.id, filters.userId))
            .limit(1)
        : Promise.resolve([] as { name: string }[]),
    ]);

  const rows: ReportRow[] = rawRows.map((row) => ({
    assignmentId: row.assignmentId,
    taskId: row.taskId,
    taskNumber: row.taskNumber,
    title: row.title,
    categoryName: row.categoryName,
    divisionName: row.divisionName,
    divisionCode: row.divisionCode,
    staffName: row.staffName,
    staffNip: row.staffNip,
    staffPosition: row.staffPosition,
    priority: row.priority,
    status: row.status,
    revisionCount: row.revisionCount,
    dueAt: Math.floor(row.dueAt.getTime() / 1000),
    completedAt: row.completedAt ? Math.floor(row.completedAt.getTime() / 1000) : null,
    archived: row.archiveId !== null,
  }));

  return {
    rows,
    total: Number(totalRow[0]?.total ?? 0),
    summary: {
      total: Number(summaryRow[0]?.total ?? 0),
      completed: Number(summaryRow[0]?.completed ?? 0),
      late: Number(summaryRow[0]?.late ?? 0),
      overdue: Number(summaryRow[0]?.overdue ?? 0),
      cancelled: Number(summaryRow[0]?.cancelled ?? 0),
      archived: Number(summaryRow[0]?.archived ?? 0),
    },
    isCustom,
    rangeLabel,
    divisionName: divisionRow[0]?.name ?? null,
    categoryName: categoryRow[0]?.name ?? null,
    staffName: staffRow[0]?.name ?? null,
  };
}

/** Susun hasil lengkap untuk satu halaman layar. */
export async function getReportRows(
  db: Db,
  scope: Scope,
  filters: ReportFilters,
  paging: { page: number; pageSize: ReportPageSize },
): Promise<ReportRowsResult> {
  const page = Math.max(1, Math.floor(paging.page));
  const pageSize = paging.pageSize;

  const result = await queryReport(db, scope, filters, {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    rows: result.rows,
    total: result.total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    summary: result.summary,
    period: filters.period,
    periodLabel: reportPeriodLabel(filters.period),
    dateBasis: filters.dateBasis,
    dateBasisLabel: reportDateBasisLabel(filters.dateBasis),
    rangeLabel: result.rangeLabel,
    isCustomRange: result.isCustom,
    rangeIssue: filters.rangeIssue,
    scopeLabels: {
      division:
        result.divisionName ?? (scope.allDivisions ? "Semua divisi" : "Divisi Anda"),
      status: filters.status ? REPORT_STATUS_LABELS[filters.status] : "Semua status",
      category: result.categoryName ?? "Semua kategori",
      staff: result.staffName ?? "Semua petugas",
    },
  };
}

/**
 * Susun hasil untuk ekspor: SELURUH baris hasil filter dalam satu kueri.
 *
 * Sengaja tidak memakai `getReportRows` berulang per halaman. Untuk 5.000 baris,
 * cara itu berarti 50 kueri dan 50 kali penghitungan ringkasan yang hasilnya
 * dibuang, sehingga ekspor menjadi lambat dan mahal tanpa manfaat.
 */
export async function getReportExport(
  db: Db,
  scope: Scope,
  filters: ReportFilters,
  limit: number,
): Promise<ReportRowsResult> {
  const result = await queryReport(db, scope, filters, { limit, offset: 0 });

  return {
    rows: result.rows,
    total: result.total,
    page: 1,
    pageSize: REPORT_MAX_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(result.total / REPORT_MAX_PAGE_SIZE)),
    summary: result.summary,
    period: filters.period,
    periodLabel: reportPeriodLabel(filters.period),
    dateBasis: filters.dateBasis,
    dateBasisLabel: reportDateBasisLabel(filters.dateBasis),
    rangeLabel: result.rangeLabel,
    isCustomRange: result.isCustom,
    rangeIssue: filters.rangeIssue,
    scopeLabels: {
      division:
        result.divisionName ?? (scope.allDivisions ? "Semua divisi" : "Divisi Anda"),
      status: filters.status ? REPORT_STATUS_LABELS[filters.status] : "Semua status",
      category: result.categoryName ?? "Semua kategori",
      staff: result.staffName ?? "Semua petugas",
    },
  };
}

/**
 * Daftar opsi filter untuk layar laporan.
 *
 * Kategori memuat semua kategori meski nonaktif, karena tugas lama bisa
 * memakainya. Petugas dibatasi pada divisi yang sedang dilihat agar Admin
 * tidak melihat nama staf divisi lain.
 */
export async function getReportFilterOptions(
  db: Db,
  scope: Scope,
  divisionId: string | null,
): Promise<{
  divisionOptions: { id: string; name: string }[];
  categoryOptions: { id: string; name: string }[];
  staffOptions: { id: string; name: string }[];
}> {
  const effectiveDivisionId = scope.allDivisions ? divisionId : scope.divisionId;

  const [divisionOptions, categoryOptions, staffOptions] = await Promise.all([
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
    db
      .select({ id: users.id, name: users.fullName })
      .from(users)
      .where(
        effectiveDivisionId
          ? and(eq(users.divisionId, effectiveDivisionId), eq(users.isActive, true))
          : eq(users.isActive, true),
      )
      .orderBy(users.fullName),
  ]);

  return { divisionOptions, categoryOptions, staffOptions };
}
