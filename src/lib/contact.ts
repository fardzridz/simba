/**
 * Aturan kontak akun (§1 D11–D12, §9.11). Bagian normalisasi dan masking murni
 * supaya bisa dipakai komponen klien; hash memakai WebCrypto dan hanya dipanggil server.
 */

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_SEND_WINDOW_SECONDS = 15 * 60;
export const OTP_MAX_SENDS_PER_WINDOW = 3;
export const EMAIL_CHANGE_TTL_SECONDS = 24 * 60 * 60;
export const EMAIL_MAX_LENGTH = 254;
export const VERIFICATION_TOKEN_HEX_LENGTH = 64;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email disimpan lowercase dan kosong menjadi null (§9.11). */
export function normalizeEmail(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase() ?? "";
  if (!value || value.length > EMAIL_MAX_LENGTH) return null;
  if (!EMAIL_PATTERN.test(value)) return null;
  return value;
}

/**
 * Nomor WhatsApp disimpan E.164 dengan awalan +62. Menerima input +62…, 62…,
 * 0…, atau 8… dan menolak kode negara lain. Mengembalikan null bila tidak valid.
 */
export function normalizeWaNumber(raw: string | null | undefined): string | null {
  const compact = raw?.trim().replace(/[\s().-]/g, "") ?? "";
  if (!compact || !/^\+?\d+$/.test(compact)) return null;

  let digits = compact.replace(/\D/g, "");
  if (compact.startsWith("+")) {
    if (!digits.startsWith("62")) return null;
  } else if (digits.startsWith("62")) {
    // sudah berkode negara
  } else if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  } else {
    return null;
  }

  // "+6208…" adalah salah ketik umum; nol setelah kode negara tidak dipakai.
  if (digits.startsWith("620")) digits = `62${digits.slice(3)}`;
  if (!digits.startsWith("62")) return null;
  if (digits.length < 9 || digits.length > 15) return null;

  return `+${digits}`;
}

/** Tampilan tersamar untuk pemilik akun: +62 812•••• 345 (§9.11). */
export function maskWaNumber(raw: string | null | undefined): string {
  const normalized = normalizeWaNumber(raw);
  if (!normalized) return "Belum diatur";
  const rest = normalized.slice(3);
  if (rest.length < 7) return normalized;
  return `+62 ${rest.slice(0, 3)}•••• ${rest.slice(-3)}`;
}

/** Kode OTP 6 digit yang seragam (rejection sampling, bukan modulo bias). */
export function generateOtpCode(): string {
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= limit);
  return String(value % 1_000_000).padStart(6, "0");
}

/** Token tautan verifikasi: 32 byte acak sebagai hex 64 karakter. */
export function generateVerificationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isValidVerificationToken(token: string): boolean {
  return new RegExp(`^[0-9a-f]{${VERIFICATION_TOKEN_HEX_LENGTH}}$`).test(token);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hex. Token dan kode OTP tidak pernah disimpan mentah (§9.11). */
export async function hashSecret(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
}

/** OTP diikat ke pemilik akun supaya hash yang sama tidak berlaku lintas akun. */
export async function hashOtpCode(userId: string, code: string): Promise<string> {
  return hashSecret(`${userId}:${code}`);
}

/** Perbandingan waktu-tetap untuk hash hex. */
export function timingSafeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export type OtpSendGateInput = {
  lastSentAt: number | null;
  sendsInWindow: number;
  now: number;
};

export type OtpSendGate = { allowed: true } | { allowed: false; reason: string };

/**
 * Batas kirim OTP: jeda 60 detik dan maksimal 3 kiriman per 15 menit untuk
 * akun maupun nomor tujuan (§9.11).
 */
export function evaluateOtpSendGate({
  lastSentAt,
  sendsInWindow,
  now,
}: OtpSendGateInput): OtpSendGate {
  if (lastSentAt !== null && now - lastSentAt < OTP_RESEND_COOLDOWN_SECONDS) {
    const wait = OTP_RESEND_COOLDOWN_SECONDS - (now - lastSentAt);
    return { allowed: false, reason: `Tunggu ${wait} detik sebelum meminta kode baru.` };
  }
  if (sendsInWindow >= OTP_MAX_SENDS_PER_WINDOW) {
    return { allowed: false, reason: "Terlalu banyak permintaan kode. Coba lagi nanti." };
  }
  return { allowed: true };
}
