/**
 * Memasang data demo ke database lokal (D1) dan mengunggah berkasnya ke R2
 * lokal. Pasangan dari `scripts/build-demo-seed.mjs`.
 *
 *   node scripts/seed-demo.mjs             pasang (idempoten, aman diulang)
 *   node scripts/seed-demo.mjs --clean     hapus seluruh data demo
 *   node scripts/seed-demo.mjs --skip-r2   hanya D1, lewati unggah berkas
 *
 * Kenapa ada skrip terpisah, bukan satu perintah `wrangler d1 execute` di
 * package.json: memasang data demo butuh DUA langkah (D1 lalu R2) dan urutannya
 * penting. Kalau berkas diunggah lebih dulu lalu SQL gagal, R2 berisi objek
 * yang tidak dirujuk baris mana pun. Skrip ini menjalankan D1 dulu, memastikan
 * berhasil, baru mengunggah berkas.
 *
 * Hanya menyentuh baris berid `demo_`/`usr_demo_`; data seed dan data asli
 * tidak tersentuh. Tanpa `--remote` di semua perintah: data demo tidak untuk
 * database sungguhan.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const DB_NAME = "penugasan-db";
const BUCKET = "penugasan-files";
const SQL_FILE = "seed/demo/seed-demo.sql";
const CLEAN_FILE = "seed/demo/clean-demo.sql";
const R2_FILE = "seed/demo/r2.json";

const args = new Set(process.argv.slice(2));
const clean = args.has("--clean");
const skipR2 = args.has("--skip-r2");

const wranglerBin = resolve(root, "node_modules/wrangler/bin/wrangler.js");

/** Jalankan wrangler lewat node langsung: `npx`/`.cmd` bermasalah di Windows. */
function runWrangler(wranglerArgs, label) {
  const result = spawnSync(process.execPath, [wranglerBin, ...wranglerArgs], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  // Wrangler menulis kemajuan ke stderr dan tetap keluar dengan kode 0, jadi
  // status proses lebih dipercaya daripada pencarian kata "error".
  if (result.status !== 0) {
    console.error(`GAGAL: ${label}`);
    console.error(out.trim());
    process.exit(1);
  }
  return out;
}

function requireFile(relativePath) {
  const full = resolve(root, relativePath);
  if (!existsSync(full)) {
    console.error(`Berkas tidak ditemukan: ${relativePath}`);
    console.error(
      clean
        ? "Jalankan dulu: node scripts/build-demo-seed.mjs --clean"
        : "Jalankan dulu: node scripts/build-demo-seed.mjs",
    );
    process.exit(1);
  }
  return full;
}

if (clean) {
  requireFile(CLEAN_FILE);
  console.log(`Menghapus data demo dari ${DB_NAME} (lokal)...`);
  runWrangler(
    ["d1", "execute", DB_NAME, "--local", `--file=./${CLEAN_FILE}`],
    "hapus data demo",
  );
  console.log("Data demo dihapus. Berkas R2 dibiarkan (tidak dirujuk lagi).");
  process.exit(0);
}

requireFile(SQL_FILE);
const entries = JSON.parse(readFileSync(requireFile(R2_FILE), "utf8"));

// --- 1. D1 ---------------------------------------------------------------
// Berkas SQL sudah memuat DELETE untuk baris demo di awal, jadi menjalankannya
// berulang kali menghasilkan keadaan yang sama, bukan baris berganda.
console.log(`Memasang data demo ke ${DB_NAME} (lokal)...`);
const sqlOut = runWrangler(
  ["d1", "execute", DB_NAME, "--local", `--file=./${SQL_FILE}`],
  "pasang data demo",
);
const rowMatch = sqlOut.match(/(\d+)\s+commands? executed successfully/i);
console.log(
  rowMatch ? `D1: ${rowMatch[1]} perintah berhasil.` : "D1: selesai.",
);

// --- 2. R2 ---------------------------------------------------------------
if (skipR2) {
  console.log("R2: dilewati (--skip-r2). Berkas tidak bisa diunduh dari katalog.");
  process.exit(0);
}

// Unggah berurutan, bukan paralel: setiap panggilan wrangler membuka state
// Miniflare sendiri, dan beberapa proses yang menulis bersamaan ke berkas
// SQLite state yang sama bisa saling mengunci. 49 berkas × ~4 detik masih
// wajar untuk perintah yang dijalankan sekali saat menyiapkan lingkungan.
console.log(`Mengunggah ${entries.length} berkas ke R2 (${BUCKET}, lokal)...`);
let uploaded = 0;
for (const [index, entry] of entries.entries()) {
  const objectUri = `${BUCKET}/${entry.key}`;
  runWrangler(
    [
      "r2",
      "object",
      "put",
      objectUri,
      "--file",
      resolve(root, entry.file),
      "--local",
      "--content-type",
      "application/pdf",
    ],
    `unggah ${objectUri}`,
  );
  uploaded += 1;
  process.stdout.write(`\r  ${uploaded}/${entries.length} berkas terunggah`);
}
process.stdout.write("\n");

console.log("\nSelesai. Data demo siap dipakai:");
console.log("  halaman laporan : http://localhost:3000/reports");
console.log("  akun staf       : demo.staf.01 ... demo.staf.20");
console.log("  akun admin      : admin.sdm, admin.sekretariat, admin.penindakan");
console.log("  kata sandi      : Bawaslu#2026");
console.log("  hapus kembali   : node scripts/seed-demo.mjs --clean");
