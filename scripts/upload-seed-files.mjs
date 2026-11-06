/**
 * Mengunggah berkas contoh seed ke R2 sesuai kunci yang tertulis di
 * seed/seed-r2.json (hasil scripts/build-seed.mjs).
 *
 *   node scripts/upload-seed-files.mjs <bucket> [--env staging]
 *
 * Contoh:
 *   npm run db:seed:r2:staging   (bucket penugasan-files-staging, --env staging)
 *   npm run db:seed:r2:remote    (bucket penugasan-files produksi)
 *
 * Idempoten: kunci sama berarti objek ditimpa isinya.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const bucket = process.argv[2];
if (!bucket) {
  console.error("Pemakaian: node scripts/upload-seed-files.mjs <bucket> [--env staging]");
  process.exit(1);
}
const envIndex = process.argv.indexOf("--env");
const envValue =
  envIndex !== -1 && envIndex + 1 < process.argv.length
    ? process.argv[envIndex + 1]
    : undefined;

const entries = JSON.parse(readFileSync(resolve(root, "seed/seed-r2.json"), "utf8"));

for (const entry of entries) {
  const objectUri = `${bucket}/${entry.key}`;
  const args = [
    "r2",
    "object",
    "put",
    objectUri,
    "--file",
    resolve(root, entry.file),
    "--remote",
    "--content-type",
    "application/pdf",
    ...(envValue ? ["--env", envValue] : []),
  ];
  // Node 22 menolak spawn .cmd (npx) tanpa shell, dan shell memecah jalur
  // berkas yang mengandung spasi; jadi panggil CLI wrangler via node langsung.
  const wranglerBin = resolve(root, "node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(
    process.execPath,
    [wranglerBin, ...args],
    { cwd: root, stdio: "pipe" },
  );
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0 || /error/i.test(out)) {
    console.error(`GAGAL ${objectUri}`);
    console.error(out.trim());
    process.exit(1);
  }
  console.log(`unggah ${objectUri}: selesai`);
  console.log(out.trim().split("\n")[0] ?? "");
}
console.log(`${entries.length} berkas seed terunggah ke ${bucket}.`);
