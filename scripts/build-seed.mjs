/**
 * Membangkitkan seed/seed.sql (data awal untuk pengembangan lokal & staging).
 *
 *   node scripts/build-seed.mjs
 *
 * Node 24 menjalankan impor .ts langsung (type stripping), jadi fungsi hash yang
 * dipakai aplikasi di sini adalah fungsi yang sama, tidak ada format yang diduplikasi.
 * Kata sandi di berkas ini hanya untuk lingkungan pengembangan, bukan produksi.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/lib/auth/password.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const now = Math.floor(Date.now() / 1000);

const DIVISIONS = [
  ["div_hukum", "Hukum & Sengketa", "HUK"],
  ["div_pengawasan", "Pengawasan", "PGS"],
  ["div_sdm", "SDM & Organisasi", "SDM"],
  ["div_sekretariat", "Sekretariat", "SEK"],
  ["div_penindakan", "Penindakan", "TND"],
];

const CATEGORIES = [
  "Kepegawaian",
  "Persuratan",
  "Kearsipan",
  "Keuangan",
  "Aset/BMN",
  "Kegiatan dan Laporan",
  "Kepatuhan",
  "SDM dan Keamanan",
];

export const SEED_PASSWORD = "Bawaslu#2026";

const USERS = [
  ["usr_sa", "div_sekretariat", "super.admin", "Super Admin", "SUPER_ADMIN"],
  ["usr_admin_hukum", "div_hukum", "admin.hukum", "Admin Hukum & Sengketa", "ADMIN"],
  ["usr_admin_pengawasan", "div_pengawasan", "admin.pengawasan", "Admin Pengawasan", "ADMIN"],
  ["usr_staf_hukum", "div_hukum", "staf.hukum", "Staf Hukum & Sengketa", "USER"],
  ["usr_staf_pengawasan", "div_pengawasan", "staf.pengawasan", "Staf Pengawasan", "USER"],
];

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const lines = [
  "-- Seed pengembangan: 5 divisi, 8 kategori, 5 akun (1 Super Admin, 2 Admin divisi, 2 Staf).",
  "-- Dihasilkan oleh scripts/build-seed.mjs: jangan diedit manual.",
  "-- Kata sandi semua akun seed: " + SEED_PASSWORD,
  "",
];

for (const [id, name, code] of DIVISIONS) {
  lines.push(
    `INSERT OR IGNORE INTO divisions (id, name, code, is_active, created_at) VALUES (${quote(id)}, ${quote(name)}, ${quote(code)}, 1, ${now});`,
  );
}

for (const name of CATEGORIES) {
  lines.push(
    `INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES (${quote(`cat_${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_")}`)}, ${quote(name)}, 1, ${now});`,
  );
}

for (const [id, divisionId, username, fullName, role] of USERS) {
  const hash = await hashPassword(SEED_PASSWORD);
  lines.push(
    `INSERT OR IGNORE INTO users (id, division_id, username, email, full_name, nip, position, password_hash, password_changed_at, role, is_active, last_login_at, created_at, updated_at) VALUES (${quote(id)}, ${quote(divisionId)}, ${quote(username)}, ${quote(`${username}@contoh.local`)}, ${quote(fullName)}, NULL, ${quote(role === "USER" ? "Staf Pelaksana" : "Pengelola")}, ${quote(hash)}, ${now}, ${quote(role)}, 1, NULL, ${now}, ${now});`,
  );
}

const TASKS = [
  {
    id: "tsk_huk_1",
    divisionId: "div_hukum",
    categoryId: "cat_kegiatan_dan_laporan",
    taskNumber: "HUK/2026/10/001",
    title: "Laporan Hasil Pengawasan Wilayah A",
    description: "Pengawasan pleno dan pencocokan data saksi wilayah A.",
    priority: "MENDESAK",
    createdBy: "usr_admin_hukum",
    startAt: now - 3600 * 24 * 2,
    dueAt: now + 3600 * 8, // Sisa 8 jam hari ini
    assignments: [
      {
        id: "asg_huk_1",
        userId: "usr_staf_hukum",
        status: "SEDANG_DIKERJAKAN",
        needsRevision: true,
        revisionCount: 1,
      },
    ],
  },
  {
    id: "tsk_huk_2",
    divisionId: "div_hukum",
    categoryId: "cat_persuratan",
    taskNumber: "HUK/2026/10/002",
    title: "Penyusunan Berita Acara Pleno Rekapitulasi",
    description: "Format berita acara resmi pleno rekapitulasi tingkat kota.",
    priority: "SEDANG",
    createdBy: "usr_admin_hukum",
    startAt: now - 3600 * 12,
    dueAt: now + 3600 * 24 * 3, // Sisa 3 hari
    assignments: [
      {
        id: "asg_huk_2",
        userId: "usr_staf_hukum",
        status: "BELUM_DIKERJAKAN",
        needsRevision: false,
      },
    ],
  },
  {
    id: "tsk_huk_3",
    divisionId: "div_hukum",
    categoryId: "cat_kearsipan",
    taskNumber: "HUK/2026/10/003",
    title: "Pengunggahan Dokumen C1 Pleno",
    description: "Pengarsipan salinan digital dokumen C1 pleno hasil verifikasi.",
    priority: "TINGGI",
    createdBy: "usr_admin_hukum",
    startAt: now - 3600 * 24 * 4,
    dueAt: now + 3600 * 24, // Besok
    assignments: [
      {
        id: "asg_huk_3",
        userId: "usr_staf_hukum",
        status: "MENUNGGU_VERIFIKASI",
        needsRevision: false,
      },
    ],
  },
];

for (const t of TASKS) {
  lines.push(
    `INSERT INTO tasks (id, division_id, category_id, task_number, title, description, priority, created_by, start_at, due_at, created_at, updated_at) VALUES (${quote(t.id)}, ${quote(t.divisionId)}, ${quote(t.categoryId)}, ${quote(t.taskNumber)}, ${quote(t.title)}, ${quote(t.description)}, ${quote(t.priority)}, ${quote(t.createdBy)}, ${t.startAt}, ${t.dueAt}, ${now}, ${now}) ON CONFLICT(id) DO UPDATE SET division_id = excluded.division_id, category_id = excluded.category_id, task_number = excluded.task_number, title = excluded.title, description = excluded.description, priority = excluded.priority, created_by = excluded.created_by, start_at = excluded.start_at, due_at = excluded.due_at, cancelled_at = NULL, cancel_reason = NULL, updated_at = excluded.updated_at;`,
  );
  for (const a of t.assignments) {
    lines.push(
      `INSERT INTO task_assignments (id, task_id, user_id, status, needs_revision, revision_count, created_at, updated_at) VALUES (${quote(a.id)}, ${quote(t.id)}, ${quote(a.userId)}, ${quote(a.status)}, ${a.needsRevision ? 1 : 0}, ${a.revisionCount ?? 0}, ${now}, ${now}) ON CONFLICT(id) DO UPDATE SET task_id = excluded.task_id, user_id = excluded.user_id, status = excluded.status, needs_revision = excluded.needs_revision, revision_count = excluded.revision_count, started_at = NULL, submitted_at = NULL, completed_at = NULL, cancelled_at = NULL, updated_at = excluded.updated_at;`,
    );
  }
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function formatWib(epochSeconds) {
  const shifted = new Date((epochSeconds + 7 * 3600) * 1000);
  const day = shifted.getUTCDate();
  const month = MONTH_NAMES[shifted.getUTCMonth()];
  const year = shifted.getUTCFullYear();
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes} WIB`;
}

const due1 = formatWib(now + 3600 * 8);
const due2 = formatWib(now + 3600 * 24 * 3);

const NOTIFICATIONS = [
  {
    id: "ntf_seed_assign_1",
    userId: "usr_staf_hukum",
    type: "TASK_ASSIGNED",
    taskId: "tsk_huk_1",
    message: `Dari Admin Hukum & Sengketa. Tenggat ${due1}.`,
    readAt: null,
    createdAt: now - 3600 * 2,
  },
  {
    id: "ntf_seed_revision_1",
    userId: "usr_staf_hukum",
    type: "REVISION_REQUESTED",
    taskId: "tsk_huk_1",
    message:
      "Tugas dikembalikan oleh Admin Divisi. Catatan admin: tanda tangan saksi belum lengkap pada berita acara.",
    readAt: null,
    createdAt: now - 3600 * 24,
  },
  {
    id: "ntf_seed_due_1",
    userId: "usr_staf_hukum",
    type: "DUE_SOON",
    taskId: "tsk_huk_1",
    message: `Tenggat ${due1}, sisa 8 jam.`,
    readAt: null,
    createdAt: now - 1800,
  },
  {
    id: "ntf_seed_assign_2",
    userId: "usr_staf_hukum",
    type: "TASK_ASSIGNED",
    taskId: "tsk_huk_2",
    message: `Dari Admin Hukum & Sengketa. Tenggat ${due2}.`,
    readAt: now - 3600 * 24 * 2,
    createdAt: now - 3600 * 24 * 3,
  },
  {
    id: "ntf_seed_submission_1",
    userId: "usr_admin_hukum",
    type: "SUBMISSION_RECEIVED",
    taskId: "tsk_huk_3",
    message:
      "Staf Hukum & Sengketa mengumpulkan berkas hasil kerja. Menunggu verifikasi Anda di panel reviu penugasan.",
    readAt: null,
    createdAt: now - 3600,
  },
];

for (const n of NOTIFICATIONS) {
  lines.push(
    `INSERT INTO notifications (id, user_id, type, entity_type, entity_id, message, read_at, created_at) VALUES (${quote(n.id)}, ${quote(n.userId)}, ${quote(n.type)}, 'task', ${quote(n.taskId)}, ${quote(n.message)}, ${n.readAt ?? "NULL"}, ${n.createdAt}) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, type = excluded.type, entity_type = excluded.entity_type, entity_id = excluded.entity_id, message = excluded.message, read_at = excluded.read_at, created_at = excluded.created_at;`,
  );
}

const outPath = resolve(root, "seed/seed.sql");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`seed/seed.sql ditulis: ${DIVISIONS.length} divisi, ${CATEGORIES.length} kategori, ${USERS.length} akun.`);
