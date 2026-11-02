/**
 * Mencetak hash kata sandi dengan format yang sama persis dengan
 * src/lib/auth/password.ts: PBKDF2-SHA256, 600.000 iterasi, salt 16 byte,
 * kodifikasi base64url tanpa padding.
 *
 *   node scripts/hash-password.mjs "<kata sandi>"
 *   npm run hash -- "<kata sandi>"
 *
 * Dipakai untuk membuat akun pertama di produksi (UC02): yang disimpan ke
 * users.password_hash adalah nilai cetakan ini, bukan kata sandi mentah.
 * Implementasi memakai node:crypto agar berjalan di Node 22 tanpa flag
 * strip-types; kompatibilitas formatnya dijaga hash-cli.test.ts.
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";

const ALGORITHM = "PBKDF2-SHA256";
const ITERATIONS = 600_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;

const password = process.argv[2];

if (password === undefined) {
  console.error('Pemakaian: node scripts/hash-password.mjs "<kata sandi>"');
  console.error('Contoh: npm run hash -- "Bawaslu#2026"');
  process.exit(1);
}

const salt = randomBytes(SALT_BYTES);
const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_BITS / 8, "sha256");

console.log(
  `${ALGORITHM}$${ITERATIONS}$${salt.toString("base64url")}$${derived.toString("base64url")}`,
);
