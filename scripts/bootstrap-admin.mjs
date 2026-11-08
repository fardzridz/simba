/**
 * Membuat akun pertama (umumnya Super Admin) pada basis data produksi (UC02).
 * Data master sudah terisi oleh `npm run db:seed:prod` (seed/seed-prod.sql),
 * sedangkan akun tidak pernah masuk seed supaya tidak ada kata sandi tetap di
 * repositori. Sandi dibaca dari variabel lingkungan `ADMIN_PASSWORD`, dihash
 * dengan format aplikasi (scripts/lib/hash-node.mjs), dan tidak pernah
 * dicetak atau ditulis ke berkas di luar berkas SQL sementara yang berisi
 * hash (bukan sandi), lalu dihapus segera.
 *
 *   ADMIN_PASSWORD="..." node scripts/bootstrap-admin.mjs \
 *     --username admin.utama \
 *     --nama "Nama Lengkap" \
 *     --surel "admin.utama@bawaslupasuruan.go.id" \
 *     --divisi div_sekretariat \
 *     --role SUPER_ADMIN
 *
 * Secara opsional: --db penugasan-db-staging untuk menjalankan di basis data
 * lain dengan nama yang eksplisit.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import os from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPasswordNode } from "./lib/hash-node.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const wranglerBin = resolve(root, "node_modules/wrangler/bin/wrangler.js");

const args = process.argv.slice(2);
const valueOf = (name) => {
  const index = args.indexOf(name);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
};

const username = valueOf("--username");
const fullName = valueOf("--nama");
const email = valueOf("--surel")?.toLowerCase();
const divisionId = valueOf("--divisi");
const role = valueOf("--role") ?? "SUPER_ADMIN";
const dbName = valueOf("--db") ?? "penugasan-db";
const password = process.env.ADMIN_PASSWORD;

if (!username || !fullName || !email || !divisionId) {
  console.error(
    "Pemakaian: ADMIN_PASSWORD=\"...\" node scripts/bootstrap-admin.mjs --username <nama> --nama <lengkap> --surel <surel> --divisi <id> [--role SUPER_ADMIN] [--db <nama basis data>]",
  );
  process.exit(1);
}
if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) {
  console.error("Nama pengguna 3-32 karakter: huruf kecil, angka, titik, garis, garis bawah; diawali huruf.");
  process.exit(1);
}
if (!["SUPER_ADMIN", "ADMIN", "USER"].includes(role)) {
  console.error("Peran harus SUPER_ADMIN, ADMIN, atau USER.");
  process.exit(1);
}
if (!email.includes("@") || email.length > 254) {
  console.error("Format surel tidak sah.");
  process.exit(1);
}
if (!password || password.length < 12) {
  console.error("Set ADMIN_PASSWORD (minimal 12 karakter) sebelum menjalankan; jangan lewat argumen agar tidak tersimpan di riwayat shell.");
  process.exit(1);
}

/** Jalankan wrangler D1 pada basis data tujuan dan uraikan keluarannya. */
function d1(argsD1) {
  const result = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", dbName, "--remote", "-y", "--json", ...argsD1],
    { cwd: root, encoding: "utf8" },
  );
  if (result.error) throw new Error("spawn wrangler: " + result.error.message);
  const start = result.stdout.indexOf("[");
  const end = result.stdout.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error(
      `wrangler tanpa json (status=${result.status}) stdout=${(result.stdout ?? "").slice(0, 300)} stderr=${(result.stderr ?? "").slice(0, 300)}`,
    );
  }
  return JSON.parse(result.stdout.slice(start, end + 1));
}

function sqlEscape(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

// 1. Divisi tujuan wajib ada dan aktif.
const divisionRows = d1(["--command", `SELECT id, name, is_active FROM divisions WHERE id=${sqlEscape(divisionId)}`]);
const division = divisionRows[0]?.results?.[0];
if (!division) {
  console.error(`Divisi tidak ditemukan: ${divisionId}. Isi data master dulu lewat npm run db:seed:prod.`);
  process.exit(1);
}
if (!division.is_active) {
  console.error(`Divisi ${division.name} nonaktif; aktifkan dulu di Kelola Master.`);
  process.exit(1);
}

// 2. Nama pengguna dan surel wajib belum dipakai.
const clash = d1(["--command", `SELECT username, email FROM users WHERE username=${sqlEscape(username)} OR email=${sqlEscape(email)}`]);
if ((clash[0]?.results?.length ?? 0) > 0) {
  console.error("Nama pengguna atau surel sudah dipakai akun lain.");
  process.exit(1);
}

// 3. Hash sandi (format aplikasi) lalu tulis SQL sementara berisi hash.
const userId = `usr_${randomBytes(12).toString("hex")}`;
const now = Math.floor(Date.now() / 1000);
const stamp = new Date(now * 1000).toISOString();
const hash = hashPasswordNode(password);
const position = role === "USER" ? "Staf Pelaksana" : "Pengelola";
const sql = [
  "-- Dihasilkan scripts/bootstrap-admin.mjs; hanya berisi hash, bukan sandi.",
  `INSERT INTO users (id, division_id, username, email, full_name, nip, position, password_hash, password_changed_at, role, is_active, last_login_at, created_at, updated_at)`,
  `VALUES (${sqlEscape(userId)}, ${sqlEscape(divisionId)}, ${sqlEscape(username)}, ${sqlEscape(email)}, ${sqlEscape(fullName)}, NULL, ${sqlEscape(position)}, ${sqlEscape(hash)}, ${now}, ${sqlEscape(role)}, 1, NULL, ${now}, ${now});`,
  `INSERT INTO activity_logs (id, actor_id, action, entity_type, entity_id, prev_value, new_value, created_at)`,
  `VALUES ('log_${randomBytes(12).toString("hex")}', ${sqlEscape(userId)}, 'user.bootstrap', 'user', ${sqlEscape(userId)}, NULL, ${sqlEscape(JSON.stringify({ username, email, divisionId, role, stamp }))}, ${now});`,
  "",
].join("\n");

const tempDir = mkdtempSync(join(os.tmpdir(), "bootstrap-admin-"));
const sqlPath = join(tempDir, "insert.sql");
writeFileSync(sqlPath, sql, "utf8");

try {
  const applied = d1(["--file", sqlPath]);
  const written = applied.reduce(
    (total, statement) =>
      total + (statement?.meta?.rows_written ?? statement?.results?.rows_written ?? 0),
    0,
  );
  if (written === 0) throw new Error("Tidak ada baris tertulis; INSERT mungkin dilewati.");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log(
  `Akun @${username} (${role}) dibuat di ${dbName} untuk ${division.name}. Sandi hang di lingkungan ADMIN_PASSWORD; sampaikan lewat kanal lain dan minta diganti setelah masuk.`,
);
