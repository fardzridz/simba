import { describe, expect, it } from "vitest";
import {
  EMAIL_MAX_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
  evaluateOtpSendGate,
  generateOtpCode,
  generateVerificationToken,
  hashOtpCode,
  hashSecret,
  isValidVerificationToken,
  maskWaNumber,
  normalizeEmail,
  normalizeWaNumber,
  timingSafeEqualHex,
} from "./contact";

describe("normalizeWaNumber (§9.11 E.164)", () => {
  it("menerima format +62, 62, 0, dan 8", () => {
    expect(normalizeWaNumber("+62 812-3456-7890")).toBe("+6281234567890");
    expect(normalizeWaNumber("6281234567890")).toBe("+6281234567890");
    expect(normalizeWaNumber("0812 3456 7890")).toBe("+6281234567890");
    expect(normalizeWaNumber("812.3456.7890")).toBe("+6281234567890");
    expect(normalizeWaNumber("+62 (0) 812 3456 7890")).toBe("+6281234567890");
  });

  it("menolak kode negara lain, huruf, dan nomor terlalu pendek", () => {
    expect(normalizeWaNumber("+1 415 555 0100")).toBeNull();
    expect(normalizeWaNumber("+44 20 7946 0018")).toBeNull();
    expect(normalizeWaNumber("0812-ABCD-7890")).toBeNull();
    expect(normalizeWaNumber("08123")).toBeNull();
    expect(normalizeWaNumber("")).toBeNull();
    expect(normalizeWaNumber(null)).toBeNull();
  });
});

describe("maskWaNumber", () => {
  it("menyembunyikan digit tengah", () => {
    expect(maskWaNumber("+6281234567890")).toBe("+62 812•••• 890");
    expect(maskWaNumber("081234567890")).toBe("+62 812•••• 890");
    expect(maskWaNumber(null)).toBe("Belum diatur");
  });
});

describe("normalizeEmail", () => {
  it("menyimpan lowercase dan menolak format tidak valid", () => {
    expect(normalizeEmail("  Staf.Hukum@Contoh.Local ")).toBe("staf.hukum@contoh.local");
    expect(normalizeEmail("bukan-email")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail(`${"a".repeat(EMAIL_MAX_LENGTH)}@contoh.local`)).toBeNull();
  });
});

describe("token dan OTP", () => {
  it("membuat kode OTP 6 digit", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it("membuat token verifikasi 64 hex yang valid", () => {
    const token = generateVerificationToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(isValidVerificationToken(token)).toBe(true);
    expect(isValidVerificationToken(token.toUpperCase())).toBe(false);
    expect(isValidVerificationToken("pendek")).toBe(false);
  });

  it("mengikat hash OTP ke akun dan membandingkan secara waktu-tetap", async () => {
    const code = "123456";
    const first = await hashOtpCode("usr_a", code);
    const second = await hashOtpCode("usr_b", code);
    expect(first).toBe(await hashOtpCode("usr_a", code));
    expect(first).not.toBe(second);
    expect(timingSafeEqualHex(first, first)).toBe(true);
    expect(timingSafeEqualHex(first, second)).toBe(false);
    expect(timingSafeEqualHex("abc", "abcd")).toBe(false);
    expect(await hashSecret("abc")).toHaveLength(64);
  });
});

describe("evaluateOtpSendGate", () => {
  const now = 1_800_000_000;

  it("mengizinkan permintaan pertama dan kiriman di luar jeda", () => {
    expect(evaluateOtpSendGate({ lastSentAt: null, sendsInWindow: 0, now })).toEqual({
      allowed: true,
    });
    expect(
      evaluateOtpSendGate({
        lastSentAt: now - OTP_RESEND_COOLDOWN_SECONDS,
        sendsInWindow: 1,
        now,
      }),
    ).toEqual({ allowed: true });
  });

  it("menolak kiriman dalam 60 detik dengan sisa waktu", () => {
    const result = evaluateOtpSendGate({ lastSentAt: now - 10, sendsInWindow: 1, now });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("50 detik");
  });

  it("menolak kiriman keempat dalam jendela 15 menit", () => {
    const result = evaluateOtpSendGate({ lastSentAt: null, sendsInWindow: 3, now });
    expect(result.allowed).toBe(false);
  });
});
