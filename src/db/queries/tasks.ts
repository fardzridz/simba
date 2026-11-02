import { and, eq, isNotNull, like, or, sql, type SQL } from "drizzle-orm";
import {
  categories,
  documentArchive,
  taskAssignments,
  tasks,
  users,
  type AssignmentStatus,
  type Priority,
} from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import { nowSeconds } from "@/lib/time";

export type TaskFilterFlag = "terlambat" | "revisi" | "terarsip";

export type TaskFilterOptions = {
  q?: string;
  status?: AssignmentStatus;
  flag?: TaskFilterFlag;
  page?: number;
  pageSize?: number;
};

export type TaskListItem = {
  assignmentId: string;
  taskId: string;
  taskNumber: string;
  title: string;
  description: string | null;
  priority: Priority;
  categoryName: string;
  assignedUserId: string;
  assignedUserName: string;
  status: AssignmentStatus;
  needsRevision: boolean;
  revisionCount: number;
  dueAt: Date;
  startedAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  isArchived: boolean;
};

export type TaskListResult = {
  items: TaskListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** WHERE gabungan aturan cakupan, pencarian, status, dan penanda (difilter di SQL, §9.3). */
function taskFilterWhere(scope: Scope, options: TaskFilterOptions): SQL | undefined {
  const now = nowSeconds();

  const conditions: SQL[] = [];
  if (scope.allDivisions) {
    // Super admin melihat semua divisi.
  } else if (scope.role === "USER") {
    // Staf pelaksana hanya melihat tugas miliknya di divisinya.
    conditions.push(eq(tasks.divisionId, scope.divisionId));
    conditions.push(eq(taskAssignments.userId, scope.userId));
  } else {
    // Admin divisi melihat seluruh tugas di divisinya.
    conditions.push(eq(tasks.divisionId, scope.divisionId));
  }

  if (options.q && options.q.trim()) {
    const term = `%${options.q.trim()}%`;
    conditions.push(
      or(like(tasks.title, term), like(tasks.taskNumber, term))!,
    );
  }

  if (options.status) {
    conditions.push(eq(taskAssignments.status, options.status));
  }

  if (options.flag === "terlambat") {
    conditions.push(
      sql`${tasks.dueAt} < ${now} and ${taskAssignments.status} not in ('SELESAI', 'DIBATALKAN')`,
    );
  } else if (options.flag === "revisi") {
    conditions.push(
      sql`${taskAssignments.needsRevision} = 1 and ${taskAssignments.status} != 'SELESAI'`,
    );
  } else if (options.flag === "terarsip") {
    conditions.push(isNotNull(documentArchive.id));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export type TaskKpis = {
  /** BELUM_DIKERJAKAN + SEDANG_DIKERJAKAN. */
  active: number;
  /** MENUNGGU_VERIFIKASI. */
  waiting: number;
  /** Melewati tenggat dan belum selesai atau dibatalkan (§3.3). */
  overdue: number;
  /** needs_revision aktif dan belum SELESAI. */
  revision: number;
};

/**
 * KPI pita empat kartu (L09): satu kueri agregasi atas seluruh baris hasil
 * filter yang sama dengan daftar di bawahnya, bukan sekadar items satu halaman.
 */
export async function getTaskKpis(
  db: Db,
  scope: Scope,
  options: TaskFilterOptions = {},
): Promise<TaskKpis> {
  const now = nowSeconds();
  const whereClause = taskFilterWhere(scope, options);

  const [row] = await db
    .select({
      active: sql<number>`coalesce(sum(case when ${taskAssignments.status} in ('BELUM_DIKERJAKAN', 'SEDANG_DIKERJAKAN') then 1 else 0 end), 0)`,
      waiting: sql<number>`coalesce(sum(case when ${taskAssignments.status} = 'MENUNGGU_VERIFIKASI' then 1 else 0 end), 0)`,
      overdue: sql<number>`coalesce(sum(case when ${tasks.dueAt} < ${now} and ${taskAssignments.status} not in ('SELESAI', 'DIBATALKAN') then 1 else 0 end), 0)`,
      revision: sql<number>`coalesce(sum(case when ${taskAssignments.needsRevision} = 1 and ${taskAssignments.status} != 'SELESAI' then 1 else 0 end), 0)`,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .leftJoin(
      documentArchive,
      eq(documentArchive.assignmentId, taskAssignments.id),
    )
    .where(whereClause);

  return {
    active: Number(row?.active ?? 0),
    waiting: Number(row?.waiting ?? 0),
    overdue: Number(row?.overdue ?? 0),
    revision: Number(row?.revision ?? 0),
  };
}

/**
 * Mengambil daftar penugasan dengan filter pencarian, status, dan flag.
 * Cakupan peran ditegakkan langsung di level kueri basis data (§9.3).
 */
export async function getTaskList(
  db: Db,
  scope: Scope,
  options: TaskFilterOptions = {},
): Promise<TaskListResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, options.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const whereClause = taskFilterWhere(scope, options);

  // Kueri total baris untuk paginasi
  const [countResult] = await db
    .select({ total: sql<number>`count(*)` })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .leftJoin(
      documentArchive,
      eq(documentArchive.assignmentId, taskAssignments.id),
    )
    .where(whereClause);

  const total = Number(countResult?.total ?? 0);
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (total === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  }

  // Kueri data halaman aktif
  const rows = await db
    .select({
      assignmentId: taskAssignments.id,
      taskId: tasks.id,
      taskNumber: tasks.taskNumber,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      categoryName: categories.name,
      assignedUserId: taskAssignments.userId,
      assignedUserName: users.fullName,
      status: taskAssignments.status,
      needsRevision: taskAssignments.needsRevision,
      revisionCount: taskAssignments.revisionCount,
      dueAt: tasks.dueAt,
      startedAt: taskAssignments.startedAt,
      submittedAt: taskAssignments.submittedAt,
      completedAt: taskAssignments.completedAt,
      isArchived: sql<boolean>`${documentArchive.id} is not null`,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .innerJoin(categories, eq(categories.id, tasks.categoryId))
    .innerJoin(users, eq(users.id, taskAssignments.userId))
    .leftJoin(
      documentArchive,
      eq(documentArchive.assignmentId, taskAssignments.id),
    )
    .where(whereClause)
    .orderBy(tasks.dueAt)
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}
