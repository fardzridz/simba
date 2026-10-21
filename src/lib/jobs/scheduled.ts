import type { AppEnv, Db } from "@/env";
import { notifyDueSoon, sweepPendingAttachments } from "./sweep";
import { processDeliveries } from "./deliveries";
import { nowSeconds } from "@/lib/time";

/** Jadwal harian sweep; jadwal lain dianggap pemrosesan antrean pengiriman. */
export const DAILY_CRON = "0 20 * * *";

export type ScheduledSummary = {
  daily: boolean;
  sweep?: Awaited<ReturnType<typeof sweepPendingAttachments>>;
  dueSoonCreated?: number;
  deliveries: Awaited<ReturnType<typeof processDeliveries>>;
};

/**
 * Satu pintu untuk handler `scheduled` (§9.1). Cron harian menjalankan sweep
 * berkas yatim dan notifikasi tenggat; setiap cron menjalankan antrean kanal luar.
 */
export async function runScheduledJobs(
  env: AppEnv,
  db: Db,
  cron: string,
  now: number = nowSeconds(),
): Promise<ScheduledSummary> {
  const daily = cron === DAILY_CRON;
  const summary: ScheduledSummary = {
    daily,
    deliveries: { processed: 0, sent: 0, failed: 0, retrying: 0 },
  };

  if (daily) {
    summary.sweep = await sweepPendingAttachments(env, db, now);
    const dueSoon = await notifyDueSoon(db, now);
    summary.dueSoonCreated = dueSoon.created;
  }

  summary.deliveries = await processDeliveries(env, db, now);
  return summary;
}
