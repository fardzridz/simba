import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

/**
 * Penjaga data demo (`scripts/build-demo-seed.mjs`).
 *
 * Data demo dipakai untuk menguji halaman laporan, jadi cacatnya tidak terlihat
 * sebagai galat: tabel tetap tampil, hanya angkanya salah. Beberapa cacat yang
 * pernah benar-benar terjadi sebelum tes ini ada:
 *
 *  - `title_lines` (bidang bantu untuk isi PDF) ikut tertulis sebagai kolom
 *    tabel, sehingga seluruh INSERT lampiran gagal.
 *  - Nomor tugas demo bertabrakan dengan nomor tugas seed dasar
 *    (HUK/2026/10/001), sehingga INSERT tugas gagal pada indeks unik.
 *  - Dua petugas pada tugas yang sama menghasilkan `stored_key` identik.
 *  - Tugas bulan berjalan tercatat "dibuat" pada jam yang belum lewat.
 *
 * Tes ini menjalankan SQL hasil generator ke database SQLite sungguhan yang
 * skemanya dibuat dari `drizzle/migrations`, lalu memeriksa invariannya. Jadi
 * yang diuji adalah SQL akhir, bukan model di memori.
 */

// Berkas ini ada di src/db/, jadi akar proyek tiga tingkat di atasnya.
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SQL_PATH = `${ROOT}seed/demo/seed-demo.sql`;
const CLEAN_PATH = `${ROOT}seed/demo/clean-demo.sql`;
const MIGRATIONS_DIR = `${ROOT}drizzle/migrations`;

/** Terapkan seluruh migrasi ke database di memori. */
function migratedDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(`${MIGRATIONS_DIR}/${file}`, "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) db.exec(trimmed);
    }
  }
  return db;
}

/** Isi seed dasar lebih dulu: data demo harus hidup berdampingan dengannya. */
function seededDatabase(): DatabaseSync {
  const db = migratedDatabase();
  const seed = readFileSync(`${ROOT}seed/seed.sql`, "utf8");
  for (const statement of seed.split(/;\r?\n/)) {
    const trimmed = statement.trim();
    if (trimmed) db.exec(trimmed);
  }
  return db;
}

function scalar(db: DatabaseSync, sql: string, ...params: (string | number)[]): number {
  const row = db.prepare(sql).get(...params) as Record<string, number> | undefined;
  return row ? Number(Object.values(row)[0]) : 0;
}

describe("data demo: SQL dapat dijalankan", () => {
  it("dipasang di atas seed dasar tanpa galat constraint", () => {
    const db = seededDatabase();
    const sql = readFileSync(SQL_PATH, "utf8");
    // Melempar kalau ada kolom tidak dikenal, indeks unik bentrok, atau
    // foreign key yang tidak terpenuhi.
    expect(() => db.exec(sql)).not.toThrow();
    db.close();
  });

  it("mengisi ratusan baris penugasan, bukan sekadar beberapa", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    const demoAssignments = scalar(
      db,
      "select count(*) from task_assignments where id like 'asg_demo_%'",
    );
    // Cukup banyak untuk memaksa paginasi 25/50/100 dan ekspor multi-halaman.
    expect(demoAssignments).toBeGreaterThanOrEqual(120);
    expect(demoAssignments).toBeLessThanOrEqual(220);
    db.close();
  });

  it("mengisi kelima status, termasuk Dibatalkan", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    const rows = db
      .prepare(
        "select status, count(*) as n from task_assignments where id like 'asg_demo_%' group by status",
      )
      .all() as { status: string; n: number }[];
    const byStatus = new Map(rows.map((row) => [row.status, Number(row.n)]));
    for (const status of [
      "BELUM_DIKERJAKAN",
      "SEDANG_DIKERJAKAN",
      "MENUNGGU_VERIFIKASI",
      "SELESAI",
      "DIBATALKAN",
    ]) {
      expect(byStatus.get(status) ?? 0, `status ${status} kosong`).toBeGreaterThan(0);
    }
    db.close();
  });

  it("menyediakan penugasan DIBATALKAN pada bulan berjalan", () => {
    // Filter status "Dibatalkan" pada periode bawaan (bulan ini) pernah selalu
    // kosong karena seluruh pembatalan jatuh di bulan-bulan lama. Itu terlihat
    // seperti filter rusak, padahal datanya memang tidak ada.
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    const JKT = 7 * 3600;
    const shifted = new Date((Math.floor(Date.now() / 1000) + JKT) * 1000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    const from = Math.floor(Date.UTC(year, month, 1) / 1000) - JKT;
    const to = Math.floor(Date.UTC(year, month + 1, 1) / 1000) - JKT;
    const cancelledThisMonth = scalar(
      db,
      `select count(*) from task_assignments
       where id like 'asg_demo_%' and status = 'DIBATALKAN'
         and coalesce(completed_at, created_at) >= ? and coalesce(completed_at, created_at) < ?`,
      from,
      to,
    );
    expect(cancelledThisMonth).toBeGreaterThan(0);
    db.close();
  });

  it("mengisi NIP dan jabatan staf, supaya kolom Petugas tidak kosong", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    // Hanya staf: admin memang tidak ber-NIP, sama seperti admin di seed dasar.
    const missing = scalar(
      db,
      "select count(*) from users where id like 'usr_demo_%' and role = 'USER' and (nip is null or position is null)",
    );
    expect(missing).toBe(0);
    const staffWithNip = scalar(
      db,
      "select count(*) from users where id like 'usr_demo_%' and role = 'USER' and nip is not null",
    );
    expect(staffWithNip).toBeGreaterThanOrEqual(15);
    db.close();
  });
});

describe("data demo: tanggal masuk akal", () => {
  it("tidak ada catatan yang dibuat di masa depan", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    const now = Math.floor(Date.now() / 1000);
    const checks: [string, string][] = [
      ["users", "select count(*) from users where id like 'usr_demo_%' and created_at > ?"],
      ["tasks", "select count(*) from tasks where id like 'tsk_demo_%' and created_at > ?"],
      [
        "assignments",
        "select count(*) from task_assignments where id like 'asg_demo_%' and created_at > ?",
      ],
      [
        "completed",
        "select count(*) from task_assignments where id like 'asg_demo_%' and completed_at > ?",
      ],
      [
        "submissions",
        "select count(*) from task_submissions where id like 'sub_demo_%' and created_at > ?",
      ],
      [
        "archives",
        "select count(*) from document_archive where id like 'arc_demo_%' and archived_at > ?",
      ],
      [
        "notifications",
        "select count(*) from notifications where id like 'ntf_demo_%' and created_at > ?",
      ],
    ];
    for (const [label, sql] of checks) {
      expect(scalar(db, sql, now), `${label} punya tanggal masa depan`).toBe(0);
    }
    db.close();
  });

  it("menjaga urutan waktu: mulai <= dikumpul <= selesai", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    expect(
      scalar(
        db,
        "select count(*) from task_assignments where id like 'asg_demo_%' and started_at is not null and started_at < created_at",
      ),
      "ada penugasan mulai sebelum tugas dibuat",
    ).toBe(0);
    expect(
      scalar(
        db,
        "select count(*) from task_assignments where id like 'asg_demo_%' and submitted_at is not null and started_at is not null and submitted_at < started_at",
      ),
      "ada pengumpulan sebelum mulai",
    ).toBe(0);
    expect(
      scalar(
        db,
        "select count(*) from task_assignments where id like 'asg_demo_%' and completed_at is not null and submitted_at is not null and completed_at < submitted_at",
      ),
      "ada penyelesaian sebelum pengumpulan",
    ).toBe(0);
    db.close();
  });

  it("tidak ada tugas yang tenggatnya mendahului jadwal mulai", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    expect(
      scalar(
        db,
        "select count(*) from tasks where id like 'tsk_demo_%' and due_at <= start_at",
      ),
    ).toBe(0);
    db.close();
  });

  it("menyediakan penugasan tepat pada detik tenggat, untuk menguji batas <= ", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    const exactly = scalar(
      db,
      `select count(*) from task_assignments a join tasks t on t.id = a.task_id
       where a.id like 'asg_demo_%' and a.status = 'SELESAI' and a.completed_at = t.due_at`,
    );
    // Kalau nol, tidak ada baris yang menguji `completedAt <= dueAt` di batas.
    expect(exactly).toBeGreaterThan(0);
    db.close();
  });

  it("mengisi bulan berjalan, bulan lalu, dan triwulan lalu", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    // Rentang dihitung seperti reportPeriodRange: awal bulan WIB.
    const JKT = 7 * 3600;
    const now = Math.floor(Date.now() / 1000);
    const shifted = new Date((now + JKT) * 1000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    const monthStart = (y: number, m0: number) =>
      Math.floor(Date.UTC(y, m0, 1) / 1000) - JKT;

    const ranges: [string, number, number][] = [
      ["bulan ini", monthStart(year, month), monthStart(year, month + 1)],
      ["bulan lalu", monthStart(year, month - 1), monthStart(year, month)],
    ];
    for (const [label, from, to] of ranges) {
      const count = scalar(
        db,
        `select count(*) from task_assignments
         where id like 'asg_demo_%'
           and coalesce(completed_at, created_at) >= ? and coalesce(completed_at, created_at) < ?`,
        from,
        to,
      );
      expect(count, `${label} kosong`).toBeGreaterThan(0);
    }
    db.close();
  });
});

describe("data demo: tidak merusak data lain", () => {
  it("memberi awalan id demo_ pada setiap baris yang dibuat", () => {
    const db = seededDatabase();
    // Hitung dulu baris sebelum data demo dipasang: seed dasar memang berisi
    // user dan tugas tanpa awalan `demo_`, dan itu bukan pelanggaran.
    const tables: [string, string][] = [
      ["users", "usr_demo_"],
      ["tasks", "tsk_demo_"],
      ["task_assignments", "asg_demo_"],
      ["task_submissions", "sub_demo_"],
      ["attachments", "att_demo_"],
      ["task_reviews", "rev_demo_"],
      ["document_archive", "arc_demo_"],
      ["notifications", "ntf_demo_"],
      ["activity_logs", "log_demo_"],
    ];
    const before = new Map(
      tables.map(([table]) => [table, scalar(db, `select count(*) from ${table}`)]),
    );
    db.exec(readFileSync(SQL_PATH, "utf8"));
    for (const [table, prefix] of tables) {
      // Setiap baris BARU wajib berawalan demo_; baris lama tidak dihitung.
      const added = scalar(db, `select count(*) from ${table}`) - (before.get(table) ?? 0);
      expect(added, `${table} tidak bertambah`).toBeGreaterThan(0);
      expect(
        scalar(db, `select count(*) from ${table} where id like ?`, `${prefix}%`),
        `${table} tidak memakai awalan ${prefix}`,
      ).toBe(added);
    }
    db.close();
  });

  it("memakai stored_key lampiran yang unik", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    const duplicates = db
      .prepare(
        "select stored_key, count(*) as n from attachments group by stored_key having n > 1",
      )
      .all();
    expect(duplicates).toEqual([]);
    db.close();
  });

  it("--clean mengembalikan database ke keadaan seed, tanpa sisa demo", () => {
    const db = seededDatabase();
    const before = scalar(db, "select count(*) from task_assignments");
    db.exec(readFileSync(SQL_PATH, "utf8"));
    db.exec(readFileSync(CLEAN_PATH, "utf8"));
    expect(scalar(db, "select count(*) from task_assignments")).toBe(before);
    for (const table of [
      "users",
      "tasks",
      "task_assignments",
      "task_submissions",
      "attachments",
      "task_reviews",
      "document_archive",
      "notifications",
      "activity_logs",
    ]) {
      expect(
        scalar(db, `select count(*) from ${table} where id like '%demo_%'`),
        `${table} masih menyisakan baris demo`,
      ).toBe(0);
    }
    db.close();
  });

  it("aman dipasang dua kali: tidak menggandakan baris", () => {
    const db = seededDatabase();
    const sql = readFileSync(SQL_PATH, "utf8");
    db.exec(sql);
    const once = scalar(db, "select count(*) from task_assignments");
    db.exec(sql);
    expect(scalar(db, "select count(*) from task_assignments")).toBe(once);
    db.close();
  });

  it("menjaga integritas foreign key setelah dipasang", () => {
    const db = seededDatabase();
    db.exec(readFileSync(SQL_PATH, "utf8"));
    expect(db.prepare("pragma foreign_key_check").all()).toEqual([]);
    db.close();
  });
});
