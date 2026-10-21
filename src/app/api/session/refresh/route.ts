import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appContext, requireSessionSecret } from "@/env";
import { loadActor } from "@/lib/auth/current";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  readSessionToken,
  shouldRefreshSession,
} from "@/lib/auth/session";
import { nowSeconds } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Perpanjang sesi saat ada aktivitas pengguna (§9.2: masa berlaku 8 jam diam).
 * Dipanggil klien secara berkala saat pengguna benar-benar berinteraksi, bukan
 * saat halaman sekadar terbuka. Cookie dipasang pada respons yang dikembalikan,
 * bukan lewat `cookies().set()`, karena respons di sini dibuat sendiri.
 */
export async function POST(): Promise<Response> {
  const { env } = appContext();
  const secret = requireSessionSecret(env);
  const cookieStore = await cookies();
  const payload = await readSessionToken(secret, cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return new Response(null, { status: 401 });

  const now = nowSeconds();
  if (!shouldRefreshSession(payload, now)) return new Response(null, { status: 204 });

  // Sesi yang sudah dicabut (akun nonaktif, sandi direset) tidak diperpanjang.
  const actor = await loadActor();
  if (!actor) return new Response(null, { status: 401 });

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(secret, {
      uid: actor.id,
      role: actor.role,
      divisionId: actor.divisionId,
      iat: now,
    }),
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
