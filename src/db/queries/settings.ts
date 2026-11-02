import { eq, sql, type SQL } from "drizzle-orm";
import {
  appSettings,
  categories,
  divisions,
  users,
  type Priority,
} from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import {
  CANONICAL_TYPES,
  MAX_FILE_BYTES_LIMIT,
  MAX_FILES_PER_SUBMISSION_LIMIT,
  getUploadSettings,
} from "@/lib/storage/settings";
import { formatJakartaNotification } from "@/lib/time";

/**
 * Setelan layar Pengaturan (UC17): angka dari baris `app_settings` nyata,
 * diolah memakai pembacaan yang sama dengan mesin unggahan supaya layar dan
 * validasi tidak pernah berbeda nilai.
 */

export type AppSettingsView = {
  maxFileMb: number;
  maxFilesPerSubmission: number;
  /** Tipe kanonik huruf kecil yang diterima unggahan (subset, minimal satu). */
  allowedTypes: string[];
  dueSoonDays: number;
  updatedByName: string | null;
  updatedAtFormatted: string | null;
};

const MB = 1024 * 1024;

const FALLBACK_VIEW: AppSettingsView = {
  maxFileMb: MAX_FILE_BYTES_LIMIT / MB,
  maxFilesPerSubmission: MAX_FILES_PER_SUBMISSION_LIMIT,
  allowedTypes: [...CANONICAL_TYPES],
  dueSoonDays: 3,
  updatedByName: null,
  updatedAtFormatted: null,
};

/**
 * Baris setelan dibuat oleh migrasi/seed; bila belum ada, tampilkan fallback
 * default bersama penanda "belum pernah disimpan" alih-alih angka karangan.
 */
export async function getAppSettingsView(db: Db): Promise<AppSettingsView> {
  const settings = await getUploadSettings(db);

  const [meta] = await db
    .select({
      updatedAt: appSettings.updatedAt,
      updatedByName: users.fullName,
    })
    .from(appSettings)
    .leftJoin(users, eq(users.id, appSettings.updatedBy))
    .where(eq(appSettings.id, 1))
    .limit(1);

  if (!meta) return FALLBACK_VIEW;

  return {
    maxFileMb: Math.round(settings.maxFileBytes / MB),
    maxFilesPerSubmission: settings.maxFilesPerSubmission,
    allowedTypes: settings.allowedTypes,
    dueSoonDays: settings.dueSoonDays,
    updatedByName: meta.updatedByName ?? null,
    updatedAtFormatted: formatJakartaNotification(meta.updatedAt),
  };
}

export type DivisionSettingsView = {
  id: string;
  name: string;
  code: string;
  /** Admin divisi aktif pertama; divisi tanpa Admin tampil "Belum ada admin aktif". */
  adminName: string | null;
  contactEmail: string | null;
  defaultCategoryId: string | null;
  defaultCategoryName: string | null;
  /** false bila kategori default menunjuk kategori nonaktif atau sudah tak ada. */
  defaultCategoryActive: boolean;
  defaultPriority: Priority;
};

/**
 * Daftar setelan divisi sesuai cakupan: Admin divisinya sendiri, Super Admin
 * semua divisi. Nama Admin diambil dari data pengguna nyata, bukan kolom.
 */
export async function getDivisionSettingsList(
  db: Db,
  scope: Scope,
): Promise<DivisionSettingsView[]> {
  const whereClause: SQL | undefined = scope.allDivisions
    ? undefined
    : eq(divisions.id, scope.divisionId);

  const rows = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      code: divisions.code,
      contactEmail: divisions.contactEmail,
      defaultCategoryId: divisions.defaultCategoryId,
      defaultPriority: divisions.defaultPriority,
      adminName: sql<string | null>`(
        select ${users.fullName} from ${users}
        where ${users.divisionId} = ${divisions.id}
          and ${users.role} = 'ADMIN'
          and ${users.isActive} = 1
        order by ${users.createdAt} asc, ${users.id} asc
        limit 1
      )`,
      defaultCategoryName: categories.name,
      defaultCategoryActive: categories.isActive,
    })
    .from(divisions)
    .leftJoin(categories, eq(categories.id, divisions.defaultCategoryId))
    .where(whereClause)
    .orderBy(divisions.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    adminName: row.adminName ?? null,
    contactEmail: row.contactEmail,
    defaultCategoryId: row.defaultCategoryId,
    defaultCategoryName: row.defaultCategoryName ?? null,
    defaultCategoryActive: row.defaultCategoryActive ?? false,
    defaultPriority: row.defaultPriority,
  }));
}
