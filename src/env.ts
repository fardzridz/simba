import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

/**
 * Binding runtime: `DB` (D1), `BUCKET` (R2), `SESSION_SECRET`, `APP_ENV`.
 * Definisi berasal dari worker-configuration.d.ts (hasil `wrangler types`) yang
 * disatukan ke `CloudflareEnv` di src/types.d.ts.
 */
export type AppEnv = CloudflareEnv;

/** Tipe basis data yang dipakai seluruh lapisan server. */
export type Db = DrizzleD1Database<typeof schema>;

export type AppContext = {
  env: AppEnv;
  db: Db;
};

function createDb(binding: D1Database): Db {
  return drizzle(binding, { schema });
}

/**
 * Satu pintu keluar untuk binding Cloudflare. Dipanggil di server (server component,
 * server action, route handler), bukan di komponen klien.
 */
export function appContext(): AppContext {
  const { env } = getCloudflareContext();
  return { env, db: createDb(env.DB) };
}

export function requireSessionSecret(env: AppEnv): string {
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET belum diatur (minimal 32 karakter).");
  }
  return secret;
}
