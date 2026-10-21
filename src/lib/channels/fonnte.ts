import type { AppEnv } from "@/env";
import { ChannelDeliveryError, ChannelNotConfiguredError } from "./mail";

/**
 * Pengiriman OTP lewat Fonnte (§9.11): target tanpa tanda plus, `countryCode=62`,
 * dan `connectOnly=true` supaya pesan tidak dikirim sebelum perangkat tersambung.
 * Status `process: pending` berarti gateway menerima pesan, bukan pesan dibaca.
 */

type FonnteResponse = {
  status?: boolean | string;
  reason?: string;
  requestid?: string;
};

export function isWhatsAppConfigured(env: AppEnv): boolean {
  return Boolean(env.FONNTE_TOKEN?.trim());
}

export async function sendWhatsAppMessage(
  env: AppEnv,
  target: string,
  message: string,
): Promise<string | null> {
  const token = env.FONNTE_TOKEN?.trim();
  if (!token) throw new ChannelNotConfiguredError("WhatsApp");

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: target.replace(/^\+/, ""),
      message,
      countryCode: "62",
      connectOnly: true,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new ChannelDeliveryError(`Gateway WhatsApp menolak permintaan (${response.status}).`);
  }

  const payload = (await response.json().catch(() => null)) as FonnteResponse | null;
  const accepted = payload?.status === true || payload?.status === "true";
  if (!accepted) {
    throw new ChannelDeliveryError(payload?.reason ?? "Gateway WhatsApp tidak menerima pesan.");
  }

  return payload?.requestid ?? null;
}
