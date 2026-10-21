import { and, eq, sql } from "drizzle-orm";
import { documentArchive, taskAssignments, tasks } from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import { isDueSoon, isOverdue, nowSeconds } from "@/lib/time";

/**
 * Agregasi dashboard yang sudah dibatasi cakupan peran (§7.1).
 * Cakupan diterapkan di klausa WHERE, bukan dengan menyaring hasil di memori.
 */
export type DashboardCounts = {
  assignments: number;
  tasks: number;
  byStatus: Record<string, number>;
  overdue: number;
  dueSoon: number;
  awaitingReview: number;
  needRevision: number;
  completedTotal: number;
  completedOnTime: number;
};

export type ReviewQueueItem = {
  assignmentId: string;
  taskId: string;
  title: string;
  dueAt: number;
  submittedAt: number | null;
};

export async function dashboardCounts(db: Db, scope: Scope): Promise<DashboardCounts> {
  const rows = await db
    .select({
      status: taskAssignments.status,
      needsRevision: taskAssignments.needsRevision,
      completedAt: taskAssignments.completedAt,
      dueAt: tasks.dueAt,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(scope.allDivisions ? sql`1 = 1` : eq(tasks.divisionId, scope.divisionId));

  const now = nowSeconds();
  const byStatus: Record<string, number> = {};
  let overdue = 0;
  let dueSoon = 0;
  let needRevision = 0;
  let completedTotal = 0;
  let completedOnTime = 0;

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    if (row.needsRevision && row.status !== "SELESAI") needRevision += 1;
    if (isOverdue({ dueAt: row.dueAt.getTime() / 1000, status: row.status, now })) overdue += 1;
    if (isDueSoon({ dueAt: row.dueAt.getTime() / 1000, status: row.status, now })) dueSoon += 1;
    if (row.status === "SELESAI" && row.completedAt) {
      completedTotal += 1;
      if (row.completedAt.getTime() <= row.dueAt.getTime()) completedOnTime += 1;
    }
  }

  const taskScope = scope.allDivisions
    ? sql`1 = 1`
    : sql`${tasks.divisionId} = ${scope.divisionId}`;
  const [taskRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(tasks)
    .where(taskScope);

  return {
    assignments: rows.length,
    tasks: Number(taskRow?.total ?? 0),
    byStatus,
    overdue,
    dueSoon,
    awaitingReview: byStatus.MENUNGGU_VERIFIKASI ?? 0,
    needRevision,
    completedTotal,
    completedOnTime,
  };
}

/** Jumlah dokumen final dalam cakupan: satu baris per penugasan yang disahkan. */
export async function archiveCount(db: Db, scope: Scope): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(documentArchive)
    .where(scope.allDivisions ? sql`1 = 1` : eq(documentArchive.divisionId, scope.divisionId));
  return Number(row?.total ?? 0);
}

/** Antrean review: Admin melihat divisinya, Super Admin seluruh divisi. */
export async function reviewQueue(db: Db, scope: Scope, limit = 50): Promise<ReviewQueueItem[]> {
  const filter = and(
    eq(taskAssignments.status, "MENUNGGU_VERIFIKASI"),
    scope.allDivisions ? sql`1 = 1` : eq(tasks.divisionId, scope.divisionId),
  );

  const rows = await db
    .select({
      assignmentId: taskAssignments.id,
      taskId: tasks.id,
      title: tasks.title,
      dueAt: tasks.dueAt,
      submittedAt: taskAssignments.submittedAt,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(filter)
    .orderBy(taskAssignments.submittedAt)
    .limit(limit);

  return rows.map((row) => ({
    assignmentId: row.assignmentId,
    taskId: row.taskId,
    title: row.title,
    dueAt: row.dueAt.getTime() / 1000,
    submittedAt: row.submittedAt ? row.submittedAt.getTime() / 1000 : null,
  }));
}
