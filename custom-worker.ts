/**
 * Entry Worker: fetch dari OpenNext plus handler `scheduled` yang tidak
 * dihasilkan adaptor (§9.1). Dua jadwal:
 * - tiap menit: kirim antrean `notification_deliveries`;
 * - harian: sweep attachment `PENDING` > 24 jam dan notifikasi `DUE_SOON`.
 */
import { drizzle } from "drizzle-orm/d1";
// @ts-ignore `.open-next/worker.js` dihasilkan saat build
import { default as nextHandler } from "./.open-next/worker.js";
import * as schema from "./src/db/schema";
import { runScheduledJobs } from "./src/lib/jobs/scheduled";
import { nowSeconds } from "./src/lib/time";

async function runScheduled(cron: string, env: CloudflareEnv) {
  const db = drizzle(env.DB, { schema });
  const summary = await runScheduledJobs(env, db, cron, nowSeconds());
  // Ringkasan saja: jumlah objek terhapus, gagal, dan sisa PENDING (§9.9).
  console.log(JSON.stringify({ job: "scheduled", cron, ...summary }));
}

export default {
  fetch: nextHandler.fetch,
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(controller.cron, env));
  },
} satisfies ExportedHandler<CloudflareEnv>;
