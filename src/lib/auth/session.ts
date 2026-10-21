import type { Role } from "@/db/schema";

/**
 * Sesi = cookie bertanda tangan HMAC-SHA256 (tanpa tabel sesi, sesuai §6.1).
 * Pencabutan dilakukan dengan membandingkan `iat` terhadap `users.password_changed_at`
 * dan `users.is_active`, sehingga reset sandi atau penonaktifan akun langsung
 * membatalkan seluruh sesi lama tanpa perlu menyimpan daftar token.
 */
export const SESSION_COOKIE = "pd_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/**
 * Sesi diperpanjang hanya saat ada aktivitas pengguna yang cukup lama sejak
 * penerbitan token, sehingga masa berlakunya adalah "8 jam diam" (§9.2), bukan
 * delapan jam sejak login.
 */
export const SESSION_REFRESH_AFTER_SECONDS = 15 * 60;

export function shouldRefreshSession(payload: SessionPayload, now: number): boolean {
  return now - payload.iat >= SESSION_REFRESH_AFTER_SECONDS;
}

export type SessionPayload = {
  uid: string;
  role: Role;
  divisionId: string;
  iat: number;
  exp: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

async function sign(secret: string, body: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(body));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(
  secret: string,
  payload: Omit<SessionPayload, "iat" | "exp"> & { iat?: number; ttl?: number },
): Promise<string> {
  const iat = payload.iat ?? Math.floor(Date.now() / 1000);
  const exp = iat + (payload.ttl ?? SESSION_TTL_SECONDS);
  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ uid: payload.uid, role: payload.role, divisionId: payload.divisionId, iat, exp })),
  );
  return `${body}.${await sign(secret, body)}`;
}

export async function readSessionToken(secret: string, token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = await sign(secret, body);
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  if (diff !== 0) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(body)) as SessionPayload;
    if (typeof parsed.uid !== "string" || typeof parsed.iat !== "number" || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
