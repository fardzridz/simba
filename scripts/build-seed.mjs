/**
 * Membangkitkan seed/seed.sql (data awal untuk pengembangan lokal & staging).
 *
 *   node scripts/build-seed.mjs
 *
 * Node 24 menjalankan impor .ts langsung (type stripping), jadi fungsi hash yang
 * dipakai aplikasi di sini adalah fungsi yang sama, tidak ada format yang diduplikasi.
 * Kata sandi di berkas ini hanya untuk lingkungan pengembangan, bukan produksi.
 */
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
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
  {
    id: "tsk_huk_4",
    divisionId: "div_hukum",
    categoryId: "cat_kearsipan",
    taskNumber: "HUK/2026/10/004",
    title: "Rekap Berita Acara Rapat Koordinasi",
    description: "Rekap berita acara rapat koordinasi bulanan beserta rekap data saksi.",
    priority: "SEDANG",
    createdBy: "usr_admin_hukum",
    startAt: now - 3600 * 24 * 5,
    dueAt: now - 3600 * 24 * 2, // selesai sebelum tenggat
    assignments: [
      {
        id: "asg_huk_4",
        userId: "usr_staf_hukum",
        status: "SELESAI",
        needsRevision: false,
        startedAt: now - 3600 * 24 * 4,
        submittedAt: now - 3600 * 24 * 2 - 3600 * 4,
        completedAt: now - 3600 * 24 * 2,
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
      `INSERT INTO task_assignments (id, task_id, user_id, status, needs_revision, revision_count, started_at, submitted_at, completed_at, created_at, updated_at) VALUES (${quote(a.id)}, ${quote(t.id)}, ${quote(a.userId)}, ${quote(a.status)}, ${a.needsRevision ? 1 : 0}, ${a.revisionCount ?? 0}, ${a.startedAt ?? "NULL"}, ${a.submittedAt ?? "NULL"}, ${a.completedAt ?? "NULL"}, ${now}, ${now}) ON CONFLICT(id) DO UPDATE SET task_id = excluded.task_id, user_id = excluded.user_id, status = excluded.status, needs_revision = excluded.needs_revision, revision_count = excluded.revision_count, started_at = excluded.started_at, submitted_at = excluded.submitted_at, completed_at = excluded.completed_at, cancelled_at = NULL, updated_at = excluded.updated_at;`,
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

/**
 * Satu tugas selesai lengkap dengan pengumpulan COMMITTED, review APPROVED,
 * dan baris arsip, supaya Katalog Dokumen Final memuat contoh nyata dan
 * tombol unduhan benar-benar mengambil objek dari R2 lokal.
 */
function minimalPdf(title, bodyLines) {
  const esc = (s) =>
    s.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const content = [
    "BT",
    "/F1 16 Tf",
    "56 780 Td",
    `(${esc(title)}) Tj`,
    "/F1 11 Tf",
    "0 -32 Td",
    ...bodyLines.map((line) => `(${esc(line)}) Tj 0 -16 Td`),
    "ET",
  ].join("\n");
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const csvRekapSaksi = [
  "Nomor Tugas,Judul,Tanggal Kegiatan,Jumlah Saksi Diperiksa,Keterangan",
  `HUK/2026/10/004,Rapat Koordinasi Bulanan,${formatWib(now - 3600 * 24 * 5)},24,Rekapitulasi berita acara rapat koordinasi bulanan`,
  `HUK/2026/10/004,Rapat Koordinasi Pengawasan Wilayah B,${formatWib(now - 3600 * 24 * 4)},17,Lanjutan pencocokan data saksi wilayah B`,
].join("\n");

const ARCHIVED_SEED = {
  submissionId: "sub_huk_4_v1",
  assignmentId: "asg_huk_4",
  taskId: "tsk_huk_4",
  archiveId: "doc_huk_4",
  archiveTitle: "Rekap Berita Acara Rapat Koordinasi",
  submittedAt: now - 3600 * 24 * 2 - 3600 * 4,
  reviewedAt: now - 3600 * 24 * 2,
  files: [
    {
      id: "att_huk_4_1",
      name: "berita-acara-rapat-koordinasi.pdf",
      mime: "application/pdf",
      content: minimalPdf("Berita Acara Rapat Koordinasi", [
        "Nomor tugas : HUK/2026/10/004",
        "Disusun oleh : Staf Hukum & Sengketa",
        "Isi : rekapitulasi berita acara rapat koordinasi bulanan tingkat kota.",
        "Berkas contoh seed pengembangan.",
      ]),
    },
    {
      id: "att_huk_4_2",
      name: "rekap-data-saksi.csv",
      mime: "text/csv",
      content: Buffer.from(csvRekapSaksi, "utf8"),
    },
  ],
};

const seedMonth = new Date().toISOString().slice(0, 7);
for (const file of ARCHIVED_SEED.files) {
  file.storedKey = `uploads/div_hukum/${seedMonth}/${file.id}-${file.name}`;
  file.checksum = createHash("sha256").update(file.content).digest("hex");
  file.sizeBytes = file.content.length;
}

lines.push(
  `INSERT INTO task_submissions (id, assignment_id, version, notes, state, idempotency_key, submitted_by, created_at) VALUES (${quote(ARCHIVED_SEED.submissionId)}, ${quote(ARCHIVED_SEED.assignmentId)}, 1, ${quote("Rekap berita acara dan rekap data saksi terlampir.")}, 'COMMITTED', ${quote("seed-huk-4-v1")}, ${quote("usr_staf_hukum")}, ${ARCHIVED_SEED.submittedAt}) ON CONFLICT(id) DO UPDATE SET assignment_id = excluded.assignment_id, version = excluded.version, notes = excluded.notes, state = excluded.state, idempotency_key = excluded.idempotency_key, submitted_by = excluded.submitted_by, created_at = excluded.created_at;`,
);
for (const file of ARCHIVED_SEED.files) {
  lines.push(
    `INSERT INTO attachments (id, submission_id, original_name, stored_key, mime_type, size_bytes, checksum_sha256, state, uploaded_by, created_at) VALUES (${quote(file.id)}, ${quote(ARCHIVED_SEED.submissionId)}, ${quote(file.name)}, ${quote(file.storedKey)}, ${quote(file.mime)}, ${file.sizeBytes}, ${quote(file.checksum)}, 'COMMITTED', ${quote("usr_staf_hukum")}, ${ARCHIVED_SEED.submittedAt}) ON CONFLICT(id) DO UPDATE SET submission_id = excluded.submission_id, original_name = excluded.original_name, stored_key = excluded.stored_key, mime_type = excluded.mime_type, size_bytes = excluded.size_bytes, checksum_sha256 = excluded.checksum_sha256, state = excluded.state, uploaded_by = excluded.uploaded_by, created_at = excluded.created_at;`,
  );
}
lines.push(
  `INSERT INTO task_reviews (id, submission_id, reviewer_id, decision, feedback, created_at) VALUES ('rev_huk_4_v1', ${quote(ARCHIVED_SEED.submissionId)}, 'usr_admin_hukum', 'APPROVED', NULL, ${ARCHIVED_SEED.reviewedAt}) ON CONFLICT(id) DO UPDATE SET submission_id = excluded.submission_id, reviewer_id = excluded.reviewer_id, decision = excluded.decision, feedback = excluded.feedback, created_at = excluded.created_at;`,
);
lines.push(
  `INSERT INTO document_archive (id, assignment_id, submission_id, task_id, division_id, title, archived_at) VALUES (${quote(ARCHIVED_SEED.archiveId)}, ${quote(ARCHIVED_SEED.assignmentId)}, ${quote(ARCHIVED_SEED.submissionId)}, ${quote(ARCHIVED_SEED.taskId)}, 'div_hukum', ${quote(ARCHIVED_SEED.archiveTitle)}, ${ARCHIVED_SEED.reviewedAt}) ON CONFLICT(id) DO UPDATE SET assignment_id = excluded.assignment_id, submission_id = excluded.submission_id, task_id = excluded.task_id, division_id = excluded.division_id, title = excluded.title, archived_at = excluded.archived_at;`,
);
lines.push(
  `INSERT INTO activity_logs (id, actor_id, action, entity_type, entity_id, prev_value, new_value, ip_address, created_at) VALUES ('log_seed_huk_4_submit', 'usr_staf_hukum', 'submission.created', 'assignment', ${quote(ARCHIVED_SEED.assignmentId)}, NULL, ${quote("Versi 1 dikirim, 2 berkas.")}, NULL, ${ARCHIVED_SEED.submittedAt}) ON CONFLICT(id) DO UPDATE SET actor_id = excluded.actor_id, action = excluded.action, entity_type = excluded.entity_type, entity_id = excluded.entity_id, prev_value = excluded.prev_value, new_value = excluded.new_value, ip_address = excluded.ip_address, created_at = excluded.created_at;`,
);
lines.push(
  `INSERT INTO activity_logs (id, actor_id, action, entity_type, entity_id, prev_value, new_value, ip_address, created_at) VALUES ('log_seed_huk_4_review', 'usr_admin_hukum', 'assignment.reviewed', 'assignment', ${quote(ARCHIVED_SEED.assignmentId)}, ${quote("MENUNGGU_VERIFIKASI")}, ${quote("SELESAI")}, NULL, ${ARCHIVED_SEED.reviewedAt}) ON CONFLICT(id) DO UPDATE SET actor_id = excluded.actor_id, action = excluded.action, entity_type = excluded.entity_type, entity_id = excluded.entity_id, prev_value = excluded.prev_value, new_value = excluded.new_value, ip_address = excluded.ip_address, created_at = excluded.created_at;`,
);

// Unggah objek berkas ke R2 lokal supaya unduhan benar-benar berfungsi.
const tmpDir = mkdtempSync(resolve(tmpdir(), "seed-r2-"));
try {
  for (const file of ARCHIVED_SEED.files) {
    const filePath = resolve(tmpDir, file.id);
    writeFileSync(filePath, file.content);
    const key = `penugasan-files/${file.storedKey}`;
    execSync(
      `npx wrangler r2 object put "${key}" --file "${filePath}" --content-type "${file.mime}" --local`,
      { stdio: "inherit", cwd: root },
    );
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

const outPath = resolve(root, "seed/seed.sql");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(
  `seed/seed.sql ditulis: ${DIVISIONS.length} divisi, ${CATEGORIES.length} kategori, ${USERS.length} akun, ${ARCHIVED_SEED.files.length} berkas arsip (R2 lokal terisi).`,
);
