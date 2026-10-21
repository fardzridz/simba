import type { AppEnv } from "@/env";

/**
 * Kanal surel memakai penyedia HTTP dengan antarmuka `sendEmail` (§9.11, §12 #13).
 * Rahasia tidak punya nilai default: bila belum diisi, pemanggil harus menolak
 * permintaan sebelum menulis baris permintaan verifikasi.
 */

export class ChannelNotConfiguredError extends Error {
  constructor(channel: string) {
    super(`Kanal ${channel} belum dikonfigurasi.`);
    this.name = "ChannelNotConfiguredError";
  }
}

export class ChannelDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelDeliveryError";
  }
}

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export function isEmailConfigured(env: AppEnv): boolean {
  return Boolean(env.MAIL_API_KEY?.trim() && env.MAIL_FROM?.trim() && env.APP_BASE_URL?.trim());
}

export function appBaseUrl(env: AppEnv): string {
  const raw = env.APP_BASE_URL?.trim();
  if (!raw) throw new ChannelNotConfiguredError("surel");
  try {
    return new URL(raw).origin;
  } catch {
    throw new ChannelNotConfiguredError("surel");
  }
}

/** Satu implementasi HTTP (Resend). Penyedia lain cukup mengganti isi fungsi ini. */
export async function sendEmail(env: AppEnv, message: EmailMessage): Promise<void> {
  const apiKey = env.MAIL_API_KEY?.trim();
  const from = env.MAIL_FROM?.trim();
  if (!apiKey || !from) throw new ChannelNotConfiguredError("surel");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // Status saja; isi respons penyedia tidak pernah diteruskan ke pengguna.
    throw new ChannelDeliveryError(`Penyedia surel menolak permintaan (${response.status}).`);
  }
}
