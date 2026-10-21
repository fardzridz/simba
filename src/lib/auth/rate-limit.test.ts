import { describe, expect, it } from "vitest";
import { evaluateThrottle } from "@/lib/auth/rate-limit";

const now = 1_800_000_000;

describe("evaluateThrottle", () => {
  it("membiarkan percobaan selama belum ada kegagalan", () => {
    expect(evaluateThrottle({ shortCount: 0, longCount: 0, newestAt: null }, now)).toEqual({ blocked: false });
  });

  it("membiarkan empat kegagalan dalam satu menit", () => {
    const decision = evaluateThrottle({ shortCount: 4, longCount: 4, newestAt: now - 5 }, now);
    expect(decision).toEqual({ blocked: false });
  });

  it("menahan satu menit setelah kegagalan kelima", () => {
    const decision = evaluateThrottle({ shortCount: 5, longCount: 5, newestAt: now - 10 }, now);
    expect(decision).toEqual({ blocked: true, retryAfterSeconds: 50 });
  });

  it("melepas tahanan setelah jeda satu menit lewat", () => {
    expect(evaluateThrottle({ shortCount: 5, longCount: 5, newestAt: now - 60 }, now)).toEqual({ blocked: false });
  });

  it("memperpanjang jeda bila pola gagal berlanjut sampai 15 kali", () => {
    const decision = evaluateThrottle({ shortCount: 3, longCount: 15, newestAt: now - 30 }, now);
    expect(decision).toEqual({ blocked: true, retryAfterSeconds: 15 * 60 - 30 });
  });

  it("menghitung ulang jeda dari kegagalan terbaru, bukan dari kegagalan pertama", () => {
    const fresh = evaluateThrottle({ shortCount: 5, longCount: 6, newestAt: now - 1 }, now);
    const older = evaluateThrottle({ shortCount: 5, longCount: 6, newestAt: now - 30 }, now);
    expect(fresh.blocked && older.blocked).toBe(true);
    if (fresh.blocked && older.blocked) {
      expect(fresh.retryAfterSeconds).toBeGreaterThan(older.retryAfterSeconds);
    }
  });
});
