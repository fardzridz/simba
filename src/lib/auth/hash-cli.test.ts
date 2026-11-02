/**
 * Jembatan antara CLI skrip hash (node:crypto, lingkungan Node) dan pembanding
 * sandi aplikasi (WebCrypto, runtime Workers, src/lib/auth/password.ts).
 * Keduanya wajib saling bertukar format: hash CLI harus diterima aplikasi, dan
 * perubahan standar iterasi di CLI harus selalu mengikuti PBKDF2_ITERATIONS.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PBKDF2_ITERATIONS, verifyPassword } from "./password";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const TEST_PASSWORD = "KataSandi#Uji2026";
/** Turunan PBKDF2 600.000 iterasi butuh detik, jauh lebih lambat dari timeout default. */
const TEST_TIMEOUT_MS = 30_000;

let cachedHash: Promise<string> | null = null;

function hashFromCli(): Promise<string> {
  cachedHash ??= run(process.execPath, ["scripts/hash-password.mjs", TEST_PASSWORD], {
    cwd: root,
  }).then(({ stdout }) => stdout.trim());
  return cachedHash;
}

describe("scripts/hash-password.mjs", () => {
  it(
    "mencetak format PBKDF2-SHA256 dengan iterasi standar aplikasi",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const hash = await hashFromCli();
      const [algorithm, iterationsRaw, saltRaw, hashRaw] = hash.split("$");
      expect(algorithm).toBe("PBKDF2-SHA256");
      expect(Number(iterationsRaw)).toBe(PBKDF2_ITERATIONS);
      expect(saltRaw).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(hashRaw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    },
  );

  it(
    "hash CLI terverifikasi oleh verifyPassword() aplikasi",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const hash = await hashFromCli();
      await expect(verifyPassword(TEST_PASSWORD, hash)).resolves.toBe(true);
      await expect(verifyPassword("BukanSandinya", hash)).resolves.toBe(false);
    },
  );
});
