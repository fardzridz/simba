/**
 * Mencetak hash kata sandi dengan format yang sama persis dengan
 * src/lib/auth/password.ts (PBKDF2-SHA256, 100.000 iterasi, base64url).
 *
 *   node scripts/hash-password.mjs "<kata sandi>"
 *   npm run hash -- "<kata sandi>"
 *
 * Implementasinya ada di scripts/lib/hash-node.mjs agar dipakai ulang oleh
 * bootstrap-admin.mjs; formatnya dijaga hash-cli.test.ts.
 */
import { hashPasswordNode } from "./lib/hash-node.mjs";

const password = process.argv[2];

if (password === undefined) {
  console.error('Pemakaian: node scripts/hash-password.mjs "<kata sandi>"');
  process.exit(1);
}

console.log(hashPasswordNode(password));
