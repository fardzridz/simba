import { describe, expect, it } from "vitest";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";

const FAST_ITERATIONS = 100_000;

describe("hashPassword / verifyPassword", () => {
  it("menerima sandi yang benar dan menolak yang salah", async () => {
    const encoded = await hashPassword("Rahasia#2026", FAST_ITERATIONS);
    expect(await verifyPassword("Rahasia#2026", encoded)).toBe(true);
    expect(await verifyPassword("rahasia#2026", encoded)).toBe(false);
    expect(await verifyPassword("", encoded)).toBe(false);
  });

  it("menghasilkan hash berbeda untuk sandi sama (salt acak)", async () => {
    const first = await hashPassword("sandi-sama", FAST_ITERATIONS);
    const second = await hashPassword("sandi-sama", FAST_ITERATIONS);
    expect(first).not.toBe(second);
    expect(await verifyPassword("sandi-sama", first)).toBe(true);
    expect(await verifyPassword("sandi-sama", second)).toBe(true);
  });

  it("menolak hash yang diubah atau formatnya tidak dikenal", async () => {
    const encoded = await hashPassword("sandi-asli", FAST_ITERATIONS);
    const [algorithm, iterations, salt, digest] = encoded.split("$");
    const tampered = `${algorithm}$${iterations}$${salt}$${digest?.slice(0, -2) ?? "xx"}xx`;
    expect(await verifyPassword("sandi-asli", tampered)).toBe(false);
    expect(await verifyPassword("sandi-asli", "bcrypt$10$abc$def")).toBe(false);
    expect(await verifyPassword("sandi-asli", "pbkdf2-sha256$1000$abc$def")).toBe(false);
    expect(await verifyPassword("sandi-asli", "")).toBe(false);
  });

  it("menandai hash dengan iterasi rendah untuk dibuat ulang", async () => {
    const weak = await hashPassword("sandi", 100_000);
    const strong = await hashPassword("sandi", 200_000);
    expect(needsRehash(weak, 200_000)).toBe(true);
    expect(needsRehash(strong, 200_000)).toBe(false);
    expect(needsRehash("format-rusak")).toBe(true);
  });
});
