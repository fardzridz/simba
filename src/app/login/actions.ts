"use server";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { activityLogs, users } from "@/db/schema";
import { appContext, requireSessionSecret, type Db } from "@/env";
import { loadActor } from "@/lib/auth/current";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import {
  FAILED_LOGIN_ACTION,
  LOGIN_ENTITY_TYPE,
  THROTTLED_LOGIN_ACTION,
  loginThrottle,
} from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/auth/session";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";

export type LoginState = {
  error?: string;
  username?: string;
};

const credentials = z.object({
  username: z.string().trim().min(1, "Nama pengguna wajib diisi."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

/** Alamat asal permintaan untuk pembatasan percobaan masuk; null bila tidak ada. */
async function clientIp(): Promise<string | null> {
  const headerStore = await headers();
  const direct = headerStore.get("cf-connecting-ip");
  if (direct?.trim()) return direct.trim();
  const forwarded = headerStore.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first ? first : null;
}

function retryLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} detik`;
  return `${Math.ceil(seconds / 60)} menit`;
}

/**
 * Kegagalan dan penahanan masuk ke `activity_logs` dengan `entity_id` berisi nama
 * pengguna yang dicoba, supaya penghitung pembatasan bisa membaca riwayat itu
 * tanpa tabel tambahan (§9.2).
 */
async function recordLoginEvent(
  db: Db,
  event: { action: string; username: string; userId: string | null; ip: string | null; now: number; extra?: Record<string, unknown> },
): Promise<void> {
  await db.insert(activityLogs).values({
    id: newId("log"),
    actorId: event.userId,
    action: event.action,
    entityType: LOGIN_ENTITY_TYPE,
    entityId: event.username,
    prevValue: null,
    newValue: JSON.stringify({ username: event.username, ...event.extra }),
    ipAddress: event.ip,
    createdAt: new Date(event.now * 1000),
  });
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const typedUsername = String(formData.get("username") ?? "");
  const parsed = credentials.safeParse({ username: typedUsername, password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid.", username: typedUsername };
  }

  const { env, db } = appContext();
  const username = parsed.data.username.toLowerCase();
  const ip = await clientIp();
  const now = nowSeconds();

  const throttle = await loginThrottle(db, { username, ip }, now);
  if (throttle.blocked) {
    await recordLoginEvent(db, {
      action: THROTTLED_LOGIN_ACTION,
      username,
      userId: null,
      ip,
      now,
      extra: { retryAfterSeconds: throttle.retryAfterSeconds },
    });
    return {
      error: `Terlalu banyak percobaan masuk. Tunggu ${retryLabel(throttle.retryAfterSeconds)} lalu coba lagi.`,
      username: typedUsername,
    };
  }

  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      divisionId: users.divisionId,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  // Pesan galat disamakan agar tidak membocorkan bagian mana yang salah (§9.2).
  const genericError = "Nama pengguna atau kata sandi salah.";
  if (!user) {
    await recordLoginEvent(db, { action: FAILED_LOGIN_ACTION, username, userId: null, ip, now, extra: { reason: "unknown" } });
    return { error: genericError, username: typedUsername };
  }
  if (!user.isActive) {
    await recordLoginEvent(db, { action: FAILED_LOGIN_ACTION, username, userId: user.id, ip, now, extra: { reason: "inactive" } });
    return { error: "Akun Anda tidak aktif. Hubungi Super Admin.", username: typedUsername };
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await recordLoginEvent(db, { action: FAILED_LOGIN_ACTION, username, userId: user.id, ip, now, extra: { reason: "password" } });
    return { error: genericError, username: typedUsername };
  }

  const stamp = new Date(now * 1000);
  const stampLogin = db
    .update(users)
    .set({ lastLoginAt: stamp, updatedAt: stamp })
    .where(eq(users.id, user.id));
  const writeLog = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: user.id,
    action: "auth.login.success",
    entityType: "users",
    entityId: user.id,
    prevValue: null,
    newValue: JSON.stringify({ username, role: user.role }),
    ipAddress: ip,
    createdAt: stamp,
  });
  await db.batch([stampLogin, writeLog]);

  // Hash lama (iterasi di bawah standar) dibuat ulang saat login berhasil.
  if (needsRehash(user.passwordHash)) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.password), passwordChangedAt: stamp, updatedAt: stamp })
      .where(eq(users.id, user.id));
  }

  const token = await createSessionToken(requireSessionSecret(env), {
    uid: user.id,
    role: user.role,
    divisionId: user.divisionId,
  });
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const actor = await loadActor();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);

  if (actor) {
    const { db } = appContext();
    await db.insert(activityLogs).values({
      id: newId("log"),
      actorId: actor.id,
      action: "auth.logout",
      entityType: "users",
      entityId: actor.id,
      prevValue: null,
      newValue: null,
      ipAddress: null,
      createdAt: new Date(),
    });
  }

  redirect("/login");
}
