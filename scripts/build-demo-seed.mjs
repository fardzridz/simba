/**
 * Membangkitkan data demo bervolume untuk menguji halaman laporan.
 *
 *   node scripts/build-demo-seed.mjs
 *
 * Hasil:
 *   seed/demo/seed-demo.sql   perintah INSERT untuk D1
 *   seed/demo/r2.json         daftar berkas yang harus diunggah ke R2
 *   seed/demo/files/*.pdf     berkas contoh (PDF kecil, isinya keterangan)
 *
 * Kenapa terpisah dari `build-seed.mjs`: seed dasar sengaja kecil (3 tugas) agar
 * keadaan kosong, satu halaman, dan alur kerja normal mudah diperiksa. Data
 * demo di sini mengisi halaman laporan sampai ratusan baris supaya paginasi,
 * penyaringan, dan ekspor benar-benar teruji dengan angka.
 *
 * Seluruh data bersifat karangan dan diberi awalan id `demo_`/`usr_demo_`,
 * sehingga bisa dihapus kembali tanpa menyentuh data seed maupun data asli:
 *
 *   node scripts/build-demo-seed.mjs --clean
 *
 * Rentang tanggal dihitung relatif terhadap bulan berjalan (WIB), bukan tanggal
 * mati. Dengan begitu filter "Bulan ini", "Bulan lalu", dan "Triwulan lalu"
 * selalu berisi data kapan pun skrip ini dijalankan.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPasswordNode } from "./lib/hash-node.mjs";
import { minimalPdf } from "./lib/minimal-pdf.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/** Kata sandi semua akun demo. Hanya untuk pengembangan lokal. */
export const DEMO_PASSWORD = "Bawaslu#2026";

const JAKARTA_OFFSET_SECONDS = 7 * 3600;

// ---------------------------------------------------------------------------
// Bahan dasar
// ---------------------------------------------------------------------------

const DIVISIONS = [
  { id: "div_hukum", code: "HUK", name: "Hukum & Sengketa" },
  { id: "div_pengawasan", code: "PGS", name: "Pengawasan" },
  { id: "div_sdm", code: "SDM", name: "SDM & Organisasi" },
  { id: "div_sekretariat", code: "SEK", name: "Sekretariat" },
  { id: "div_penindakan", code: "TND", name: "Penindakan" },
];

const CATEGORIES = [
  "cat_kepegawaian",
  "cat_persuratan",
  "cat_kearsipan",
  "cat_keuangan",
  "cat_aset_bmn",
  "cat_kegiatan_dan_laporan",
  "cat_kepatuhan",
  "cat_sdm_dan_keamanan",
];

/** Admin yang sudah ada di seed dasar, dipakai sebagai pembuat tugas. */
const EXISTING_ADMINS = {
  div_hukum: "usr_admin_hukum",
  div_pengawasan: "usr_admin_pengawasan",
};

/**
 * Staf tambahan. Nama dan NIP karangan; NIP mengikuti pola 18 digit
 * (8 tanggal lahir + 6 tanggal pengangkatan + 1 jenis kelamin + 3 urut).
 */
const STAFF = [
  ["div_hukum", "Ahmad Fauzi", "Staf Pelaksana", 1987, 5, 12, 2010, 1, 1],
  ["div_hukum", "Siti Rahmawati", "Analis Hukum", 1990, 8, 3, 2014, 2, 2],
  ["div_hukum", "Bagus Prasetyo", "Staf Pelaksana", 1992, 2, 21, 2016, 1, 3],
  ["div_hukum", "Nur Aisyah", "Arsiparis", 1994, 11, 7, 2018, 2, 4],
  ["div_pengawasan", "Rizal Maulana", "Staf Pelaksana", 1988, 3, 15, 2012, 1, 5],
  ["div_pengawasan", "Dewi Lestari", "Analis Data", 1991, 6, 30, 2015, 2, 6],
  ["div_pengawasan", "Hendra Wijaya", "Staf Pelaksana", 1989, 9, 9, 2013, 1, 7],
  ["div_pengawasan", "Putri Anggraini", "Verifikator", 1995, 1, 24, 2019, 2, 8],
  ["div_sdm", "Yusuf Hidayat", "Staf Pelaksana", 1986, 7, 18, 2011, 1, 9],
  ["div_sdm", "Maya Kusuma", "Analis Kepegawaian", 1993, 4, 5, 2017, 2, 10],
  ["div_sdm", "Fajar Nugroho", "Staf Pelaksana", 1990, 12, 11, 2014, 1, 11],
  ["div_sekretariat", "Ratna Sari", "Bendahara", 1985, 10, 2, 2010, 2, 12],
  ["div_sekretariat", "Agus Setiawan", "Staf Pelaksana", 1988, 6, 27, 2012, 1, 13],
  ["div_sekretariat", "Lina Marlina", "Operator Data", 1996, 3, 14, 2020, 2, 14],
  ["div_sekretariat", "Doni Saputra", "Staf Pelaksana", 1991, 8, 8, 2015, 1, 15],
  ["div_penindakan", "Wahyu Kurniawan", "Staf Pelaksana", 1987, 1, 19, 2011, 1, 16],
  ["div_penindakan", "Indra Permana", "Analis Penindakan", 1992, 5, 23, 2016, 1, 17],
  ["div_penindakan", "Sri Wahyuni", "Staf Pelaksana", 1994, 9, 1, 2018, 2, 18],
  ["div_penindakan", "Teguh Santoso", "Verifikator", 1989, 11, 29, 2013, 1, 19],
  ["div_penindakan", "Anisa Fitri", "Arsiparis", 1997, 2, 16, 2021, 2, 20],
];

/** Divisi yang belum punya admin di seed dasar mendapat satu admin demo. */
const DEMO_ADMINS = [
  ["div_sdm", "admin.sdm", "Admin SDM & Organisasi"],
  ["div_sekretariat", "admin.sekretariat", "Admin Sekretariat"],
  ["div_penindakan", "admin.penindakan", "Admin Penindakan"],
];

const POSITIONS_ADMIN = "Pengelola";

const REGIONS = [
  "Kota Pasuruan",
  "Kabupaten Pasuruan",
  "Kecamatan Bangil",
  "Kecamatan Pandaan",
  "Kecamatan Purwosari",
  "Kecamatan Grati",
  "Kecamatan Sukorejo",
  "Kecamatan Kejayan",
  "Kecamatan Wonorejo",
  "Kecamatan Lumbang",
];

const STAGES = [
  "Pencocokan dan Penelitian Daftar Pemilih",
  "Penyerahan Salinan Daftar Pemilih Tetap",
  "Rapat Pleno Rekapitulasi",
  "Pengawasan Kampanye",
  "Pengawasan Pendistribusian Logistik",
  "Pengawasan Pemungutan dan Penghitungan Suara",
];

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Judul tugas per kategori. Setiap templat memakai satu pengisi, supaya 130+
 * judul tidak menjadi salinan yang sama persis.
 */
const TITLE_TEMPLATES = {
  cat_kepegawaian: [
    ["Verifikasi Berkas Usulan Kenaikan Pangkat {x}", "period"],
    ["Rekapitulasi Daftar Hadir Pegawai {x}", "period"],
    ["Penyusunan Daftar Cuti Tahunan Pegawai {x}", "period"],
    ["Pemutakhiran Data Riwayat Jabatan Pegawai {x}", "period"],
    ["Penyusunan SK Penugasan Pegawai {x}", "region"],
  ],
  cat_persuratan: [
    ["Penomoran dan Distribusi Surat Dinas {x}", "region"],
    ["Rekapitulasi Surat Masuk dan Keluar {x}", "period"],
    ["Penyusunan Konsep Surat Undangan Rapat {x}", "region"],
    ["Pengelolaan Buku Agenda Surat {x}", "period"],
  ],
  cat_kearsipan: [
    ["Pengarsipan Berkas Penanganan Pelanggaran {x}", "region"],
    ["Pemutakhiran Daftar Arsip Aktif {x}", "period"],
    ["Penyusunan Berita Acara Pemusnahan Arsip {x}", "period"],
    ["Digitalisasi Dokumen Hasil Pengawasan {x}", "region"],
  ],
  cat_keuangan: [
    ["Penyusunan Rekapitulasi Realisasi Anggaran {x}", "period"],
    ["Verifikasi Surat Pertanggungjawaban Perjalanan Dinas {x}", "region"],
    ["Rekonsiliasi Data Belanja Pegawai {x}", "period"],
    ["Penyusunan Bahan Pemeriksaan Keuangan {x}", "period"],
  ],
  cat_aset_bmn: [
    ["Inventarisasi Barang Milik Negara {x}", "region"],
    ["Pemeriksaan Kondisi Kendaraan Dinas {x}", "region"],
    ["Pemutakhiran Kartu Inventaris Ruangan {x}", "region"],
    ["Penyusunan Laporan Mutasi Barang {x}", "period"],
  ],
  cat_kegiatan_dan_laporan: [
    ["Penyusunan Laporan Hasil Pengawasan {x}", "stage"],
    ["Rekapitulasi Data Pemilih {x}", "region"],
    ["Laporan Pengawasan Tahapan {x}", "stage"],
    ["Penyusunan Bahan Rapat Koordinasi {x}", "region"],
    ["Laporan Monitoring dan Evaluasi {x}", "period"],
  ],
  cat_kepatuhan: [
    ["Pemeriksaan Kepatuhan Prosedur {x}", "region"],
    ["Evaluasi Temuan Internal {x}", "period"],
    ["Penyusunan Laporan Kepatuhan Layanan {x}", "period"],
  ],
  cat_sdm_dan_keamanan: [
    ["Pemutakhiran Prosedur Keamanan Kantor {x}", "region"],
    ["Penyusunan Jadwal Piket Keamanan {x}", "period"],
    ["Pemeriksaan Sarana Keselamatan Kerja {x}", "region"],
  ],
};

const PRIORITIES = ["RENDAH", "SEDANG", "TINGGI", "MENDESAK"];

const NOTES_APPROVED = [
  "Berkas hasil kerja lengkap dan sesuai format.",
  "Sudah diperiksa, isinya sesuai permintaan tugas.",
  "Dokumen final diterima, masuk katalog arsip.",
];

const NOTES_REVISION = [
  "Tanda tangan saksi belum lengkap pada berita acara.",
  "Lampiran rekap belum disertakan.",
  "Tanggal pada halaman pengesahan belum sesuai.",
  "Format tabel belum mengikuti templat terbaru.",
];

const NOTIFICATION_MESSAGES = {
  TASK_ASSIGNED: "Anda menerima penugasan baru. Periksa tenggat dan rincian tugas.",
  REVISION_REQUESTED: "Tugas dikembalikan oleh Admin Divisi untuk diperbaiki.",
  SUBMISSION_RECEIVED: "Staf mengumpulkan berkas hasil kerja. Menunggu verifikasi Anda.",
  TASK_CANCELLED: "Penugasan dibatalkan oleh Admin Divisi.",
  DUE_SOON: "Tenggat tugas ini kurang dari 24 jam.",
  TASK_DUE_EXTENDED: "Tenggat tugas ini diperpanjang oleh Admin Divisi.",
};

const LOG_ACTIONS = [
  "task.created",
  "task.updated",
  "task.start",
  "task.submit",
  "task.completed",
  "task.revision",
  "task.cancel",
  "archive.created",
  "due_date.extended",
  "auth.login.success",
];

// ---------------------------------------------------------------------------
// Bantuan
// ---------------------------------------------------------------------------

/** PRNG deterministik: hasil sama untuk benih sama, tanpa Math.random. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quote(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function pad(value, width) {
  return String(value).padStart(width, "0");
}

/** Awal bulan WIB dalam epoch detik. `month0` boleh di luar 0..11. */
function wibMonthStart(year, month0) {
  return Date.UTC(year, month0, 1) / 1000 - JAKARTA_OFFSET_SECONDS;
}

/** Komponen tanggal kalender WIB dari epoch detik. */
function wibParts(seconds) {
  const shifted = new Date((seconds + JAKARTA_OFFSET_SECONDS) * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month0: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function wibDate(seconds) {
  const p = wibParts(seconds);
  return { yyyy: p.year, mm: pad(p.month0 + 1, 2), dd: pad(p.day, 2) };
}

/** Bangun epoch detik dari komponen WIB. */
function wibToEpoch(year, month0, day, hour, minute) {
  return Date.UTC(year, month0, day, hour, minute, 0) / 1000 - JAKARTA_OFFSET_SECONDS;
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pilih status berdasarkan umur tugas, supaya sebarannya masuk akal. */
function pickStatus(rng, ageDays) {
  const r = rng();
  if (ageDays > 45) {
    if (r < 0.84) return "SELESAI";
    if (r < 0.93) return "SEDANG_DIKERJAKAN";
    if (r < 0.97) return "MENUNGGU_VERIFIKASI";
    return "BELUM_DIKERJAKAN";
  }
  if (ageDays > 20) {
    if (r < 0.72) return "SELESAI";
    if (r < 0.8) return "MENUNGGU_VERIFIKASI";
    if (r < 0.9) return "SEDANG_DIKERJAKAN";
    return "BELUM_DIKERJAKAN";
  }
  if (r < 0.42) return "SELESAI";
  if (r < 0.56) return "MENUNGGU_VERIFIKASI";
  if (r < 0.76) return "SEDANG_DIKERJAKAN";
  return "BELUM_DIKERJAKAN";
}

// ---------------------------------------------------------------------------
// Model data
// ---------------------------------------------------------------------------

/**
 * Bangun seluruh baris demo di memori.
 *
 * `now` adalah epoch detik; seluruh tanggal diturunkan darinya sehingga data
 * selalu berada di sekitar bulan berjalan. Tidak ada akses berkas atau basis
 * data di sini, sehingga fungsi ini dapat diuji tanpa efek samping.
 */
export function buildDemoData({ now }) {
  const rng = mulberry32(20261112);
  const nowParts = wibParts(now);

  const users = [];
  const tasks = [];
  const assignments = [];
  const submissions = [];
  const attachments = [];
  const reviews = [];
  const archives = [];
  const notifications = [];
  const logs = [];

  // --- Akun -------------------------------------------------------------
  // Admin demo untuk divisi yang belum punya admin di seed dasar.
  const adminByDivision = { ...EXISTING_ADMINS };
  for (const [divisionId, username, fullName] of DEMO_ADMINS) {
    const id = `usr_demo_${username.replaceAll(".", "_")}`;
    users.push({
      id,
      divisionId,
      username,
      email: `${username}@contoh.local`,
      fullName,
      nip: null,
      position: POSITIONS_ADMIN,
      role: "ADMIN",
      isActive: 1,
      lastLoginAt: now - intBetween(rng, 1, 72) * 3600,
      createdAt: wibMonthStart(nowParts.year, nowParts.month0 - 6),
      updatedAt: now,
    });
    adminByDivision[divisionId] = id;
  }

  // Staf pelaksana.
  const staffByDivision = new Map();
  for (const [
    divisionId, fullName, position, birthYear, birthMonth, birthDay,
    appointYear, gender, seq,
  ] of STAFF) {
    const id = `usr_demo_staf_${pad(seq, 2)}`;
    const nip =
      `${birthYear}${pad(birthMonth, 2)}${pad(birthDay, 2)}` +
      `${appointYear}${pad(birthMonth, 2)}` +
      `${gender}${pad(seq, 3)}`;
    users.push({
      id,
      divisionId,
      username: `demo.staf.${pad(seq, 2)}`,
      email: `demo.staf.${pad(seq, 2)}@contoh.local`,
      fullName,
      nip,
      position,
      role: "USER",
      isActive: 1,
      // Sebagian akun belum pernah masuk, supaya daftar pengguna tidak seragam.
      lastLoginAt: seq % 3 === 0 ? null : now - intBetween(rng, 1, 240) * 3600,
      createdAt: wibMonthStart(nowParts.year, nowParts.month0 - 6),
      updatedAt: now,
    });
    if (!staffByDivision.has(divisionId)) staffByDivision.set(divisionId, []);
    staffByDivision.get(divisionId).push(id);
  }

  // --- Sebaran bulan ----------------------------------------------------
  // Empat bulan: tiga bulan sebelumnya dan bulan berjalan. Jumlahnya menaik
  // agar filter "Bulan ini" berisi baris terbanyak, seperti pemakaian nyata.
  const monthPlan = [
    { offset: -3, tasks: 22 },
    { offset: -2, tasks: 24 },
    { offset: -1, tasks: 34 },
    { offset: 0, tasks: 52 },
  ];

  const taskNumbersUsed = new Set();
  /** Kunci `divisi|tahun|bulan` -> nomor urut terakhir yang dipakai. */
  const taskNumberSeq = new Map();
  let taskSeq = 0;

  for (const plan of monthPlan) {
    const year = nowParts.year;
    const month0 = nowParts.month0 + plan.offset;
    const monthStart = wibMonthStart(year, month0);
    const monthEnd = wibMonthStart(year, month0 + 1);
    const parts = wibParts(monthStart);
    // Bulan berjalan hanya sampai hari ini; bulan lain dipakai penuh.
    const lastDay =
      plan.offset === 0
        ? Math.max(1, nowParts.day)
        : Math.round((monthEnd - monthStart) / 86400);

    for (let i = 0; i < plan.tasks; i += 1) {
      taskSeq += 1;
      const division = DIVISIONS[(taskSeq - 1) % DIVISIONS.length];
      const categoryId = CATEGORIES[(taskSeq * 3) % CATEGORIES.length];

      const day = intBetween(rng, 1, lastDay);
      const hour = intBetween(rng, 8, 15);
      const minute = intBetween(rng, 0, 59);
      // Bulan berjalan: jam 8–15 pada hari ini bisa BELUM lewat. Tanpa jepitan
      // ini, tugas tercatat dibuat di masa depan dan penugasannya "mulai"
      // sebelum tugas itu ada. Batas bawahnya awal bulan, supaya jepitan tidak
      // melempar tanggal ke bulan sebelumnya saat skrip dijalankan tanggal 1
      // dini hari.
      const createdAt = Math.max(
        monthStart,
        Math.min(
          wibToEpoch(parts.year, parts.month0, day, hour, minute),
          now - intBetween(rng, 5, 240) * 60,
        ),
      );
      const startAt = createdAt + intBetween(rng, 0, 2) * 86400;
      const dueAt = startAt + intBetween(rng, 3, 21) * 86400;

      const [template, fillerKind] = pick(rng, TITLE_TEMPLATES[categoryId]);
      const filler =
        fillerKind === "period"
          ? `${MONTH_NAMES[parts.month0]} ${parts.year}`
          : fillerKind === "region"
            ? pick(rng, REGIONS)
            : pick(rng, STAGES);
      const title = template.replace("{x}", filler);

      // Nomor tugas: KODE/YYYY/MM/NNN, urut per divisi per bulan.
      //
      // Urutannya mulai dari 101, bukan 1: seed dasar sudah memakai
      // HUK/2026/10/001..003 dan `tasks.task_number` berindeks unik. Rentang
      // 101+ membuat data demo tidak pernah bertabrakan dengan seed, berapa pun
      // bulan skrip ini dijalankan.
      const monthKey = `${division.id}|${parts.year}|${parts.month0}`;
      const sequence = (taskNumberSeq.get(monthKey) ?? 100) + 1;
      taskNumberSeq.set(monthKey, sequence);
      const number = `${division.code}/${parts.year}/${pad(parts.month0 + 1, 2)}/${pad(sequence, 3)}`;
      if (taskNumbersUsed.has(number)) {
        throw new Error(`Nomor tugas ganda: ${number}`);
      }
      taskNumbersUsed.add(number);

      const taskId = `tsk_demo_${pad(taskSeq, 4)}`;
      const ageDays = Math.floor((now - createdAt) / 86400);
      const priority = PRIORITIES[Math.floor(rng() * PRIORITIES.length)];

      // Sebagian kecil tugas dibatalkan; pembatalan berlaku untuk SELURUH
      // penugasannya, sama seperti perilaku aplikasi.
      //
      // Tugas yang masih sangat baru sengaja tidak dibatalkan, dan peluangnya
      // dinaikkan pada bulan berjalan. Sebelumnya peluangnya seragam, sehingga
      // seluruh pembatalan jatuh di bulan-bulan lama dan filter status
      // "Dibatalkan" pada periode bawaan (bulan ini) selalu kosong — terlihat
      // seperti filter rusak padahal datanya memang tidak ada.
      const cancelChance = plan.offset === 0 ? 0.14 : 0.06;
      const cancelled = ageDays > 2 && rng() < cancelChance;
      const cancelReason = cancelled
        ? pick(rng, [
            "Tugas digabung ke kegiatan lain yang sejenis.",
            "Kegiatan dibatalkan oleh pimpinan.",
            "Pelaksana dialihkan ke tugas mendesak lain.",
          ])
        : null;

      tasks.push({
        id: taskId,
        divisionId: division.id,
        categoryId,
        taskNumber: number,
        title,
        description: `${title}. Data demo untuk pengujian halaman laporan.`,
        priority,
        createdBy: adminByDivision[division.id],
        startAt,
        dueAt,
        cancelledAt: cancelled ? Math.min(now, dueAt) : null,
        cancelReason,
        createdAt,
        updatedAt: createdAt,
      });

      // Satu tugas bisa dikerjakan dua orang; status tiap orang berbeda.
      const staffIds = staffByDivision.get(division.id) ?? [];
      const assigneeCount = rng() < 0.15 && staffIds.length >= 2 ? 2 : 1;
      const chosen = [];
      while (chosen.length < assigneeCount) {
        const candidate = pick(rng, staffIds);
        if (!chosen.includes(candidate)) chosen.push(candidate);
      }

      for (const [index, userId] of chosen.entries()) {
        const assignmentId = `asg_demo_${pad(taskSeq, 4)}_${index + 1}`;
        const status = cancelled ? "DIBATALKAN" : pickStatus(rng, ageDays);

        let startedAt = null;
        let submittedAt = null;
        let completedAt = null;
        let revisionCount = 0;
        let needsRevision = false;
        let cancelledAt = null;

        if (status !== "BELUM_DIKERJAKAN") {
          startedAt = clampTime(createdAt + intBetween(rng, 1, 36) * 3600, createdAt, now);
        }
        if (status === "SEDANG_DIKERJAKAN") {
          revisionCount = rng() < 0.3 ? 1 : 0;
          needsRevision = revisionCount > 0;
        }
        if (status === "MENUNGGU_VERIFIKASI") {
          submittedAt = clampTime(
            dueAt - intBetween(rng, 1, 48) * 3600,
            startedAt ?? createdAt,
            now,
          );
        }
        if (status === "SELESAI") {
          // Tiga rasa: tepat waktu, terlambat, dan tepat pada detik tenggat.
          // Yang terakhir penting untuk menguji batas `completedAt <= dueAt`.
          const flavour = rng();
          if (flavour < 0.16) {
            completedAt = dueAt; // tepat pada detik tenggat: masih tepat waktu
          } else if (flavour < 0.34) {
            completedAt = dueAt + intBetween(rng, 1, 12) * 86400; // terlambat
          } else {
            completedAt = dueAt - intBetween(rng, 1, 6) * 86400; // tepat waktu
          }
          // Tidak boleh ada penyelesaian di masa depan, dan tidak boleh selesai
          // sebelum tugasnya dibuat.
          completedAt = clampTime(completedAt, createdAt, now);
          submittedAt = clampTime(
            completedAt - intBetween(rng, 1, 20) * 3600,
            createdAt,
            completedAt,
          );
          startedAt = clampTime(
            submittedAt - intBetween(rng, 1, 20) * 3600,
            createdAt,
            submittedAt,
          );
          revisionCount = rng() < 0.25 ? intBetween(rng, 1, 2) : 0;
          needsRevision = false;
        }
        if (status === "DIBATALKAN") {
          cancelledAt = clampTime(createdAt + intBetween(rng, 2, 10) * 86400, createdAt, now);
        }

        assignments.push({
          id: assignmentId,
          taskId,
          userId,
          status,
          needsRevision: needsRevision ? 1 : 0,
          revisionCount,
          startedAt,
          submittedAt,
          completedAt,
          cancelledAt,
          createdAt,
          updatedAt: completedAt ?? submittedAt ?? startedAt ?? createdAt,
        });

        // --- Pengumpulan, reviu, arsip --------------------------------
        const submissionId = `sub_demo_${pad(taskSeq, 4)}_${index + 1}`;

        if (status === "MENUNGGU_VERIFIKASI" || status === "SELESAI") {
          submissions.push({
            id: submissionId,
            assignmentId,
            version: 1,
            notes: "Berkas hasil kerja untuk ditelaah Admin Divisi.",
            state: "COMMITTED",
            idempotencyKey: `demo_${assignmentId}_v1`,
            submittedBy: userId,
            createdAt: submittedAt,
          });
        }

        // Reviu yang meminta perbaikan, untuk penugasan yang sedang dikerjakan
        // setelah dikembalikan.
        if (status === "SEDANG_DIKERJAKAN" && needsRevision) {
          submissions.push({
            id: submissionId,
            assignmentId,
            version: 1,
            notes: "Draf pertama untuk ditelaah.",
            state: "COMMITTED",
            idempotencyKey: `demo_${assignmentId}_v1`,
            submittedBy: userId,
            createdAt: clampTime(startedAt + 3600, startedAt, now),
          });
          reviews.push({
            id: `rev_demo_${pad(taskSeq, 4)}_${index + 1}`,
            submissionId,
            reviewerId: adminByDivision[division.id],
            decision: "REVISION_REQUIRED",
            feedback: pick(rng, NOTES_REVISION),
            createdAt: clampTime(startedAt + 7200, startedAt, now),
          });
        }

        // Arsip hanya untuk sebagian penugasan selesai. Penugasan selesai tanpa
        // arsip mewakili berkas lama yang belum masuk katalog, sehingga kolom
        // "Dokumen" dan ringkasan "Dokumen terarsip" tidak selalu sama persis.
        if (status === "SELESAI" && rng() < 0.55) {
          reviews.push({
            id: `rev_demo_${pad(taskSeq, 4)}_${index + 1}`,
            submissionId,
            reviewerId: adminByDivision[division.id],
            decision: "APPROVED",
            feedback: pick(rng, NOTES_APPROVED),
            createdAt: completedAt,
          });
          // Nama berkas memuat urutan petugas: satu tugas bisa dikerjakan dua
          // orang, dan `stored_key` berindeks unik — nama yang sama persis akan
          // saling menimpa.
          const fileName = `hasil-${number.replaceAll("/", "-")}-${index + 1}.pdf`;
          attachments.push({
            id: `att_demo_${pad(taskSeq, 4)}_${index + 1}`,
            submissionId,
            originalName: fileName,
            storedKey: `uploads/${division.id}/${wibDate(createdAt).yyyy}${wibDate(createdAt).mm}/${fileName}`,
            mimeType: "application/pdf",
            sizeBytes: 0,
            checksumSha256: "",
            state: "COMMITTED",
            uploadedBy: userId,
            createdAt: submittedAt,
            titleLines: [title, division.name, "Berkas contoh data demo SIMBA."],
          });
          archives.push({
            id: `arc_demo_${pad(taskSeq, 4)}_${index + 1}`,
            assignmentId,
            submissionId,
            taskId,
            divisionId: division.id,
            title,
            archivedAt: completedAt,
          });
        }

        // --- Notifikasi & log ----------------------------------------
        if (rng() < 0.22) {
          const type =
            status === "MENUNGGU_VERIFIKASI"
              ? "SUBMISSION_RECEIVED"
              : status === "DIBATALKAN"
                ? "TASK_CANCELLED"
                : status === "SELESAI"
                  ? "TASK_ASSIGNED"
                  : needsRevision
                    ? "REVISION_REQUESTED"
                    : "TASK_ASSIGNED";
          const recipient =
            type === "SUBMISSION_RECEIVED" ? adminByDivision[division.id] : userId;
          notifications.push({
            id: `ntf_demo_${pad(taskSeq, 4)}_${index + 1}`,
            userId: recipient,
            type,
            entityType: "assignment",
            entityId: assignmentId,
            message: NOTIFICATION_MESSAGES[type],
            readAt: rng() < 0.45 ? Math.min(now, createdAt + 86400) : null,
            createdAt: Math.min(now, createdAt + intBetween(rng, 1, 30) * 3600),
          });
        }

        if (rng() < 0.3) {
          const action = pick(rng, LOG_ACTIONS);
          logs.push({
            id: `log_demo_${pad(taskSeq, 4)}_${index + 1}`,
            actorId: action.startsWith("auth.") ? userId : adminByDivision[division.id],
            action,
            entityType: action.startsWith("auth.") ? "user" : "task",
            entityId: action.startsWith("auth.") ? userId : taskId,
            prevValue: null,
            newValue: JSON.stringify({ status, taskNumber: number }),
            ipAddress: null,
            createdAt: Math.min(now, createdAt + intBetween(rng, 1, 40) * 3600),
          });
        }
      }
    }
  }

  return { users, tasks, assignments, submissions, attachments, reviews, archives, notifications, logs };
}

/** Ringkasan yang dihitung dari model, bukan dari basis data. */
export function summarize(data, { now }) {
  const byStatus = {};
  for (const a of data.assignments) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }
  const taskById = new Map(data.tasks.map((t) => [t.id, t]));
  let late = 0;
  let onTime = 0;
  let exactlyOnDue = 0;
  let overdue = 0;
  for (const a of data.assignments) {
    const dueAt = taskById.get(a.taskId).dueAt;
    if (a.status === "SELESAI" && a.completedAt !== null) {
      if (a.completedAt === dueAt) exactlyOnDue += 1;
      if (a.completedAt > dueAt) late += 1;
      else onTime += 1;
    }
    if (a.status !== "SELESAI" && a.status !== "DIBATALKAN" && dueAt < now) overdue += 1;
  }
  return {
    users: data.users.length,
    tasks: data.tasks.length,
    assignments: data.assignments.length,
    submissions: data.submissions.length,
    attachments: data.attachments.length,
    reviews: data.reviews.length,
    archives: data.archives.length,
    notifications: data.notifications.length,
    logs: data.logs.length,
    byStatus,
    onTime,
    late,
    exactlyOnDue,
    overdue,
  };
}

// ---------------------------------------------------------------------------
// Penulisan SQL
// ---------------------------------------------------------------------------

/** `taskNumber` -> `task_number`. Nama kolom D1 memakai garis bawah. */
function toSnakeCase(key) {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

/**
 * Susun perintah INSERT dari objek baris.
 *
 * Nama kolom diturunkan dari kunci objek, bukan ditulis ulang di dua tempat:
 * daftar kolom yang ditulis manual mudah tertinggal saat bidang baru ditambah,
 * dan kesalahannya muncul sebagai NULL pada kolom NOT NULL yang membingungkan.
 *
 * `INSERT` biasa, bukan `INSERT OR REPLACE`. OR REPLACE pada tabel dengan
 * indeks unik akan MENGHAPUS baris lain yang bentrok, sehingga satu nomor tugas
 * yang kebetulan sama bisa menghapus data seed tanpa peringatan. Lebih baik
 * gagal berisik daripada berhasil sambil merusak data.
 */
function insertStatement(table, rows, { omit = [] } = {}) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]).filter((key) => !omit.includes(key));
  const columns = keys.map(toSnakeCase).join(", ");

  // Semua baris wajib punya kunci yang sama. Kalau tidak, jumlah nilai pada
  // baris tertentu tidak cocok dengan daftar kolom dan SQL-nya gagal di tengah
  // berkas — lebih baik berhenti di sini dengan pesan yang jelas.
  for (const [index, row] of rows.entries()) {
    const rowKeys = Object.keys(row).filter((key) => !omit.includes(key));
    if (rowKeys.length !== keys.length || rowKeys.some((key) => !keys.includes(key))) {
      throw new Error(
        `${table}: baris ke-${index + 1} punya kolom berbeda (${rowKeys.join(", ")}).`,
      );
    }
  }

  const out = [];
  for (const row of rows) {
    out.push(
      `INSERT INTO ${table} (${columns}) VALUES (${keys.map((key) => quote(row[key])).join(", ")});`,
    );
  }
  return out.join("\n");
}

/** Jaga nilai waktu agar tidak pernah melewati `now` dan tidak mendahului `floor`. */
function clampTime(value, floor, now) {
  if (value === null || value === undefined) return null;
  const lower = floor ?? value;
  return Math.min(now, Math.max(value, lower));
}

/**
 * Perintah hapus data demo lama. Urutannya mengikuti foreign key: turunan lebih
 * dulu, baru induk. Hanya baris berawalan demo yang disentuh.
 */
const CLEANUP_STATEMENTS = [
  "DELETE FROM activity_logs WHERE id LIKE 'log_demo_%';",
  "DELETE FROM notifications WHERE id LIKE 'ntf_demo_%';",
  "DELETE FROM document_archive WHERE id LIKE 'arc_demo_%';",
  "DELETE FROM task_reviews WHERE id LIKE 'rev_demo_%';",
  "DELETE FROM attachments WHERE id LIKE 'att_demo_%';",
  "DELETE FROM task_submissions WHERE id LIKE 'sub_demo_%';",
  "DELETE FROM task_assignments WHERE id LIKE 'asg_demo_%';",
  "DELETE FROM tasks WHERE id LIKE 'tsk_demo_%';",
  "DELETE FROM users WHERE id LIKE 'usr_demo_%';",
];

export function buildSql(data, { passwordHashFor }) {
  const lines = [
    "-- Data demo untuk pengujian halaman laporan.",
    "-- Dihasilkan scripts/build-demo-seed.mjs; jangan diedit manual.",
    `-- Kata sandi akun demo: ${DEMO_PASSWORD}`,
    "-- Hapus kembali dengan: node scripts/build-demo-seed.mjs --clean",
    "",
    ...CLEANUP_STATEMENTS,
    "",
  ];

  const userRows = data.users.map((u) => ({
    id: u.id,
    divisionId: u.divisionId,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    nip: u.nip,
    position: u.position,
    passwordHash: passwordHashFor(u.id),
    passwordChangedAt: u.updatedAt,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
  lines.push(insertStatement("users", userRows));

  lines.push(insertStatement("tasks", data.tasks));
  lines.push(insertStatement("task_assignments", data.assignments));
  lines.push(insertStatement("task_submissions", data.submissions));
  // `titleLines` hanya dipakai untuk membuat isi PDF, bukan kolom tabel.
  lines.push(insertStatement("attachments", data.attachments, { omit: ["titleLines"] }));
  lines.push(insertStatement("task_reviews", data.reviews));
  lines.push(insertStatement("document_archive", data.archives));
  lines.push(insertStatement("notifications", data.notifications));
  lines.push(insertStatement("activity_logs", data.logs));

  return `${lines.filter((line) => line !== "").join("\n")}\n`;
}

export function buildCleanSql() {
  return [
    "-- Menghapus seluruh data demo (id berawalan demo_).",
    "-- Dihasilkan scripts/build-demo-seed.mjs --clean.",
    "",
    ...CLEANUP_STATEMENTS,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Program utama
// ---------------------------------------------------------------------------

function main() {
  const outDir = resolve(root, "seed/demo");
  const filesDir = resolve(outDir, "files");
  mkdirSync(filesDir, { recursive: true });

  if (process.argv.includes("--clean")) {
    writeFileSync(resolve(outDir, "clean-demo.sql"), buildCleanSql(), "utf8");
    console.log("seed/demo/clean-demo.sql ditulis.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const data = buildDemoData({ now });

  // Berkas PDF: dibuat dari judul tugas agar isinya bisa dicocokkan dengan
  // baris laporan saat diunduh.
  const r2Entries = [];
  const seenKeys = new Set();
  const seenFileNames = new Set();
  for (const attachment of data.attachments) {
    // `stored_key` berindeks unik; kalau dua lampiran memakai kunci sama,
    // INSERT-nya gagal dan berkas R2 saling menimpa. Hentikan di sini.
    if (seenKeys.has(attachment.storedKey)) {
      throw new Error(`stored_key ganda: ${attachment.storedKey}`);
    }
    seenKeys.add(attachment.storedKey);
    seenFileNames.add(attachment.originalName);

    const bytes = minimalPdf(attachment.titleLines);
    writeFileSync(resolve(filesDir, attachment.originalName), bytes);
    attachment.sizeBytes = bytes.length;
    attachment.checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    r2Entries.push({ key: attachment.storedKey, file: `seed/demo/files/${attachment.originalName}` });
  }

  // Buang PDF sisa pembangkitan sebelumnya. Tanpa ini, folder `files/` menumpuk
  // berkas yang tidak lagi dirujuk `r2.json` dan membingungkan saat diperiksa.
  for (const entry of readdirSync(filesDir)) {
    if (entry.endsWith(".pdf") && !seenFileNames.has(entry)) {
      rmSync(resolve(filesDir, entry), { force: true });
    }
  }

  // Satu hash per akun: salt berbeda tiap akun, sama seperti pendaftaran biasa.
  const hashes = new Map();
  for (const user of data.users) {
    hashes.set(user.id, hashPasswordNode(DEMO_PASSWORD));
  }

  writeFileSync(
    resolve(outDir, "seed-demo.sql"),
    buildSql(data, { passwordHashFor: (id) => hashes.get(id) }),
    "utf8",
  );
  writeFileSync(
    resolve(outDir, "r2.json"),
    `${JSON.stringify(r2Entries, null, 1)}\n`,
    "utf8",
  );

  const summary = summarize(data, { now });
  console.log("seed/demo/seed-demo.sql ditulis.");
  console.log(`  pengguna      : ${summary.users}`);
  console.log(`  tugas         : ${summary.tasks}`);
  console.log(`  penugasan     : ${summary.assignments}`);
  console.log(`  arsip         : ${summary.archives} (berkas R2: ${r2Entries.length})`);
  console.log(`  notifikasi    : ${summary.notifications}`);
  console.log("  status penugasan:");
  for (const [status, count] of Object.entries(summary.byStatus).sort()) {
    console.log(`    ${status.padEnd(20)} ${count}`);
  }
  console.log(
    `  tepat waktu ${summary.onTime}, terlambat ${summary.late}, ` +
      `tepat pada detik tenggat ${summary.exactlyOnDue}, lewat tenggat ${summary.overdue}`,
  );
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
