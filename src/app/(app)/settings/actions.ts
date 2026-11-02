"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PRIORITIES, activityLogs, appSettings, categories, divisions } from "@/db/schema";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import {
  CANONICAL_TYPES,
  MAX_FILE_BYTES_LIMIT,
  MAX_FILES_PER_SUBMISSION_LIMIT,
} from "@/lib/storage/settings";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";

/**
 * Pengaturan operasional (UC17, §6.4): tulis app_settings hanya Super Admin,
 * kolom setelan divisi oleh Admin divisinya (division_id dari sesi) atau
 * Super Admin. Setiap simpan menulis log nilai lama dan baru; tidak ada log kosong.
 */

export type SettingsActionResult = {
  success?: boolean;
  error?: string;
};

/** Batas ukuran mengikuti limit aplikasi; layar boleh menurunkan, bukan menaikkan. */
const MB = 1024 * 1024;
const EMAIL_MAX_LENGTH = 254;

const appSettingsSchema = z.object({
  maxFileMb: z
    .number("Ukuran berkas harus berupa angka.")
    .int("Ukuran berkas harus bilangan bulat.")
    .min(1, "Ukuran berkas hanya boleh diatur antara 1 sampai 10 MB.")
    .max(10, "Batas atas 10 MB mengikuti batas aplikasi; setelan hanya dapat menurunkan."),
  maxFilesPerSubmission: z
    .number("Jumlah berkas harus berupa angka.")
    .int("Jumlah berkas harus bilangan bulat.")
    .min(1, "Jumlah berkas per pengumpulan harus antara 1 sampai 5 berkas.")
    .max(MAX_FILES_PER_SUBMISSION_LIMIT, "Jumlah berkas per pengumpulan harus antara 1 sampai 5 berkas."),
  allowedTypes: z
    .array(z.enum(CANONICAL_TYPES))
    .min(1, "Pilih minimal satu tipe berkas yang diizinkan."),
  dueSoonDays: z
    .number("Ambang tenggat harus berupa angka.")
    .int("Ambang tenggat harus bilangan bulat.")
    .min(1, "Ambang tenggat dekat harus antara 1 sampai 30 hari.")
    .max(30, "Ambang tenggat dekat harus antara 1 sampai 30 hari."),
});

export async function saveAppSettings(input: unknown): Promise<SettingsActionResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  if (scope.role !== "SUPER_ADMIN") {
    return { error: "Hanya Super Admin yang dapat mengatur kebijakan sistem." };
  }

  const parsed = appSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Setelan tidak sah, periksa nilai yang diisi.",
    };
  }

  const { maxFileMb, maxFilesPerSubmission, allowedTypes, dueSoonDays } = parsed.data;
  const { db } = appContext();

  const now = nowSeconds();
  const stamp = new Date(now * 1000);
  const values = {
    maxFileMb,
    maxFilesPerSubmission,
    allowedTypes,
    dueSoonDays,
  };
  const nextSnapshot = JSON.stringify(values);

  const [existing] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 1))
    .limit(1);

  const prevSnapshot = existing
    ? JSON.stringify({
        maxFileMb: Math.round((existing.maxFileBytes ?? MAX_FILE_BYTES_LIMIT) / MB),
        maxFilesPerSubmission: existing.maxFilesPerSubmission,
        allowedTypes: (() => {
          try {
            return JSON.parse(existing.allowedTypes);
          } catch {
            return [...CANONICAL_TYPES];
          }
        })(),
        dueSoonDays: existing.dueSoonDays,
      })
    : null;

  const upsert = db
    .insert(appSettings)
    .values({
      id: 1,
      maxFileBytes: maxFileMb * MB,
      maxFilesPerSubmission,
      allowedTypes: JSON.stringify(allowedTypes),
      dueSoonDays,
      updatedBy: actor.id,
      updatedAt: stamp,
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        maxFileBytes: maxFileMb * MB,
        maxFilesPerSubmission,
        allowedTypes: JSON.stringify(allowedTypes),
        dueSoonDays,
        updatedBy: actor.id,
        updatedAt: stamp,
      },
    });

  const logMutation = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "settings.updated",
    entityType: "settings",
    entityId: "app_settings",
    prevValue: prevSnapshot,
    newValue: nextSnapshot,
    createdAt: stamp,
  });

  try {
    await db.batch([upsert, logMutation]);
  } catch {
    return { error: "Penyimpanan setelan gagal, coba beberapa saat lagi." };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");

  return { success: true };
}

const emailSchema = z
  .email("Format alamat surel kontak divisi tidak valid.")
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, "Surel maksimal 254 karakter.");

const divisionSettingsSchema = z.object({
  divisionId: z.string().trim().min(1, "Pilih divisi terlebih dulu.").optional(),
  contactEmail: emailSchema.or(z.literal("")),
  defaultCategoryId: z.string().trim().optional(),
  defaultPriority: z.enum(PRIORITIES),
});

export async function saveDivisionSettings(
  input: unknown,
): Promise<SettingsActionResult> {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role !== "ADMIN" && scope.role !== "SUPER_ADMIN") {
    return { error: "Staf pelaksana tidak memiliki hak akses Pengaturan." };
  }

  const parsed = divisionSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Nilai setelan divisi tidak sah, periksa isian yang dikirim.",
    };
  }

  // Admin memakai division_id dari sesi (IDOR); Super Admin memilih divisi sendiri.
  const divisionId =
    scope.role === "ADMIN"
      ? scope.divisionId
      : (parsed.data.divisionId ?? scope.divisionId);

  const contactEmail = parsed.data.contactEmail || null;
  const categoryId = parsed.data.defaultCategoryId
    ? parsed.data.defaultCategoryId
    : null;

  const { db } = appContext();

  const [division] = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      contactEmail: divisions.contactEmail,
      defaultCategoryId: divisions.defaultCategoryId,
      defaultPriority: divisions.defaultPriority,
    })
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);

  if (!division) {
    return { error: "Divisi tidak ditemukan." };
  }

  let validCategoryId: string | null = null;
  if (categoryId) {
    const [category] = await db
      .select({ name: categories.name, isActive: categories.isActive })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);
    if (!category) {
      return { error: "Kategori default tidak ditemukan." };
    }
    if (!category.isActive) {
      return {
        error: `Kategori ${category.name} sedang nonaktif dan tidak dapat dijadikan default.`,
      };
    }
    validCategoryId = categoryId;
  }

  const unchanged =
    division.contactEmail === contactEmail &&
    division.defaultCategoryId === validCategoryId &&
    division.defaultPriority === parsed.data.defaultPriority;

  if (unchanged) {
    return { success: true };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);
  const prevSnapshot = JSON.stringify({
    contactEmail: division.contactEmail,
    defaultCategoryId: division.defaultCategoryId,
    defaultPriority: division.defaultPriority,
  });
  const nextSnapshot = JSON.stringify({
    contactEmail,
    defaultCategoryId: validCategoryId,
    defaultPriority: parsed.data.defaultPriority,
  });

  const updateMutation = db
    .update(divisions)
    .set({
      contactEmail,
      defaultCategoryId: validCategoryId,
      defaultPriority: parsed.data.defaultPriority,
    })
    .where(eq(divisions.id, division.id));

  const logMutation = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "division.updated",
    entityType: "division",
    entityId: division.id,
    prevValue: prevSnapshot,
    newValue: nextSnapshot,
    createdAt: stamp,
  });

  try {
    await db.batch([updateMutation, logMutation]);
  } catch {
    return { error: "Penyimpanan setelan divisi gagal, coba beberapa saat lagi." };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");

  return { success: true };
}
