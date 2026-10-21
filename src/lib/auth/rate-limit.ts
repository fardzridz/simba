import { and, eq, gte, sql, type SQL } from "drizzle-orm";
import { activityLogs } from "@/db/schema";
import type { Db } from "@/env";

/**
 * Pembatasan percobaan masuk (§9.2 rancangan): 5 kegagalan per menit per akun
 * dan per alamat IP, dengan jeda yang bertambah bila pola gagal berlanjut.
 * Penghitungnya dibaca dari `activity_logs`, bukan dari memori isolate, karena
 * satu permintaan bisa dilayani isolate yang berbeda.
 */
export const FAILED_LOGIN_ACTION = "auth.login.failed";
export const THROTTLED_LOGIN_ACTION = "auth.login.throttled";
export const LOGIN_ENTITY_TYPE = "users";

const SHORT_WINDOW_SECONDS = 60;
const SHORT_LIMIT = 5;
const SHORT_BLOCK_SECONDS = 60;

const LONG_WINDOW_SECONDS = 15 * 60;
const LONG_LIMIT = 15;
const LONG_BLOCK_SECONDS = 15 * 60;

export type AttemptSummary = {
  shortCount: number;
  longCount: number;
  newestAt: number | null;
};

export type Throttle = { blocked: false } | { blocked: true; retryAfterSeconds: number };

/**
 * Keputusan dari ringkasan percobaan, dipisah dari basis data supaya bisa diuji.
 * Jeda dihitung dari kegagalan terbaru, sehingga kegagalan berikutnya saat sedang
 * diblokir memperpanjang jeda, bukan memulai ulang.
 */
export function evaluateThrottle(summary: AttemptSummary, now: number): Throttle {
  if (summary.newestAt === null) return { blocked: false };
  const escalated = summary.longCount >= LONG_LIMIT;
  if (!escalated && summary.shortCount < SHORT_LIMIT) return { blocked: false };
  const until = summary.newestAt + (escalated ? LONG_BLOCK_SECONDS : SHORT_BLOCK_SECONDS);
  if (now >= until) return { blocked: false };
  return { blocked: true, retryAfterSeconds: until - now };
}

async function summarize(db: Db, filter: SQL, now: number): Promise<AttemptSummary> {
  const shortCutoff = now - SHORT_WINDOW_SECONDS;
  const longCutoff = now - LONG_WINDOW_SECONDS;
  const [row] = await db
    .select({
      shortCount: sql<number>`sum(case when ${activityLogs.createdAt} >= ${shortCutoff} then 1 else 0 end)`,
      longCount: sql<number>`count(*)`,
      newestAt: sql<number | null>`max(${activityLogs.createdAt})`,
    })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.action, FAILED_LOGIN_ACTION),
        eq(activityLogs.entityType, LOGIN_ENTITY_TYPE),
        gte(activityLogs.createdAt, new Date(longCutoff * 1000)),
        filter,
      ),
    );

  return {
    shortCount: Number(row?.shortCount ?? 0),
    longCount: Number(row?.longCount ?? 0),
    newestAt: row?.newestAt === null || row?.newestAt === undefined ? null : Number(row.newestAt),
  };
}

/**
 * Cek dua ember sekaligus: per akun (berdasarkan nama pengguna yang dicoba) dan
 * per alamat IP, supaya penyerang yang mengganti nama pengguna tetap tertahan.
 */
export async function loginThrottle(
  db: Db,
  keys: { username: string; ip: string | null },
  now: number,
): Promise<Throttle> {
  const byAccount = await summarize(db, eq(activityLogs.entityId, keys.username), now);
  const accountDecision = evaluateThrottle(byAccount, now);
  if (accountDecision.blocked || !keys.ip) return accountDecision;

  const byIp = await summarize(db, eq(activityLogs.ipAddress, keys.ip), now);
  return evaluateThrottle(byIp, now);
}
