import { and, asc, count, desc, eq, gte, inArray, like, or, type SQL } from "drizzle-orm";
import {
  attachments,
  categories,
  divisions,
  documentArchive,
  taskAssignments,
  taskSubmissions,
  tasks,
  users,
} from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import { formatBytes } from "@/lib/format";
import { formatWibDate, formatJakartaNotification, nowSeconds } from "@/lib/time";

/**
 * Katalog dokumen final (UC11). Satu baris = satu baris `document_archive`,
 * yaitu satu penugasan (tugas + penerima) yang sudah disetujui admin. Kelola
 * versi dirangkai lewat `task_submissions` (state COMMITTED, versi final) dan
 * berkas lewat `attachments` COMMITTED yang diunduh lewat route server.
 */

export type CatalogFile = {
  id: string;
  name: string;
  sizeFormatted: string;
  checksum: string;
  downloadUrl: string;
};

export type CatalogItem = {
  id: string;
  taskId: string;
  taskNumber: string;
  title: string;
  categoryName: string;
  divisionId: string;
  divisionName: string;
  divisionCode: string;
  recipientName: string;
  archivedDateFormatted: string;
  archivedDateTimeFormatted: string;
  archivedDaysAgo: number;
  submissionVersion: number;
  files: CatalogFile[];
};

export type CatalogFilters = {
  q?: string;
  categoryId?: string;
  /** Preset usia arsip dalam hari: 30, 90, 365. */
  umurHari?: number;
  /** Hanya dipakai Super Admin; role lain dibatasi divisinya di klausa ini. */
  divisionId?: string;
  page?: number;
  pageSize?: number;
};

export type CatalogResult = {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Preset usia arsip di layar; page memvalidasi terhadap daftar ini. */
export const CATALOG_AGE_PRESETS = [30, 90, 365] as const;

function catalogWhere(scope: Scope, filters: CatalogFilters): SQL | undefined {
  const conditions: SQL[] = [];

  // Cakupan peran di level SQL (§9.3): Admin dibatasi divisinya, Super Admin
  // boleh semuanya atau satu divisi pilihan.
  const divisionId = scope.allDivisions ? filters.divisionId : scope.divisionId;
  if (divisionId) conditions.push(eq(documentArchive.divisionId, divisionId));

  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        like(documentArchive.title, term),
        like(tasks.taskNumber, term),
        like(users.fullName, term),
      )!,
    );
  }

  if (filters.categoryId) {
    conditions.push(eq(tasks.categoryId, filters.categoryId));
  }

  if (filters.umurHari && filters.umurHari > 0) {
    const cutoff = nowSeconds() - filters.umurHari * 86_400;
    conditions.push(gte(documentArchive.archivedAt, new Date(cutoff * 1000)));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/** Urutan katalog: terbaru di atas, id arsip sebagai pemecah urutan yang setara. */
const CATALOG_ORDER = [desc(documentArchive.archivedAt), desc(documentArchive.id)] as const;

/**
 * Daftar dokumen final dari baris `document_archive` nyata, terpaginasi sama
 * seperti daftar lain (25 per halaman, filter di klausa WHERE). Berkas halaman
 * aktif diambil kueri kedua agar jumlah parameter terikat tetap di bawah 100.
 */
export async function getDocumentCatalog(
  db: Db,
  scope: Scope,
  filters: CatalogFilters = {},
): Promise<CatalogResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 25);
  const whereClause = catalogWhere(scope, filters);

  const [totalRows, rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(documentArchive)
      .innerJoin(taskAssignments, eq(taskAssignments.id, documentArchive.assignmentId))
      .innerJoin(users, eq(users.id, taskAssignments.userId))
      .innerJoin(tasks, eq(tasks.id, documentArchive.taskId))
      .where(whereClause),
    db
      .select({
        id: documentArchive.id,
        taskId: documentArchive.taskId,
        taskNumber: tasks.taskNumber,
        title: documentArchive.title,
        categoryName: categories.name,
        divisionId: documentArchive.divisionId,
        divisionName: divisions.name,
        divisionCode: divisions.code,
        recipientName: users.fullName,
        archivedAt: documentArchive.archivedAt,
        submissionId: documentArchive.submissionId,
        submissionVersion: taskSubmissions.version,
      })
      .from(documentArchive)
      .innerJoin(taskSubmissions, eq(taskSubmissions.id, documentArchive.submissionId))
      .innerJoin(taskAssignments, eq(taskAssignments.id, documentArchive.assignmentId))
      .innerJoin(users, eq(users.id, taskAssignments.userId))
      .innerJoin(tasks, eq(tasks.id, documentArchive.taskId))
      .innerJoin(categories, eq(categories.id, tasks.categoryId))
      .innerJoin(divisions, eq(divisions.id, documentArchive.divisionId))
      .where(whereClause)
      .orderBy(...CATALOG_ORDER)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const submissionIds = rows.map((row) => row.submissionId);
  const fileRows =
    submissionIds.length > 0
      ? await db
          .select({
            id: attachments.id,
            submissionId: attachments.submissionId,
            name: attachments.originalName,
            sizeBytes: attachments.sizeBytes,
            checksum: attachments.checksumSha256,
          })
          .from(attachments)
          .where(
            and(
              inArray(attachments.submissionId, submissionIds),
              eq(attachments.state, "COMMITTED"),
            ),
          )
          .orderBy(asc(attachments.createdAt), asc(attachments.id))
      : [];

  const now = nowSeconds();
  const filesBySubmission = new Map<string, CatalogFile[]>();
  for (const file of fileRows) {
    const list = filesBySubmission.get(file.submissionId) ?? [];
    list.push({
      id: file.id,
      name: file.name,
      sizeFormatted: formatBytes(file.sizeBytes),
      checksum: file.checksum.slice(0, 8),
      downloadUrl: `/api/attachments/${file.id}/download`,
    });
    filesBySubmission.set(file.submissionId, list);
  }

  const items: CatalogItem[] = rows.map((row) => {
    const archivedSeconds = Math.floor(row.archivedAt.getTime() / 1000);
    return {
      id: row.id,
      taskId: row.taskId,
      taskNumber: row.taskNumber,
      title: row.title,
      categoryName: row.categoryName,
      divisionId: row.divisionId,
      divisionName: row.divisionName,
      divisionCode: row.divisionCode,
      recipientName: row.recipientName,
      archivedDateFormatted: formatWibDate(archivedSeconds),
      archivedDateTimeFormatted: formatJakartaNotification(archivedSeconds),
      archivedDaysAgo: Math.max(0, Math.floor((now - archivedSeconds) / 86_400)),
      submissionVersion: row.submissionVersion,
      files: filesBySubmission.get(row.submissionId) ?? [],
    };
  });

  const total = Number(totalRows[0]?.total ?? 0);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
