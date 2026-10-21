import { describe, expect, it } from "vitest";
import {
  SESSION_REFRESH_AFTER_SECONDS,
  createSessionToken,
  readSessionToken,
  shouldRefreshSession,
} from "@/lib/auth/session";

const SECRET = "secret-uji-yang-panjangnya-lebih-dari-32-karakter";

describe("sesi bertanda tangan", () => {
  it("membaca kembali payload yang ditandatangani", async () => {
    const token = await createSessionToken(SECRET, {
      uid: "usr_1",
      role: "ADMIN",
      divisionId: "div_a",
      ttl: 3600,
    });
    const payload = await readSessionToken(SECRET, token);
    expect(payload).toMatchObject({ uid: "usr_1", role: "ADMIN", divisionId: "div_a" });
  });

  it("menolak token yang dimodifikasi, ditandatangani rahasia lain, atau kosong", async () => {
    const token = await createSessionToken(SECRET, { uid: "usr_1", role: "USER", divisionId: "div_a", ttl: 3600 });
    const [body] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ uid: "usr_9", role: "SUPER_ADMIN", divisionId: "div_b", iat: 1, exp: 9999999999 }),
    )
      .toString("base64url");

    expect(await readSessionToken(SECRET, `${forgedBody}.${token.split(".")[1]}`)).toBeNull();
    expect(await readSessionToken(SECRET, body)).toBeNull();
    expect(await readSessionToken(SECRET, `${body}.`)).toBeNull();
    expect(await readSessionToken(SECRET, undefined)).toBeNull();
    expect(await readSessionToken("rahasia-lain-yang-panjangnya-cukup-32", token)).toBeNull();
  });

  it("menolak token yang kedaluwarsa", async () => {
    const expired = await createSessionToken(SECRET, {
      uid: "usr_1",
      role: "USER",
      divisionId: "div_a",
      iat: Math.floor(Date.now() / 1000) - 7200,
      ttl: 3600,
    });
    expect(await readSessionToken(SECRET, expired)).toBeNull();
  });
});

describe("perpanjangan sesi", () => {
  it("belum memperpanjang sesi yang baru diterbitkan", () => {
    const payload = { uid: "usr_1", role: "USER" as const, divisionId: "div_a", iat: 1_000, exp: 2_000 };
    expect(shouldRefreshSession(payload, 1_000 + SESSION_REFRESH_AFTER_SECONDS - 1)).toBe(false);
  });

  it("memperpanjang sesi setelah ambang diam terlewat", () => {
    const payload = { uid: "usr_1", role: "USER" as const, divisionId: "div_a", iat: 1_000, exp: 2_000 };
    expect(shouldRefreshSession(payload, 1_000 + SESSION_REFRESH_AFTER_SECONDS)).toBe(true);
  });
});
