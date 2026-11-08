"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  activityLogs,
  appSettings,
  attachments,
  categories,
  divisions,
  documentArchive,
  taskAssignments,
  taskReviews,
  taskSubmissions,
  tasks,
  users,
} from "@/db/schema";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { canManageMasterData, resolveScope } from "@/lib/auth/scope";
import { generateOneTimePassword, hashPassword } from "@/lib/auth/password";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";

export type MasterActionResult = {
  success?: boolean;
  error?: string;
  /** Sandi awal sekali pakai; hanya ada pada createUser/resetPassword saat sukses. */
  oneTimePassword?: string;
};

/** Kolasi galat kunci unik SQLite menjadi pesan yang terbaca. */
function uniqueViolation(error: unknown): MasterActionResult {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE") || message.includes("unique")) {
    return {
      error: "Nilai sudah dipakai data lain dan wajib unik, ubah lalu simpan kembali.",
    };
  }
  return { error: "Perubahan gagal disimpan, coba beberapa saat lagi." };
}

async function requireManager() {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  if (!canManageMasterData(scope)) {
    return {
      error: { error: "Hanya Super Admin yang dapat mengelola data master." } as MasterActionResult,
      blocked: true,
    };
  }
  return { actor, error: null as MasterActionResult | null, blocked: false };
}

type LogRow = typeof activityLogs.$inferInsert;

function logEntry(actorId: string, action: string, entityId: string, prev: unknown, next: unknown, stamp: Date): LogRow {
  return {
    id: newId("log"),
    actorId,
    action,
    entityType: "master",
    entityId,
    prevValue: prev === null ? null : JSON.stringify(prev),
    newValue: JSON.stringify(next),
    createdAt: stamp,
  };
}

// ============================================================
// Pengguna (UC02)
// ============================================================

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9._-]{2,31}$/, "Nama pengguna memakai huruf kecil, angka, titik, garis bawah atau hubung, 3 sampai 32 karakter.");

/**
 * NIP pegawai opsional (§D9): kosong berarti tanpa NIP; bila diisi wajib 18
 * digit angka setelah spasi pemeriksa dibuang, dan unik antar akun
 * (users_nip_uq). Tersimpan sebagai angka murni tanpa pemisah.
 */
const nipSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ""))
  .refine(
    (value) => value === "" || /^\d{18}$/.test(value),
    "NIP diisi 18 digit angka (spasi boleh sebagai pemisah) atau dibiarkan kosong.",
  )
  .transform((value) => (value === "" ? null : value));

const userFieldsSchema = z.object({
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi.").max(100, "Nama lengkap maksimal 100 karakter."),
  username: usernameSchema,
  email: z.email("Format surel tidak sah.").trim().toLowerCase().max(254),
  nip: nipSchema,
  divisionId: z.string().trim().min(1, "Divisi wajib dipilih."),
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
});

export async function createUser(input: unknown): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const parsed = userFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data pengguna tidak sah." };
  }
  const fields = parsed.data;

  // Kategori akun nonaktif tidak pernah dibuat dari nol; akun baru selalu aktif.
  // Sandi awal diacak per akun dan ditampilkan sekali di layar Super Admin;
  // tidak tertulis di kode maupun log aktivitas.
  const oneTimePassword = generateOneTimePassword();
  const passwordHash = await hashPassword(oneTimePassword);
  const now = nowSeconds();
  const stamp = new Date(now * 1000);
  const userId = newId("user");
  const { db } = appContext();

  // Divisi target wajib ada dan aktif (FK restrict ditambah pesan yang jelas).
  const [division] = await db
    .select({ id: divisions.id, name: divisions.name, isActive: divisions.isActive })
    .from(divisions)
    .where(eq(divisions.id, fields.divisionId))
    .limit(1);
  if (!division) {
    return { error: "Divisi tidak ditemukan." };
  }
  if (!division.isActive) {
    return { error: `Divisi ${division.name} sedang nonaktif, akun tidak dapat ditugaskan ke sana.` };
  }

  const usernameTaken = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, fields.username))
    .limit(1);
  if (usernameTaken.length > 0) {
    return { error: `Nama pengguna @${fields.username} sudah dipakai.` };
  }
  const emailTaken = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, fields.email))
    .limit(1);
  if (emailTaken.length > 0) {
    return { error: `Surel ${fields.email} sudah dipakai.` };
  }
  if (fields.nip) {
    const nipTaken = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.nip, fields.nip))
      .limit(1);
    if (nipTaken.length > 0) {
      return { error: `NIP ${fields.nip} sudah dipakai akun lain.` };
    }
  }

  try {
    await db.batch([
      db.insert(users).values({
        id: userId,
        divisionId: fields.divisionId,
        nip: fields.nip,
        username: fields.username,
        email: fields.email,
        fullName: fields.fullName,
        position: fields.role === "USER" ? "Staf Pelaksana" : "Pengelola",
        passwordHash,
        passwordChangedAt: stamp,
        role: fields.role,
        isActive: true,
        createdAt: stamp,
        updatedAt: stamp,
      }),
      db.insert(activityLogs).values(
        logEntry(manager.actor.id, "user.created", userId, null, {
          username: fields.username,
          fullName: fields.fullName,
          nip: fields.nip,
          divisionId: fields.divisionId,
          role: fields.role,
        }, stamp),
      ),
    ]);
  } catch (error) {
    return uniqueViolation(error);
  }

  revalidatePath("/master");
  revalidatePath("/", "layout");
  return { success: true, oneTimePassword };
}

const updateUserSchema = userFieldsSchema.extend({ id: z.string().trim().min(1) });

export async function updateUser(input: unknown): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data pengguna tidak sah." };
  }
  const fields = parsed.data;
  if (fields.id === manager.actor.id) {
    return { error: "Data akun sendiri diubah lewat menu Akun, bukan Kelola Master." };
  }

  const { db } = appContext();
  const [physical] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      email: users.email,
      nip: users.nip,
      divisionId: users.divisionId,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, fields.id))
    .limit(1);
  if (!physical) return { error: "Pengguna tidak ditemukan." };

  const clashingUsername = physical.username !== fields.username
    ? await db.select({ id: users.id }).from(users).where(eq(users.username, fields.username)).limit(1)
    : [];
  if (clashingUsername.length > 0) {
    return { error: `Nama pengguna @${fields.username} sudah dipakai orang lain.` };
  }
  const clashingEmail = (physical.email ?? "") !== fields.email
    ? await db.select({ id: users.id }).from(users).where(eq(users.email, fields.email)).limit(1)
    : [];
  if (clashingEmail.length > 0) {
    return { error: `Surel ${fields.email} sudah dipakai orang lain.` };
  }
  const clashingNip = fields.nip && fields.nip !== physical.nip
    ? await db.select({ id: users.id }).from(users).where(eq(users.nip, fields.nip)).limit(1)
    : [];
  if (clashingNip.length > 0) {
    return { error: `NIP ${fields.nip} sudah dipakai akun lain.` };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  try {
    await db.batch([
      db.update(users).set({
        fullName: fields.fullName,
        username: fields.username,
        email: fields.email,
        nip: fields.nip,
        divisionId: fields.divisionId,
        role: fields.role,
        updatedAt: stamp,
      }).where(eq(users.id, fields.id)),
      db.insert(activityLogs).values(
        logEntry(manager.actor.id, "user.updated", fields.id, {
          fullName: physical.fullName,
          username: physical.username,
          email: physical.email,
          nip: physical.nip,
          divisionId: physical.divisionId,
          role: physical.role,
        }, {
          fullName: fields.fullName,
          username: fields.username,
          email: fields.email,
          nip: fields.nip,
          divisionId: fields.divisionId,
          role: fields.role,
        }, stamp),
      ),
    ]);
  } catch (error) {
    return uniqueViolation(error);
  }

  revalidatePath("/master");
  return { success: true };
}

/**
 * Menetapkan sandi awal sekali pakai yang baru dan hanya ditampilkan satu kali
 * di layar Super Admin (§9.2). `password_changed_at` maju, sehingga seluruh
 * sesi lama langsung dicabut oleh pemeriksa sesi. Sandi tidak tertulis di
 * kode, log, atau arsip; pengguna wajib menggantinya dari menu Akun.
 */
export async function resetPassword(userId: string): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;
  if (userId === manager.actor.id) {
    return { error: "Kata sandi akun sendiri diubah lewat menu Akun." };
  }

  const { db } = appContext();
  const [physical] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!physical) return { error: "Pengguna tidak ditemukan." };

  const now = nowSeconds();
  const stamp = new Date(now * 1000);
  const oneTimePassword = generateOneTimePassword();
  const passwordHash = await hashPassword(oneTimePassword);

  await db.batch([
    db.update(users).set({ passwordHash, passwordChangedAt: stamp, updatedAt: stamp }).where(eq(users.id, userId)),
    db.insert(activityLogs).values(
      logEntry(manager.actor.id, "user.password_reset", userId, null, {
        username: physical.username,
      }, stamp),
    ),
  ]);

  revalidatePath("/master");
  return { success: true, oneTimePassword };
}

const setUserActiveSchema = z.object({
  id: z.string().trim().min(1),
  isActive: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export async function setUserActive(input: unknown): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const parsed = setUserActiveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Permintaan tidak sah." };
  }
  const fields = parsed.data;
  if (fields.id === manager.actor.id) {
    return { error: "Status akun sendiri tidak dapat diubah dari Kelola Master." };
  }

  const { db } = appContext();
  const [physical] = await db
    .select({ id: users.id, username: users.username, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, fields.id))
    .limit(1);
  if (!physical) return { error: "Pengguna tidak ditemukan." };

  if (!fields.isActive && !fields.reason) {
    return { error: "Alasan penonaktifan wajib diisi untuk rekam audit." };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  await db.batch([
    db.update(users).set({ isActive: fields.isActive, updatedAt: stamp }).where(eq(users.id, fields.id)),
    db.insert(activityLogs).values(
      logEntry(manager.actor.id, fields.isActive ? "user.activated" : "user.deactivated", fields.id, physical.isActive, {
        username: physical.username,
        isActive: fields.isActive,
        reason: fields.reason ?? null,
      }, stamp),
    ),
  ]);

  revalidatePath("/master");
  revalidatePath("/", "layout");
  return { success: true };
}

// ============================================================
// Divisi (UC03) dan kategori (UC04)
// ============================================================

const divisionSchema = z.object({
  /** Id hanya dikirim saat mengubah; pembuatan selalu membangkitkan id di server. */
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "Nama divisi wajib diisi.").max(80, "Nama divisi maksimal 80 karakter."),
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,4}$/, "Kode divisi memakai 2 sampai 4 huruf kapital."),
});

export async function saveDivision(input: unknown): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const parsed = divisionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data divisi tidak sah." };
  }
  const fields = parsed.data;
  const { db } = appContext();
  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  // Kode awalan wajib unik; baris yang sedang diedit dikecualikan.
  const codeClash = await db
    .select({ id: divisions.id })
    .from(divisions)
    .where(fields.id ? and(eq(divisions.code, fields.code), ne(divisions.id, fields.id)) : eq(divisions.code, fields.code))
    .limit(1);
  if (codeClash.length > 0) {
    return { error: `Kode ${fields.code} sudah dipakai divisi lain.` };
  }

  if (fields.id) {
    const [division] = await db
      .select({ id: divisions.id, name: divisions.name, code: divisions.code, isActive: divisions.isActive })
      .from(divisions)
      .where(eq(divisions.id, fields.id))
      .limit(1);
    if (!division) return { error: "Divisi tidak ditemukan." };

    try {
      await db.batch([
        db.update(divisions).set({ name: fields.name, code: fields.code }).where(eq(divisions.id, fields.id)),
        db.insert(activityLogs).values(
          logEntry(manager.actor.id, "division.updated", fields.id, { name: division.name, code: division.code, isActive: division.isActive }, { name: fields.name, code: fields.code }, stamp),
        ),
      ]);
    } catch (error) {
      return uniqueViolation(error);
    }
  } else {
    const divisionId = newId("division");
    try {
      await db.batch([
        db.insert(divisions).values({ id: divisionId, name: fields.name, code: fields.code, isActive: true, createdAt: stamp }),
        db.insert(activityLogs).values(
          logEntry(manager.actor.id, "division.created", divisionId, null, { name: fields.name, code: fields.code }, stamp),
        ),
      ]);
    } catch (error) {
      return uniqueViolation(error);
    }
  }

  revalidatePath("/master");
  return { success: true };
}

/** Menonaktifkan atau mengaktifkan kembali divisi (D9: nonaktif, bukan hapus). */
export async function setDivisionActive(input: unknown): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const schema = z.object({
    id: z.string().trim().min(1),
    isActive: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Permintaan tidak sah." };
  }
  const fields = parsed.data;

  const { db } = appContext();
  const [physical] = await db
    .select({ id: divisions.id, name: divisions.name, isActive: divisions.isActive })
    .from(divisions)
    .where(eq(divisions.id, fields.id))
    .limit(1);
  if (!physical) return { error: "Divisi tidak ditemukan." };
  if (physical.id === manager.actor.divisionId && !fields.isActive) {
    return { error: "Divisi milik akun Anda tidak dapat dinonaktifkan." };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  await db.batch([
    db.update(divisions).set({ isActive: fields.isActive }).where(eq(divisions.id, fields.id)),
    db.insert(activityLogs).values(
      logEntry(manager.actor.id, "division.updated", fields.id, physical.isActive, {
        isActive: fields.isActive,
        reason: fields.reason ?? null,
      }, stamp),
    ),
  ]);

  revalidatePath("/master");
  revalidatePath("/", "layout");
  return { success: true };
}

const categorySchema = z.object({
  /** Id hanya dikirim saat mengubah; pembuatan selalu membangkitkan id di server. */
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "Nama kategori wajib diisi.").max(80, "Nama kategori maksimal 80 karakter."),
});

export async function saveCategory(input: unknown): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data kategori tidak sah." };
  }
  const fields = parsed.data;
  const { db } = appContext();
  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  // Nama kategori unik (categories_name_uq); baris yang sedang diedit dikecualikan.
  const nameClash = await db
    .select({ id: categories.id })
    .from(categories)
    .where(fields.id ? and(eq(categories.name, fields.name), ne(categories.id, fields.id)) : eq(categories.name, fields.name))
    .limit(1);
  if (nameClash.length > 0) {
    return { error: `Kategori ${fields.name} sudah ada.` };
  }

  if (fields.id) {
    const [category] = await db
      .select({ id: categories.id, name: categories.name, isActive: categories.isActive })
      .from(categories)
      .where(eq(categories.id, fields.id))
      .limit(1);
    if (!category) return { error: "Kategori tidak ditemukan." };

    try {
      await db.batch([
        db.update(categories).set({ name: fields.name }).where(eq(categories.id, fields.id)),
        db.insert(activityLogs).values(
          logEntry(manager.actor.id, "category.updated", fields.id, { name: category.name, isActive: category.isActive }, { name: fields.name }, stamp),
        ),
      ]);
    } catch (error) {
      return uniqueViolation(error);
    }
  } else {
    const categoryId = newId("category");
    try {
      await db.batch([
        db.insert(categories).values({ id: categoryId, name: fields.name, isActive: true, createdAt: stamp }),
        db.insert(activityLogs).values(
          logEntry(manager.actor.id, "category.created", categoryId, null, { name: fields.name }, stamp),
        ),
      ]);
    } catch (error) {
      return uniqueViolation(error);
    }
  }

  revalidatePath("/master");
  return { success: true };
}

export async function setCategoryActive(input: unknown): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const schema = z.object({ id: z.string().trim().min(1), isActive: z.boolean() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Permintaan tidak sah." };
  }
  const fields = parsed.data;

  const { db } = appContext();
  const [physical] = await db
    .select({ id: categories.id, isActive: categories.isActive })
    .from(categories)
    .where(eq(categories.id, fields.id))
    .limit(1);
  if (!physical) return { error: "Kategori tidak ditemukan." };

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  await db.batch([
    db.update(categories).set({ isActive: fields.isActive }).where(eq(categories.id, fields.id)),
    db.insert(activityLogs).values(
      logEntry(manager.actor.id, "category.updated", fields.id, physical.isActive, fields, stamp),
    ),
  ]);

  revalidatePath("/master");
  return { success: true };
}

// ============================================================
// Penghapusan master (permintaan pengguna Fase 6)
// ============================================================

/**
 * Menghapus akun pengguna secara permanen. Blokir bila akun masih menjadi
 * sumber data riwayat (tugas, penugasan, pengumpulan, lampiran, reviu) karena
 * skema memilih FK restrict demi integritas arsip; akun beriwayat pakai
 * nonaktif. Relasi CASCADE (sesi, notifikasi, preferensi) dieksekusi basis
 * data; penunjuk app_settings.updatedBy dikosongkan sendiri.
 */
export async function deleteUser(userId: string): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  if (userId === manager.actor.id) {
    return { error: "Akun Anda sendiri tidak dapat dihapus dari Kelola Master." };
  }

  const { db } = appContext();
  const [target] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) return { error: "Pengguna tidak ditemukan." };
  if (target.role === "SUPER_ADMIN") {
    return { error: "Akun Super Admin tidak dapat dihapus. Nonaktifkan bila akun tidak aktif lagi." };
  }

  const usage = await Promise.all([
    db.select({ n: count() }).from(tasks).where(eq(tasks.createdBy, userId)),
    db.select({ n: count() }).from(taskAssignments).where(eq(taskAssignments.userId, userId)),
    db.select({ n: count() }).from(taskSubmissions).where(eq(taskSubmissions.submittedBy, userId)),
    db.select({ n: count() }).from(attachments).where(eq(attachments.uploadedBy, userId)),
    db.select({ n: count() }).from(taskReviews).where(eq(taskReviews.reviewerId, userId)),
  ]);
  const stillReferenced = usage.some(([row]) => (row?.n ?? 0) > 0);
  if (stillReferenced) {
    return {
      error: `Pengguna masih terikat data riwayat (tugas, penugasan, pengumpulan, lampiran, atau reviu). Nonaktifkan akunnya, jangan hapus.`,
    };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  try {
    await db.batch([
      db.update(appSettings).set({ updatedBy: null }).where(eq(appSettings.updatedBy, userId)),
      db.delete(users).where(eq(users.id, userId)),
      db.insert(activityLogs).values(
        logEntry(
          manager.actor.id,
          "user.deleted",
          userId,
          { username: target.username, fullName: target.fullName, role: target.role },
          null,
          stamp,
        ),
      ),
    ]);
  } catch (error) {
    return uniqueViolation(error);
  }

  revalidatePath("/master");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Menghapus divisi dari kelola master. Blokir bila divisi masih punya anggota,
 * tugas, atau baris arsip dokumen; divisi kosong baru boleh dihapus.
 */
export async function deleteDivision(divisionId: string): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const { db } = appContext();
  const [target] = await db
    .select({ id: divisions.id, name: divisions.name, code: divisions.code })
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);
  if (!target) return { error: "Divisi tidak ditemukan." };

  const usage = await Promise.all([
    db.select({ n: count() }).from(users).where(eq(users.divisionId, divisionId)),
    db.select({ n: count() }).from(tasks).where(eq(tasks.divisionId, divisionId)),
    db.select({ n: count() }).from(documentArchive).where(eq(documentArchive.divisionId, divisionId)),
  ]);
  const stillReferenced = usage.some(([row]) => (row?.n ?? 0) > 0);
  if (stillReferenced) {
    return {
      error: "Divisi masih memiliki anggota, tugas, atau arsip dokumen. Nonaktifkan divisi bila perlu menyembunyikannya.",
    };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  try {
    await db.batch([
      db.delete(divisions).where(eq(divisions.id, divisionId)),
      db.insert(activityLogs).values(
        logEntry(
          manager.actor.id,
          "division.deleted",
          divisionId,
          { name: target.name, code: target.code },
          null,
          stamp,
        ),
      ),
    ]);
  } catch (error) {
    return uniqueViolation(error);
  }

  revalidatePath("/master");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Menghapus kategori dari kelola master. Blokir bila kategori masih dipakai
 * tugas; preferensi kategori bawaan pengguna yang menusuk kategori ini
 * dikosongkan sendiri (kolom boleh kosong).
 */
export async function deleteCategory(categoryId: string): Promise<MasterActionResult> {
  const manager = await requireManager();
  if (manager.blocked || !manager.actor) return manager.error as MasterActionResult;

  const { db } = appContext();
  const [target] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  if (!target) return { error: "Kategori tidak ditemukan." };

  const [usage] = await db
    .select({ n: count() })
    .from(tasks)
    .where(eq(tasks.categoryId, categoryId));
  if ((usage?.n ?? 0) > 0) {
    return {
      error: `Kategori masih dipakai ${usage?.n ?? 0} tugas. Nonaktifkan bila kategori tidak lagi tersedia untuk tugas baru.`,
    };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  try {
    await db.batch([
      db.update(divisions).set({ defaultCategoryId: null }).where(eq(divisions.defaultCategoryId, categoryId)),
      db.delete(categories).where(eq(categories.id, categoryId)),
      db.insert(activityLogs).values(
        logEntry(
          manager.actor.id,
          "category.deleted",
          categoryId,
          { name: target.name },
          null,
          stamp,
        ),
      ),
    ]);
  } catch (error) {
    return uniqueViolation(error);
  }

  revalidatePath("/master");
  revalidatePath("/", "layout");
  return { success: true };
}
