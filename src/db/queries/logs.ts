import { and, count, desc, eq, gte, like, lte, or, type SQL } from "drizzle-orm";
import { activityLogs, divisions, users } from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import { formatJakartaNotification } from "@/lib/time";

/**
 * Log aktivitas (UC13): baris `activity_logs` nyata dengan cakupan peran di
 * kueri (§9.3). Admin melihat log yang ditulis aktor divisinya (aksi Super
 * Admin ikut tampil karena menyentuh divisi itu), Super Admin melihat seluruh
 * baris, termasuk percobaan masuk gagal yang tidak punya aktor.
 */

export type ActivityLogItem = {
  id: string;
  timestampFormatted: string;
  actorName: string;
  actorRoleLabel: string;
  actionCode: string;
  entityType: string;
  entityLabel: string;
  entityId: string;
  summary: string;
  detailNote: string | null;
};

export type ActivityLogFilters = {
  q?: string;
  /** Kelas aksi menurut prefiks kode yang ditulis kode, mis. `task` atau `auth`. */
  aksi?: string;
  /** Nilai entityType persis (`task`, `assignment`, `user`, `users`, dst). */
  entitas?: string;
  /** Rentang WIB dalam epoch detik (dari = batas bawah, sampai = batas atas). */
  dari?: number;
  sampai?: number;
  page?: number;
  pageSize?: number;
};

export type ActivityLogResult = {
  items: ActivityLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LogActionClass = {
  id: string;
  label: string;
  /** Prefiks kode aksi (dengan titik) yang masuk kelas ini. */
  prefixes: readonly string[];
};

/**
 * Kelas aksi memakai prefiks yang sudah ditulis kode mutasi:
 * `task.*`, `submission.*`, `review.*`, `auth.*`, `account.*`, `settings.*`,
 * `division.*`, `category.*`, `user.*`, dan `archive.*`. Perpanjangan tenggat
 * (`due_date.extended`) digolongkan ke siklus tugas.
 */
export const LOG_ACTION_CLASSES: LogActionClass[] = [
  { id: "task", label: "Penugasan & pengerjaan", prefixes: ["task.", "due_date."] },
  { id: "submission", label: "Pengumpulan", prefixes: ["submission."] },
  { id: "review", label: "Verifikasi", prefixes: ["review."] },
  { id: "archive", label: "Arsip", prefixes: ["archive."] },
  { id: "auth", label: "Autentikasi", prefixes: ["auth."] },
  { id: "account", label: "Akun sendiri", prefixes: ["account."] },
  { id: "user", label: "Pengguna", prefixes: ["user."] },
  { id: "division", label: "Divisi", prefixes: ["division."] },
  { id: "category", label: "Kategori", prefixes: ["category."] },
  { id: "settings", label: "Pengaturan", prefixes: ["settings."] },
];

export const LOG_ENTITY_TYPES: { id: string; label: string }[] = [
  { id: "task", label: "Tugas" },
  { id: "assignment", label: "Penugasan" },
  { id: "user", label: "Akun pengguna" },
  { id: "users", label: "Sesi masuk" },
  { id: "master", label: "Data master" },
  { id: "division", label: "Setelan divisi" },
  { id: "settings", label: "Setelan aplikasi" },
];

/** Label tampilan entityType sesuai nilai yang ditulis kode log. */
export function entityTypeLabel(value: string): string {
  const found = LOG_ENTITY_TYPES.find((opt) => opt.id === value);
  return found ? found.label : value;
}

function logWhere(scope: Scope, filters: ActivityLogFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (scope.allDivisions) {
    // Super Admin melihat semuanya, termasuk baris tanpa aktor.
  } else {
    // Admin: aktor di divisinya sendiri, atau Super Admin karena aksinya
    // lintas divisi dan administrator di aku harus bisa memeriksanya.
    conditions.push(
      or(eq(users.divisionId, scope.divisionId), eq(users.role, "SUPER_ADMIN"))!,
    );
  }

  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        like(activityLogs.action, term),
        like(activityLogs.entityId, term),
        like(activityLogs.prevValue, term),
        like(activityLogs.newValue, term),
        like(users.fullName, term),
      )!,
    );
  }

  if (filters.aksi && LOG_ACTION_CLASSES.some((cls) => cls.id === filters.aksi)) {
    const cls = LOG_ACTION_CLASSES.find((item) => item.id === filters.aksi)!;
    const perPrefix = cls.prefixes.map((prefix) => like(activityLogs.action, `${prefix}%`));
    conditions.push(perPrefix.length === 1 ? perPrefix[0]! : or(...perPrefix)!);
  }

  if (filters.entitas && LOG_ENTITY_TYPES.some((opt) => opt.id === filters.entitas)) {
    conditions.push(eq(activityLogs.entityType, filters.entitas));
  }

  if (filters.dari !== undefined) {
    conditions.push(gte(activityLogs.createdAt, new Date(filters.dari * 1000)));
  }
  if (filters.sampai !== undefined) {
    conditions.push(lte(activityLogs.createdAt, new Date(filters.sampai * 1000)));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

const LOG_ORDER = [desc(activityLogs.createdAt), desc(activityLogs.id)] as const;

/**
 * Daftar log terpaginasi (25 per halaman). Ringkasan dan catatan detail
 * dibangun dari kolom `prev_value`/`new_value` penyimpanan JSON, di server.
 */
export async function getActivityLogList(
  db: Db,
  scope: Scope,
  filters: ActivityLogFilters = {},
): Promise<ActivityLogResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 25);
  const whereClause = logWhere(scope, filters);

  const [totalRows, rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.actorId))
      .where(whereClause),
    db
      .select({
        id: activityLogs.id,
        createdAt: activityLogs.createdAt,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        prevValue: activityLogs.prevValue,
        newValue: activityLogs.newValue,
        actorName: users.fullName,
        actorRole: users.role,
        divisionName: divisions.name,
      })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.actorId))
      .leftJoin(divisions, eq(divisions.id, users.divisionId))
      .where(whereClause)
      .orderBy(...LOG_ORDER)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const items: ActivityLogItem[] = rows.map((row) => {
    const roleLabel =
      row.actorRole === "SUPER_ADMIN"
        ? "Super Admin"
        : row.actorRole === "ADMIN"
          ? "Admin Divisi"
          : row.actorRole === "USER"
            ? "Staf"
            : "Sistem";
    const actorRoleLabel =
      row.actorRole === "USER" && row.divisionName
        ? `${roleLabel}, ${row.divisionName}`
        : roleLabel;

    return {
      id: row.id,
      timestampFormatted: formatJakartaNotification(Math.floor(row.createdAt.getTime() / 1000)),
      actorName: row.actorName ?? "Sistem",
      actorRoleLabel,
      actionCode: row.action,
      entityType: row.entityType,
      entityLabel: entityTypeLabel(row.entityType),
      entityId: row.entityId,
      ...describeActivityLog(row),
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

// ============================================================
// Ringkasan perubahan dari nilai JSON tersimpan
// ============================================================

type LogRowPayload = {
  action: string;
  entityType: string;
  entityId: string;
  prevValue: string | null;
  newValue: string | null;
};

type JsonObject = Record<string, unknown>;

function parseJsonSafe(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    // Sebagian penulis menyimpan nilai skalar mentah (mis. kode status).
    return value;
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const STATUS_LABELS: Record<string, string> = {
  BELUM_DIKERJAKAN: "Belum Dikerjakan",
  SEDANG_DIKERJAKAN: "Sedang Dikerjakan",
  MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

const PRIORITY_LABELS: Record<string, string> = {
  RENDAH: "Rendah",
  SEDANG: "Sedang",
  TINGGI: "Tinggi",
  MENDESAK: "Mendesak",
};

const FIELD_LABELS: Record<string, string> = {
  title: "judul",
  description: "deskripsi",
  categoryId: "kategori",
  priority: "prioritas",
  startDate: "mulai",
  dueDate: "tenggat",
  dueAt: "tenggat",
  receivers: "penerima",
  fullName: "nama lengkap",
  username: "nama pengguna",
  email: "surel",
  divisionId: "divisi",
  role: "peran",
  maxFileBytes: "batas ukuran unggah",
  maxFilesPerSubmission: "jumlah berkas maksimal",
  allowedTypes: "tipe berkas yang diperbolehkan",
  dueSoonDays: "batas pengingat tenggat",
  contactEmail: "surel kontak",
  defaultCategoryId: "kategori bawaan",
  defaultPriority: "prioritas bawaan",
  name: "nama",
  code: "kode",
  isActive: "status aktif",
  waNumber: "nomor WhatsApp",
  channel: "kanal",
  enabled: "aktif",
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function statusLabel(value: unknown): string {
  return typeof value === "string" ? (STATUS_LABELS[value] ?? value) : String(value ?? "");
}

function priorityLabel(value: unknown): string {
  return typeof value === "string" ? (PRIORITY_LABELS[value] ?? value) : "";
}

/** Nama kolom yang berubah antara snapshot sebelum dan sesudah. */
function changedFieldNames(
  prev: JsonObject | null,
  next: JsonObject,
  ignore: readonly string[] = [],
): string[] {
  if (!prev) return [];
  const changed: string[] = [];
  for (const key of Object.keys(next)) {
    if (ignore.includes(key)) continue;
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      changed.push(fieldLabel(key));
    }
  }
  return changed;
}

/**
 * Ringkasan (baris tabel) dan catatan detail (baris kedua) untuk setiap kode
 * aksi yang benar-benar ditulis kode mutasi. Kasus tanpa bentuk khusus jatuh
 * ke nama kolom yang berubah. Diekspor untuk uji kontrak ringkasan.
 */
export function describeActivityLog(row: LogRowPayload): { summary: string; detailNote: string | null } {
  const prev = parseJsonSafe(row.prevValue);
  const next = parseJsonSafe(row.newValue);
  const prevObj = isJsonObject(prev) ? prev : null;
  const nextObj = isJsonObject(next) ? next : {};

  switch (row.action) {
    case "task.created": {
      const receivers = Array.isArray(nextObj.receivers) ? nextObj.receivers : [];
      const priority = priorityLabel(nextObj.priority);
      return {
        summary: `Surat perintah tugas diterbitkan untuk ${receivers.length} penerima.`,
        detailNote: `Tenggat ${nextObj.dueAt ?? "-"}, prioritas ${priority || "Sedang"}.`,
      };
    }

    case "task.updated": {
      const changes =
        changedFieldNames(prevObj, nextObj, ["addedReceivers", "removedReceivers"]).join(", ") ||
        "tanpa perubahan bidang";
      const added = Array.isArray(nextObj.addedReceivers) ? nextObj.addedReceivers.length : 0;
      const removed = Array.isArray(nextObj.removedReceivers)
        ? nextObj.removedReceivers.length
        : 0;
      const receiverNote =
        added || removed ? ` penerima: ${added} ditambah, ${removed} dilepas.` : "";
      return {
        summary: "Tugas diperbarui.",
        detailNote: `Bidang berubah: ${changes}.${receiverNote}`,
      };
    }

    case "task.cancel": {
      return {
        summary: "Penugasan resmi dibatalkan.",
        detailNote: nextObj.reason ? `Alasan: ${nextObj.reason}.` : null,
      };
    }

    case "task.start": {
      return {
        summary: `Status penugasan: ${statusLabel(prev)} menjadi ${statusLabel(next)}.`,
        detailNote: null,
      };
    }

    case "task.submit": {
      const files = typeof nextObj.files === "number" ? nextObj.files : null;
      return {
        summary: `Versi ${nextObj.version ?? 1} dikirim, status menjadi ${statusLabel(nextObj.status)}.`,
        detailNote: files !== null ? `Berkas dilampirkan: ${files}.` : null,
      };
    }

    case "task.completed": {
      const version = typeof nextObj.version === "number" ? nextObj.version : null;
      return {
        summary: "Verifikasi: penugasan disetujui, dokumen masuk arsip.",
        detailNote: version !== null ? `Versi disetujui: ${version}.` : null,
      };
    }

    case "task.revision": {
      return {
        summary: `Verifikasi: minta revisi, kembali ke ${statusLabel(nextObj.status)}.`,
        detailNote: typeof nextObj.note === "string" ? `Catatan: ${nextObj.note}.` : null,
      };
    }

    case "archive.created": {
      return { summary: "Dokumen final masuk rak arsip.", detailNote: null };
    }

    case "due_date.extended": {
      return {
        summary: `Tenggat: ${prevObj?.dueAt ?? "-"} menjadi ${nextObj.dueAt ?? "-"}.`,
        detailNote: nextObj.reason ? `Alasan: ${nextObj.reason}.` : null,
      };
    }

    case "auth.login.success": {
      return {
        summary: `Login berhasil (@${nextObj.username ?? "-"}).`,
        detailNote: null,
      };
    }

    case "auth.login.failed": {
      const reason =
        nextObj.reason === "password"
          ? "kata sandi salah"
          : nextObj.reason === "inactive"
            ? "akun nonaktif"
            : "nama pengguna tak dikenal";
      return {
        summary: `Percobaan masuk gagal (@${nextObj.username ?? "-"}), ${reason}.`,
        detailNote: null,
      };
    }

    case "auth.login.throttled": {
      return {
        summary: `Percobaan masuk ditahan sementara (@${nextObj.username ?? "-"}).`,
        detailNote:
          typeof nextObj.retryAfterSeconds === "number"
            ? `Coba lagi dalam ${nextObj.retryAfterSeconds} detik.`
            : null,
      };
    }

    case "auth.logout": {
      return { summary: "Aktor keluar dari portal.", detailNote: null };
    }

    case "auth.password.change": {
      return { summary: "Kata sandi akun diubah oleh pemiliknya.", detailNote: null };
    }

    case "account.email.request": {
      return {
        summary: "Permintaan ganti surel dibuat, menunggu konfirmasi.",
        detailNote: "Surel konfirmasi dikirim ke alamat baru.",
      };
    }

    case "account.email.confirm": {
      return { summary: "Surel akun berhasil diganti setelah konfirmasi.", detailNote: null };
    }

    case "account.wa.verify": {
      return { summary: "Nomor WhatsApp akun terverifikasi.", detailNote: null };
    }

    case "account.notification.preference": {
      return {
        summary: `Preferensi pengingat kanal ${nextObj.channel ?? "-"} ${
          nextObj.enabled ? "diaktifkan" : "dimatikan"
        }.`,
        detailNote: null,
      };
    }

    case "user.created": {
      return {
        summary: `Akun baru @${nextObj.username ?? "-"} dibuat dengan peran ${nextObj.role ?? "-"}.`,
        detailNote: null,
      };
    }

    case "user.updated": {
      const changes = changedFieldNames(prevObj, nextObj).join(", ") || "tanpa perubahan bidang";
      return {
        summary: "Data akun pengguna diperbarui.",
        detailNote: `Bidang berubah: ${changes}.`,
      };
    }

    case "user.password_reset": {
      return {
        summary: "Kata sandi pengguna dikembalikan ke sandi awal.",
        detailNote: null,
      };
    }

    case "user.activated": {
      return { summary: "Akun pengguna diaktifkan.", detailNote: null };
    }

    case "user.deactivated": {
      return {
        summary: "Akun pengguna dinonaktifkan.",
        detailNote: nextObj.reason ? `Alasan: ${nextObj.reason}.` : null,
      };
    }

    case "division.updated": {
      const changes = changedFieldNames(prevObj, nextObj).join(", ") || "setelan divisi";
      return {
        summary: "Divisi diperbarui.",
        detailNote: `Bidang berubah: ${changes}.`,
      };
    }

    case "settings.updated": {
      const changes = changedFieldNames(prevObj, nextObj).join(", ") || "tanpa perubahan bidang";
      return {
        summary: "Setelan aplikasi diperbarui.",
        detailNote: `Bidang berubah: ${changes}.`,
      };
    }

    case "category.created": {
      return {
        summary: `Kategori ${nextObj.name ?? "-"} dibuat.`,
        detailNote: null,
      };
    }

    case "division.created": {
      return {
        summary: `Divisi ${nextObj.name ?? "-"} (${nextObj.code ?? "-"}) dibuat.`,
        detailNote: null,
      };
    }

    case "category.updated": {
      const changes = changedFieldNames(prevObj, nextObj).join(", ") || "data kategori";
      return {
        summary: "Kategori diperbarui.",
        detailNote: `Bidang berubah: ${changes}.`,
      };
    }

    case "authz.denied": {
      return {
        summary: "Permintaan di luar wewenang ditolak.",
        detailNote: null,
      };
    }

    default: {
      const changes = changedFieldNames(prevObj, nextObj);
      return {
        summary: `Aksi ${row.action} tercatat.`,
        detailNote: changes.length > 0 ? `Bidang berubah: ${changes.join(", ")}.` : null,
      };
    }
  }
}
