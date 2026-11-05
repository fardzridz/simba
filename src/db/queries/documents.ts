import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/env";
import {
  attachments,
  categories,
  documentArchive,
  divisions,
  taskAssignments,
  taskSubmissions,
  tasks,
  users,
} from "@/db/schema";
import type { Scope } from "@/lib/auth/scope";
import {
  JAKARTA_OFFSET_SECONDS,
  formatJakartaNotification,
  nowSeconds,
} from "@/lib/time";

export type FinalDocumentFile = {
  id: string;
  name: string;
  sizeFormatted: string;
  checksum: string;
  downloadUrl?: string;
};

export type FinalDocument = {
  id: string;
  taskId: string;
  taskNumber: string;
  title: string;
  categoryName: string;
  divisionName: string;
  recipientName: string;
  archivedDateFormatted: string;
  archivedDateTimeFormatted: string;
  archivedDaysAgo: number;
  submissionVersion: number;
  files: FinalDocumentFile[];
};

const MONTH_NAMES_SHORT = [
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

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function formatJakartaDate(epochSeconds: number): string {
  const shifted = new Date((epochSeconds + JAKARTA_OFFSET_SECONDS) * 1000);
  return `${shifted.getUTCDate()} ${MONTH_NAMES_SHORT[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}`;
}

/**
 * Katalog dokumen final (L13): satu baris per penugasan yang disahkan,
 * berkasnya hanya attachment COMMITTED. Cakupan peran:
 * - USER hanya arsip penugasannya sendiri,
 * - ADMIN divisinya,
 * - SUPER_ADMIN seluruh divisi (baca-saja).
 */
export async function getFinalDocuments(
  db: Db,
  scope: Scope,
): Promise<FinalDocument[]> {
  const scopeFilter = scope.allDivisions
    ? undefined
    : scope.role === "USER"
      ? eq(taskAssignments.userId, scope.userId)
      : eq(documentArchive.divisionId, scope.divisionId);

  const rows = await db
    .select({
      id: documentArchive.id,
      taskId: documentArchive.taskId,
      taskNumber: tasks.taskNumber,
      title: documentArchive.title,
      categoryName: categories.name,
      divisionName: divisions.name,
      recipientName: users.fullName,
      archivedAt: documentArchive.archivedAt,
      submissionVersion: taskSubmissions.version,
      fileId: attachments.id,
      fileName: attachments.originalName,
      fileSizeBytes: attachments.sizeBytes,
      fileChecksum: attachments.checksumSha256,
    })
    .from(documentArchive)
    .innerJoin(tasks, eq(tasks.id, documentArchive.taskId))
    .innerJoin(categories, eq(categories.id, tasks.categoryId))
    .innerJoin(divisions, eq(divisions.id, documentArchive.divisionId))
    .innerJoin(taskAssignments, eq(taskAssignments.id, documentArchive.assignmentId))
    .innerJoin(users, eq(users.id, taskAssignments.userId))
    .innerJoin(taskSubmissions, eq(taskSubmissions.id, documentArchive.submissionId))
    .leftJoin(
      attachments,
      and(
        eq(attachments.submissionId, documentArchive.submissionId),
        eq(attachments.state, "COMMITTED"),
      ),
    )
    .where(scopeFilter)
    .orderBy(desc(documentArchive.archivedAt));

  const byDocument = new Map<string, FinalDocument>();
  const now = nowSeconds();
  for (const row of rows) {
    let doc = byDocument.get(row.id);
    if (!doc) {
      const archivedEpoch = Math.floor(row.archivedAt.getTime() / 1000);
      doc = {
        id: row.id,
        taskId: row.taskId,
        taskNumber: row.taskNumber,
        title: row.title,
        categoryName: row.categoryName,
        divisionName: row.divisionName,
        recipientName: row.recipientName,
        archivedDateFormatted: formatJakartaDate(archivedEpoch),
        archivedDateTimeFormatted: formatJakartaNotification(archivedEpoch),
        archivedDaysAgo: Math.max(
          0,
          Math.floor((now - archivedEpoch) / 86_400),
        ),
        submissionVersion: row.submissionVersion,
        files: [],
      };
      byDocument.set(row.id, doc);
    }
    if (row.fileId && row.fileName && row.fileSizeBytes && row.fileChecksum) {
      doc.files.push({
        id: row.fileId,
        name: row.fileName,
        sizeFormatted: formatBytes(row.fileSizeBytes),
        checksum: row.fileChecksum.slice(0, 8),
        downloadUrl: `/api/attachments/${row.fileId}/download`,
      });
    }
  }

  return Array.from(byDocument.values());
}
