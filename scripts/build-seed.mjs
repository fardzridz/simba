/**
 * Membangkitkan seed/seed.sql (data awal untuk pengembangan lokal & staging).
 *
 *   node scripts/build-seed.mjs
 *
 * Skrip ini mengimpor `src/lib/auth/password.ts` (fungsi hash yang sama dengan
 * aplikasi, jadi tidak ada format sandi yang diduplikasi). Node 24+ menjalankan
 * impor .ts langsung; pada Node 22 tambahkan `--experimental-strip-types`.
 * Kata sandi di berkas ini hanya untuk lingkungan pengembangan, bukan produksi.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/lib/auth/password.ts";
import { minimalPdf } from "./lib/minimal-pdf.mjs";

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

const lines = process.argv.includes("--prod-master")
  ? [
      "-- Seed produksi (master data) tanpa akun pengguna: 5 divisi, 8 kategori.",
      "-- Dihasilkan oleh scripts/build-seed.mjs --prod-master; jangan diedit manual.",
      "-- Akun pertama (Super Admin) dibuat lewat scripts/bootstrap-admin.mjs (UC02)",
      "-- dengan kata sandi yang tidak tersimpan di repositori ini.",
      "",
    ]
  : [
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

// Mode produksi berhenti di sini: master data saja, tanpa akun dan demo.
if (process.argv.includes("--prod-master")) {
  const prodPath = resolve(root, "seed/seed-prod.sql");
  mkdirSync(dirname(prodPath), { recursive: true });
  writeFileSync(prodPath, `${lines.join("\n")}\n`, "utf8");
  console.log(
    `seed/seed-prod.sql ditulis: ${DIVISIONS.length} divisi, ${CATEGORIES.length} kategori, tanpa akun pengguna.`,
  );
  process.exit(0);
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
        // Sudah pernah mengumpulkan v1, direvisi admin, kini mengerjakan v2.
        startedAt: now - 3600 * 36,
        submittedAt: now - 3600 * 30,
        submission: {
          id: "sub_huk_1",
          version: 1,
          notes: "Draft laporan wilayah A periode pleno.",
          idempotencyKey: "seed_sub_huk_1_v1_key",
          files: [
            {
              id: "att_huk_1",
              name: "laporan-pengawasan-wilayah-a.pdf",
              titleLines: [
                "Laporan Hasil Pengawasan Wilayah A",
                "Divisi Hukum & Sengketa",
                "Berkas contoh data seed SIMBA.",
              ],
            },
          ],
        },
        review: {
          id: "rev_huk_1",
          decision: "REVISION_REQUIRED",
          feedback: "Tanda tangan saksi belum lengkap pada berita acara.",
          reviewer: "usr_admin_hukum",
          createdAt: now - 3600 * 24,
        },
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
        // Pengumpulan v1 menunggu verifikasi admin (panel reviu).
        startedAt: now - 3600 * 48,
        submittedAt: now - 3600 * 6,
        submission: {
          id: "sub_huk_3",
          version: 1,
          notes: "Dokumen C1 pleno hasil verifikasi BPW.",
          idempotencyKey: "seed_sub_huk_3_v1_key",
          files: [
            {
              id: "att_huk_3",
              name: "dokumen-c1-pleno.pdf",
              titleLines: [
                "Dokumen C1 Pleno",
                "Divisi Hukum & Sengketa",
                "Berkas contoh data seed SIMBA.",
              ],
            },
          ],
        },
      },
    ],
  },
];

const SEED_ASSIGNMENT_IDS = TASKS.flatMap((t) =>
  t.assignments.map((a) => a.id),
);
const assignmentIdList = SEED_ASSIGNMENT_IDS.map(quote).join(", ");

// Bersihkan turunan pengumpulan lama agar rebuild seed tidak meninggalkan
// baris pengumpulan dan lampiran yang sudah tidak cocok dengan keadaan seed.
// Urutan penghapusan mengikuti FK restrict: arsip, reviu, lampiran, lalu
// pengumpulan.
lines.push(
  `DELETE FROM document_archive WHERE assignment_id IN (${assignmentIdList});`,
  `DELETE FROM task_reviews WHERE submission_id IN (SELECT id FROM task_submissions WHERE assignment_id IN (${assignmentIdList}));`,
  `DELETE FROM attachments WHERE submission_id IN (SELECT id FROM task_submissions WHERE assignment_id IN (${assignmentIdList}));`,
  `DELETE FROM task_submissions WHERE assignment_id IN (${assignmentIdList});`,
);

// Kunci objek mengikuti pola aplikasi `uploads/<divisi>/<bulan_YYYYMM>/`,
// dengan nama berkas deterministik agar unduhan seed selalu menunjuk objek
// yang sama di R2.
const monthKey = new Date(now * 1000).toISOString().slice(0, 7).replace("-", "");

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const seedFilesDir = resolve(root, "seed/files");
mkdirSync(seedFilesDir, { recursive: true });
const r2Uploads = [];

for (const t of TASKS) {
  lines.push(
    `INSERT INTO tasks (id, division_id, category_id, task_number, title, description, priority, created_by, start_at, due_at, created_at, updated_at) VALUES (${quote(t.id)}, ${quote(t.divisionId)}, ${quote(t.categoryId)}, ${quote(t.taskNumber)}, ${quote(t.title)}, ${quote(t.description)}, ${quote(t.priority)}, ${quote(t.createdBy)}, ${t.startAt}, ${t.dueAt}, ${now}, ${now}) ON CONFLICT(id) DO UPDATE SET division_id = excluded.division_id, category_id = excluded.category_id, task_number = excluded.task_number, title = excluded.title, description = excluded.description, priority = excluded.priority, created_by = excluded.created_by, start_at = excluded.start_at, due_at = excluded.due_at, cancelled_at = NULL, cancel_reason = NULL, updated_at = excluded.updated_at;`,
  );
  for (const a of t.assignments) {
    const startedAt = a.startedAt ?? null;
    const submittedAt = a.submittedAt ?? null;
    lines.push(
      `INSERT INTO task_assignments (id, task_id, user_id, status, needs_revision, revision_count, started_at, submitted_at, created_at, updated_at) VALUES (${quote(a.id)}, ${quote(t.id)}, ${quote(a.userId)}, ${quote(a.status)}, ${a.needsRevision ? 1 : 0}, ${a.revisionCount ?? 0}, ${startedAt ?? "NULL"}, ${submittedAt ?? "NULL"}, ${now}, ${now}) ON CONFLICT(id) DO UPDATE SET task_id = excluded.task_id, user_id = excluded.user_id, status = excluded.status, needs_revision = excluded.needs_revision, revision_count = excluded.revision_count, started_at = ${startedAt ?? "NULL"}, submitted_at = ${submittedAt ?? "NULL"}, completed_at = NULL, cancelled_at = NULL, updated_at = excluded.updated_at;`,
    );
    if (!a.submission) continue;

    const s = a.submission;
    lines.push(
      `INSERT INTO task_submissions (id, assignment_id, version, notes, state, idempotency_key, submitted_by, created_at) VALUES (${quote(s.id)}, ${quote(a.id)}, ${s.version}, ${quote(s.notes)}, 'COMMITTED', ${quote(s.idempotencyKey)}, ${quote(a.userId)}, ${submittedAt}) ON CONFLICT(id) DO UPDATE SET assignment_id = excluded.assignment_id, version = excluded.version, notes = excluded.notes, state = 'COMMITTED', idempotency_key = excluded.idempotency_key, submitted_by = excluded.submitted_by, created_at = excluded.created_at;`,
    );

    for (const f of s.files) {
      const storedKey = `uploads/${t.divisionId}/${monthKey}/${f.name}`;
      const bytes = minimalPdf(f.titleLines);
      writeFileSync(resolve(seedFilesDir, f.name), bytes);
      const checksum = sha256Hex(bytes);
      lines.push(
        `INSERT INTO attachments (id, submission_id, original_name, stored_key, mime_type, size_bytes, checksum_sha256, state, uploaded_by, created_at) VALUES (${quote(f.id)}, ${quote(s.id)}, ${quote(f.name)}, ${quote(storedKey)}, 'application/pdf', ${bytes.length}, ${quote(checksum)}, 'COMMITTED', ${quote(a.userId)}, ${submittedAt}) ON CONFLICT(id) DO UPDATE SET submission_id = excluded.submission_id, original_name = excluded.original_name, stored_key = excluded.stored_key, mime_type = excluded.mime_type, size_bytes = excluded.size_bytes, checksum_sha256 = excluded.checksum_sha256, state = 'COMMITTED', uploaded_by = excluded.uploaded_by, created_at = excluded.created_at;`,
      );
      r2Uploads.push({ key: storedKey, file: `seed/files/${f.name}` });
    }

    if (a.review) {
      const r = a.review;
      lines.push(
        `INSERT INTO task_reviews (id, submission_id, reviewer_id, decision, feedback, created_at) VALUES (${quote(r.id)}, ${quote(s.id)}, ${quote(r.reviewer)}, ${quote(r.decision)}, ${quote(r.feedback)}, ${r.createdAt}) ON CONFLICT(id) DO UPDATE SET submission_id = excluded.submission_id, reviewer_id = excluded.reviewer_id, decision = excluded.decision, feedback = excluded.feedback, created_at = excluded.created_at;`,
      );
    }
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
writeFileSync(
  resolve(root, "seed/seed-r2.json"),
  `${JSON.stringify(r2Uploads, null, 1)}\n`,
  "utf8",
);
console.log(
  `seed/seed.sql ditulis: ${DIVISIONS.length} divisi, ${CATEGORIES.length} kategori, ${USERS.length} akun, ${r2Uploads.length} berkas R2.`,
);
