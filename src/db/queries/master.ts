import { and, count, eq, sql } from "drizzle-orm";
import { categories, divisions, tasks, users } from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import { JAKARTA_OFFSET_SECONDS } from "@/lib/time";

/**
 * Baris master serialisabel untuk komponen klien: semua tanggal sudah
 * diformat di server, tidak ada objek Date yang melewati batas server/klien.
 */

export type MasterUser = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  divisionId: string;
  divisionName: string;
  divisionCode: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  roleLabel: string;
  isActive: boolean;
  lastLoginFormatted: string;
};

export type MasterDivision = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  memberCount: number;
  createdAtFormatted: string;
};

export type MasterCategory = {
  id: string;
  name: string;
  isActive: boolean;
  taskCount: number;
  createdAtFormatted: string;
};

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function formatWibDate(epochSeconds: number): string {
  const shifted = new Date((epochSeconds + JAKARTA_OFFSET_SECONDS) * 1000);
  return `${shifted.getUTCDate()} ${MONTH_NAMES_SHORT[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}`;
}

function formatWibDateTime(epochSeconds: number): string {
  const shifted = new Date((epochSeconds + JAKARTA_OFFSET_SECONDS) * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${formatWibDate(epochSeconds)} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())} WIB`;
}

export function roleLabel(role: MasterUser["role"]): string {
  return role === "SUPER_ADMIN" ? "Super Admin" : role === "ADMIN" ? "Admin Divisi" : "Staf";
}

/** Daftar pengguna dalam cakupan: Super Admin semua divisi, Admin divisinya, User divisinya. */
export async function getMasterUsers(db: Db, scope: Scope): Promise<MasterUser[]> {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      email: users.email,
      divisionId: users.divisionId,
      divisionName: divisions.name,
      divisionCode: divisions.code,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .innerJoin(divisions, eq(divisions.id, users.divisionId))
    .where(scope.allDivisions ? undefined : eq(users.divisionId, scope.divisionId))
    .orderBy(users.fullName);

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    email: row.email ?? "",
    divisionId: row.divisionId,
    divisionName: row.divisionName,
    divisionCode: row.divisionCode,
    role: row.role,
    roleLabel: roleLabel(row.role),
    isActive: row.isActive,
    lastLoginFormatted: row.lastLoginAt
      ? formatWibDateTime(row.lastLoginAt.getTime() / 1000)
      : "Belum pernah",
  }));
}

/** Daftar divisi beserta jumlah anggota nyata dan tanggal dibuatnya. */
export async function getMasterDivisions(db: Db, scope: Scope): Promise<MasterDivision[]> {
  const rows = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      code: divisions.code,
      isActive: divisions.isActive,
      createdAt: divisions.createdAt,
      memberCount: sql<number>`(
        select count(*) from ${users} where ${users.divisionId} = ${divisions.id}
      )`,
    })
    .from(divisions)
    .where(scope.allDivisions ? undefined : eq(divisions.id, scope.divisionId))
    .orderBy(divisions.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    isActive: row.isActive,
    memberCount: Number(row.memberCount),
    createdAtFormatted: formatWibDate(row.createdAt.getTime() / 1000),
  }));
}

/** Daftar kategori dengan jumlah tugas yang benar-benar memakainya. */
export async function getMasterCategories(db: Db, scope: Scope): Promise<MasterCategory[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      isActive: categories.isActive,
      createdAt: categories.createdAt,
      taskCount: count(tasks.id),
    })
    .from(categories)
    .leftJoin(tasks, eq(tasks.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    taskCount: Number(row.taskCount),
    createdAtFormatted: formatWibDate(row.createdAt.getTime() / 1000),
  }));
}

/**
 * Jumlah pengguna aktif dengan peran tertentu; dipakai pesan konfirmasi
 * menonaktifkan divisi agar Admin tidak kehilangan seluruh pengelolanya.
 */
export async function getActiveUsersPerDivision(db: Db, divisionId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.divisionId, divisionId), eq(users.isActive, true)));
  return Number(row?.total ?? 0);
}
