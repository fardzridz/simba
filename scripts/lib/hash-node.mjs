/**
 * Hash kata sandi dengan format yang sama persis dengan
 * src/lib/auth/password.ts: PBKDF2-SHA256, 100.000 iterasi (batas maksimum
 * PBKDF2 pada runtime workerd), salt 16 byte, kodifikasi base64url tanpa
 * padding.
 *
 * Implementasi node:crypto di sini dipakai ulang oleh hash-password.mjs dan
 * bootstrap-admin.mjs agar keduanya berjalan di Node 22 tanpa flag
 * strip-types; kesamaan formatnya dijaga hash-cli.test.ts.
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";

const ALGORITHM = "PBKDF2-SHA256";
const ITERATIONS = 100_000; // sinkron dengan PBKDF2_ITERATIONS; hash-cli.test.ts menjaga kesamaannya
const KEY_BITS = 256;
const SALT_BYTES = 16;

export function hashPasswordNode(password, iterations = ITERATIONS) {
  const salt = randomBytes(SALT_BYTES);
  const derived = pbkdf2Sync(password, salt, iterations, KEY_BITS / 8, "sha256");
  return `${ALGORITHM}$${iterations}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}
