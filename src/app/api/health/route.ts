import { sql } from "drizzle-orm";
import { appContext } from "@/env";

export const dynamic = "force-dynamic";

/** Cek sehat untuk langkah smoke test rilis (§9.8): aplikasi + basis data. */
export async function GET() {
  const startedAt = Date.now();
  const { db, env } = appContext();
  try {
    await db.run(sql`select 1`);
    return Response.json({
      status: "ok",
      database: "ok",
      environment: env.APP_ENV,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return Response.json(
      {
        status: "degraded",
        database: "unreachable",
        environment: env.APP_ENV,
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 503 },
    );
  }
}
