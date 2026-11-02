import { and, asc, eq } from "drizzle-orm";
import {
  categories,
  divisions,
  taskAssignments,
  tasks,
  users,
  type AssignmentStatus,
  type Priority,
} from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import { roleLabel } from "@/db/queries/master";
import { jakartaDateInput } from "@/lib/time";

/**
 * Data formulir penugasan (Fase 3 item 3): anggota divisi aktif, kategori
 * aktif, dan isi tugas yang sedang diubah. Semua angka/daftar dari D1.
 */

export type DivisionMemberOption = {
  id: string;
  name: string;
  roleLabel: string;
  initials: string;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Anggota staf pelaksana aktif di satu divisi, terurut nama. */
export async function getDivisionMembers(
  db: Db,
  divisionId: string,
): Promise<DivisionMemberOption[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.fullName,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.divisionId, divisionId),
        eq(users.role, "USER"),
        eq(users.isActive, true),
      ),
    )
    .orderBy(asc(users.fullName));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    roleLabel: roleLabel(row.role),
    initials: initialsOf(row.name),
  }));
}

export type CategoryOption = {
  id: string;
  name: string;
};

/** Kategori aktif untuk pilihan form tugas dan setelan divisi. */
export async function getActiveCategories(
  db: Db,
): Promise<CategoryOption[]> {
  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.name));

  return rows;
}

export type TaskEditAssignee = {
  userId: string;
  name: string;
  status: AssignmentStatus;
  /** Penerima yang sudah memulai atau sudah menunggu verifikasi tak boleh dilepas (§12 #2). */
  removable: boolean;
};

export type TaskEditData = {
  id: string;
  taskNumber: string;
  divisionId: string;
  divisionName: string;
  title: string;
  description: string | null;
  categoryId: string;
  priority: Priority;
  /** Tanggal mulai/tenggat dalam bentuk input YYYY-MM-DD menurut WIB. */
  startDateInput: string;
  dueDateInput: string;
  assignees: TaskEditAssignee[];
  /** false saat sudah ada penugasan final; form tampil baca-saja dengan alasan. */
  editable: boolean;
  lockedReason: string | null;
};

/**
 * Isi tugas untuk form ubah (UC06). Cakupan Admin divisinya sendiri;
 * tugas di luar divisi dikembalikan null, bukan dikecualikan diam-diam.
 */
export async function getTaskEditData(
  db: Db,
  scope: Scope,
  taskId: string,
): Promise<TaskEditData | null> {
  const conditions = [eq(tasks.id, taskId)];
  if (!scope.allDivisions) {
    conditions.push(eq(tasks.divisionId, scope.divisionId));
  }

  const [row] = await db
    .select({
      id: tasks.id,
      taskNumber: tasks.taskNumber,
      divisionId: tasks.divisionId,
      divisionName: divisions.name,
      title: tasks.title,
      description: tasks.description,
      categoryId: tasks.categoryId,
      priority: tasks.priority,
      startAt: tasks.startAt,
      dueAt: tasks.dueAt,
    })
    .from(tasks)
    .innerJoin(divisions, eq(divisions.id, tasks.divisionId))
    .where(and(...conditions))
    .limit(1);

  if (!row) return null;

  const assigneeRows = await db
    .select({
      userId: taskAssignments.userId,
      status: taskAssignments.status,
      name: users.fullName,
    })
    .from(taskAssignments)
    .innerJoin(users, eq(users.id, taskAssignments.userId))
    .where(eq(taskAssignments.taskId, taskId))
    .orderBy(asc(taskAssignments.createdAt), asc(taskAssignments.id));

  if (assigneeRows.length === 0) return null;

  const hasFinal = assigneeRows.some(
    (row_) => row_.status === "SELESAI" || row_.status === "DIBATALKAN",
  );

  return {
    id: row.id,
    taskNumber: row.taskNumber,
    divisionId: row.divisionId,
    divisionName: row.divisionName,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    priority: row.priority,
    startDateInput: jakartaDateInput(Math.floor(row.startAt.getTime() / 1000)),
    dueDateInput: jakartaDateInput(Math.floor(row.dueAt.getTime() / 1000)),
    assignees: assigneeRows.map((row_) => ({
      userId: row_.userId,
      name: row_.name,
      status: row_.status,
      removable: row_.status === "BELUM_DIKERJAKAN",
    })),
    editable: !hasFinal,
    lockedReason: hasFinal
      ? "Tugas ini memuat penugasan yang sudah selesai atau dibatalkan, sehingga rincian tidak dapat diubah lagi."
      : null,
  };
}
