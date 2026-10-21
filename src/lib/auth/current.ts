import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { users } from "@/db/schema";
import { appContext, requireSessionSecret } from "@/env";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";
import type { Actor } from "@/lib/auth/scope";

/**
 * Pelaku terautentikasi untuk satu permintaan.
 *
 * Sesi juga dicabut di sini: token yang diterbitkan sebelum `password_changed_at`
 * (misalnya setelah reset sandi) atau milik akun nonaktif ditolak, sehingga tidak
 * perlu tabel sesi terpisah.
 */
export async function loadActor(): Promise<Actor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const { env, db } = appContext();
  const payload = await readSessionToken(requireSessionSecret(env), token);
  if (!payload) return null;

  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      divisionId: users.divisionId,
      isActive: users.isActive,
      passwordChangedAt: users.passwordChangedAt,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.id, payload.uid))
    .limit(1);

  if (!row || !row.isActive) return null;
  if (row.passwordChangedAt.getTime() / 1000 > payload.iat) return null;

  return { id: row.id, role: row.role, divisionId: row.divisionId };
}

export async function requireActor(): Promise<Actor> {
  const actor = await loadActor();
  if (!actor) redirect("/login");
  return actor;
}

export async function actorWithProfile(): Promise<Actor & { fullName: string }> {
  const actor = await requireActor();
  const { db } = appContext();
  const [row] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, actor.id))
    .limit(1);
  return { ...actor, fullName: row?.fullName ?? actor.id };
}
