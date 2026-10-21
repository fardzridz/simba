"use server";

import { and, desc, eq, gte, isNull, ne, or } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CHANNELS,
  activityLogs,
  emailChangeRequests,
  notificationPreferences,
  otpCodes,
  users,
  type Channel,
} from "@/db/schema";
import { appContext, requireSessionSecret } from "@/env";
import { APP_SIGNATURE } from "@/lib/notification-format";
import { loadActor } from "@/lib/auth/current";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  appBaseUrl,
  isEmailConfigured,
  sendEmail,
} from "@/lib/channels/mail";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/channels/fonnte";
import {
  EMAIL_CHANGE_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_SEND_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
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
} from "@/lib/contact";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";
import { newId } from "@/lib/ids";
import { nowSeconds } from "@/lib/time";

export type ChangePasswordState = {
  success?: boolean;
  message?: string;
  error?: string;
};

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi."),
    newPassword: z
      .string()
      .min(12, "Kata sandi baru minimal 12 karakter."),
    confirmPassword: z
      .string()
      .min(1, "Ulangi kata sandi baru wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Ulangi kata sandi tidak cocok dengan kata sandi baru.",
    path: ["confirmPassword"],
  });

async function clientIp(): Promise<string | null> {
  const headerStore = await headers();
  return (
    headerStore.get("cf-connecting-ip") ??
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    null
  );
}

export async function changePassword(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      error: firstIssue?.message ?? "Format isian formulir tidak valid.",
    };
  }

  const actor = await loadActor();
  if (!actor) {
    return {
      error: "Sesi telah berakhir atau tidak valid. Silakan masuk kembali.",
    };
  }

  const { env, db } = appContext();

  const [currentUser] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      role: users.role,
      divisionId: users.divisionId,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, actor.id))
    .limit(1);

  if (!currentUser || !currentUser.isActive) {
    return {
      error: "Akun Anda tidak aktif atau tidak ditemukan.",
    };
  }

  // Verifikasi kata sandi saat ini
  const validCurrent = await verifyPassword(
    parsed.data.currentPassword,
    currentUser.passwordHash,
  );
  if (!validCurrent) {
    return {
      error: "Kata sandi saat ini tidak cocok.",
    };
  }

  // Larang kata sandi baru persis sama dengan kata sandi saat ini
  const isSamePassword = await verifyPassword(
    parsed.data.newPassword,
    currentUser.passwordHash,
  );
  if (isSamePassword) {
    return {
      error: "Kata sandi baru tidak boleh sama dengan kata sandi saat ini.",
    };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  const now = nowSeconds();
  const stamp = new Date(now * 1000);
  const ip = await clientIp();

  const updatePassword = db
    .update(users)
    .set({
      passwordHash: newHash,
      passwordChangedAt: stamp,
      updatedAt: stamp,
    })
    .where(eq(users.id, currentUser.id));

  const writeAuditLog = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: currentUser.id,
    action: "auth.password.change",
    entityType: "user",
    entityId: currentUser.id,
    ipAddress: ip,
    createdAt: stamp,
  });

  await db.batch([updatePassword, writeAuditLog]);

  // Rotasi token sesi untuk perangkat aktif saat ini
  // Token lama di browser/perangkat lain otomatis gugur karena iat < passwordChangedAt
  const token = await createSessionToken(requireSessionSecret(env), {
    uid: currentUser.id,
    role: currentUser.role,
    divisionId: currentUser.divisionId,
    iat: now,
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

  return {
    success: true,
    message: "Kata sandi berhasil diperbarui. Sesi di perangkat lain telah diakhiri.",
  };
}

export type ContactActionResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

export type WaActionResult = ContactActionResult & {
  maskedNumber?: string;
};

export type ConfirmEmailResult = ContactActionResult & {
  email?: string;
  code?: "unauthenticated" | "invalid" | "conflict";
};

type AccountContact = {
  id: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  waNumber: string | null;
  waVerifiedAt: Date | null;
  isActive: boolean;
};

async function loadAccountContact(
  db: ReturnType<typeof appContext>["db"],
  userId: string,
): Promise<AccountContact | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      waNumber: users.waNumber,
      waVerifiedAt: users.waVerifiedAt,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Membuat permintaan ubah surel dan mengirim tautan ber-token ke alamat baru
 * (§9.11). `users.email` tidak berubah sampai tautan dibuka; token hanya
 * disimpan sebagai hash dan permintaan sebelumnya dibatalkan.
 */
export async function requestEmailChange(newEmail: string): Promise<ContactActionResult> {
  const actor = await loadActor();
  if (!actor) return { error: "Sesi telah berakhir. Silakan masuk kembali." };

  const email = normalizeEmail(newEmail);
  if (!email) return { error: "Format alamat surel tidak valid." };

  const { env, db } = appContext();
  const account = await loadAccountContact(db, actor.id);
  if (!account || !account.isActive) {
    return { error: "Akun Anda tidak aktif atau tidak ditemukan." };
  }

  if (account.email?.toLowerCase() === email) {
    return { error: "Alamat surel baru tidak boleh sama dengan alamat saat ini." };
  }

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (taken) return { error: "Alamat surel sudah digunakan akun lain." };

  if (!isEmailConfigured(env)) {
    return { error: "Kanal surel belum dikonfigurasi. Hubungi administrator sistem." };
  }

  const token = generateVerificationToken();
  const tokenHash = await hashSecret(token);
  const now = nowSeconds();
  const stamp = new Date(now * 1000);
  const requestId = newId("emailRequest");

  const invalidatePrevious = db
    .update(emailChangeRequests)
    .set({ consumedAt: stamp })
    .where(
      and(
        eq(emailChangeRequests.userId, actor.id),
        isNull(emailChangeRequests.consumedAt),
      ),
    );

  const insertRequest = db.insert(emailChangeRequests).values({
    id: requestId,
    userId: actor.id,
    newEmail: email,
    tokenHash,
    expiresAt: new Date((now + EMAIL_CHANGE_TTL_SECONDS) * 1000),
    createdAt: stamp,
  });

  await db.batch([invalidatePrevious, insertRequest]);

  const verificationUrl = `${appBaseUrl(env)}/account/verify-email?token=${token}`;

  try {
    await sendEmail(env, {
      to: email,
      subject: "Verifikasi alamat surel baru",
      text: [
        "Halo,",
        "",
        "Tautan verifikasi untuk mengubah alamat surel akun Portal Pengarsipan & Penugasan Divisi:",
        verificationUrl,
        "",
        "Tautan berlaku 24 jam dan hanya dapat dibuka sekali. Alamat surel Anda saat ini tetap aktif sampai tautan ini dibuka.",
        "",
        "Jika Anda tidak meminta perubahan ini, abaikan pesan ini.",
      ].join("\n"),
    });
  } catch {
    await db.delete(emailChangeRequests).where(eq(emailChangeRequests.id, requestId));
    return { error: "Tautan verifikasi gagal dikirim. Coba lagi beberapa saat lagi." };
  }

  await db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "account.email.request",
    entityType: "user",
    entityId: actor.id,
    prevValue: JSON.stringify({ email: account.email }),
    newValue: JSON.stringify({ email }),
    createdAt: stamp,
  });

  revalidatePath("/account");
  return {
    success: true,
    message: `Tautan verifikasi dikirim ke ${email}. Alamat saat ini tetap aktif sampai tautan dibuka.`,
  };
}

/**
 * Menukar token tautan menjadi perubahan `users.email`. Hanya pemilik akun yang
 * boleh menyelesaikan permintaan, dan token tidak dapat dipakai dua kali.
 */
export async function confirmEmailChange(token: string): Promise<ConfirmEmailResult> {
  if (!isValidVerificationToken(token)) {
    return { error: "Tautan verifikasi tidak valid.", code: "invalid" };
  }

  const actor = await loadActor();
  if (!actor) {
    return { error: "Sesi telah berakhir. Silakan masuk kembali.", code: "unauthenticated" };
  }

  const { env, db } = appContext();
  const now = nowSeconds();
  const stamp = new Date(now * 1000);
  const tokenHash = await hashSecret(token);

  const [request] = await db
    .select({
      id: emailChangeRequests.id,
      userId: emailChangeRequests.userId,
      newEmail: emailChangeRequests.newEmail,
    })
    .from(emailChangeRequests)
    .where(
      and(
        eq(emailChangeRequests.tokenHash, tokenHash),
        eq(emailChangeRequests.userId, actor.id),
        isNull(emailChangeRequests.consumedAt),
        gte(emailChangeRequests.expiresAt, stamp),
      ),
    )
    .limit(1);

  if (!request) {
    return { error: "Tautan sudah kedaluwarsa atau pernah dipakai.", code: "invalid" };
  }

  const account = await loadAccountContact(db, actor.id);
  if (!account || !account.isActive) {
    return { error: "Akun Anda tidak aktif atau tidak ditemukan.", code: "invalid" };
  }

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, request.newEmail), ne(users.id, actor.id)))
    .limit(1);
  if (taken) {
    return { error: "Alamat surel sudah digunakan akun lain.", code: "conflict" };
  }

  const updateUser = db
    .update(users)
    .set({
      email: request.newEmail,
      emailVerifiedAt: stamp,
      updatedAt: stamp,
    })
    .where(eq(users.id, actor.id));

  const consumeRequest = db
    .update(emailChangeRequests)
    .set({ consumedAt: stamp })
    .where(eq(emailChangeRequests.id, request.id));

  const writeLog = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "account.email.confirm",
    entityType: "user",
    entityId: actor.id,
    prevValue: JSON.stringify({ email: account.email }),
    newValue: JSON.stringify({ email: request.newEmail }),
    createdAt: stamp,
  });

  await db.batch([updateUser, consumeRequest, writeLog]);

  // Pemberitahuan ke alamat lama bersifat best-effort dan tidak membatalkan perubahan.
  if (account.email && isEmailConfigured(env)) {
    try {
      await sendEmail(env, {
        to: account.email,
        subject: "Alamat surel akun telah diubah",
        text: [
          "Halo,",
          "",
          `Alamat surel akun Anda telah diubah menjadi ${request.newEmail}.`,
          "Jika Anda tidak melakukan perubahan ini, segera hubungi administrator sistem.",
        ].join("\n"),
      });
    } catch {
      // Kegagalan pemberitahuan tidak mengubah hasil verifikasi.
    }
  }

  revalidatePath("/account");
  return { success: true, email: request.newEmail, code: undefined };
}

/**
 * Meminta kode OTP untuk nomor WhatsApp baru. Nomor yang sudah terverifikasi di
 * akun lain ditolak sebelum kode dikirim, dan batas kirim dibaca dari `otp_codes`
 * sehingga tetap berlaku lintas isolate (§9.11).
 */
export async function requestWaOtp(input: string): Promise<WaActionResult> {
  const actor = await loadActor();
  if (!actor) return { error: "Sesi telah berakhir. Silakan masuk kembali." };

  const target = normalizeWaNumber(input);
  if (!target) {
    return { error: "Nomor WhatsApp tidak valid. Gunakan format +62 diikuti 9–13 digit." };
  }

  const { env, db } = appContext();
  const account = await loadAccountContact(db, actor.id);
  if (!account || !account.isActive) {
    return { error: "Akun Anda tidak aktif atau tidak ditemukan." };
  }

  if (account.waNumber === target && account.waVerifiedAt) {
    return { error: "Nomor ini sudah terpasang dan terverifikasi pada akun Anda." };
  }

  const [claimed] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.waNumber, target), ne(users.id, actor.id)))
    .limit(1);
  if (claimed) {
    return { error: "Nomor WhatsApp tidak dapat digunakan." };
  }

  if (!isWhatsAppConfigured(env)) {
    return { error: "Kanal WhatsApp belum dikonfigurasi. Hubungi administrator sistem." };
  }

  const now = nowSeconds();
  const stamp = new Date(now * 1000);
  const windowStart = new Date((now - OTP_SEND_WINDOW_SECONDS) * 1000);

  const recent = await db
    .select({
      userId: otpCodes.userId,
      target: otpCodes.target,
      createdAt: otpCodes.createdAt,
    })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.purpose, "WA_VERIFY"),
        gte(otpCodes.createdAt, windowStart),
        or(eq(otpCodes.userId, actor.id), eq(otpCodes.target, target)),
      ),
    )
    .orderBy(desc(otpCodes.createdAt));

  const forUser = recent.filter((row) => row.userId === actor.id);
  const forTarget = recent.filter((row) => row.target === target);
  const latest = forUser[0]?.createdAt ?? forTarget[0]?.createdAt ?? null;

  const gate = evaluateOtpSendGate({
    lastSentAt: latest ? Math.floor(latest.getTime() / 1000) : null,
    sendsInWindow: Math.max(forUser.length, forTarget.length),
    now,
  });
  if (!gate.allowed) {
    return { error: gate.reason };
  }

  const code = generateOtpCode();
  const otpId = newId("otp");

  await db.insert(otpCodes).values({
    id: otpId,
    userId: actor.id,
    target,
    purpose: "WA_VERIFY",
    codeHash: await hashOtpCode(actor.id, code),
    attempts: 0,
    expiresAt: new Date((now + OTP_TTL_SECONDS) * 1000),
    createdAt: stamp,
  });

  try {
    await sendWhatsAppMessage(
      env,
      target,
      `${APP_SIGNATURE}\n\nKode verifikasi WhatsApp: *${code}*\nBerlaku 10 menit. Jangan bagikan kode ini.`,
    );
  } catch {
    await db.delete(otpCodes).where(eq(otpCodes.id, otpId));
    return { error: "Kode verifikasi gagal dikirim. Coba lagi beberapa saat lagi." };
  }

  return {
    success: true,
    maskedNumber: maskWaNumber(target),
    message: `Kode verifikasi 6 digit dikirim ke ${maskWaNumber(target)}.`,
  };
}

/** Menukar kode OTP menjadi nomor WhatsApp terverifikasi milik aktor. */
export async function verifyWaOtp(input: string, codeInput: string): Promise<WaActionResult> {
  const actor = await loadActor();
  if (!actor) return { error: "Sesi telah berakhir. Silakan masuk kembali." };

  const target = normalizeWaNumber(input);
  if (!target) return { error: "Nomor WhatsApp tidak valid." };

  const code = codeInput.trim();
  if (!/^\d{6}$/.test(code)) return { error: "Masukkan 6 digit angka kode OTP." };

  const { db } = appContext();
  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  const [row] = await db
    .select({
      id: otpCodes.id,
      codeHash: otpCodes.codeHash,
      attempts: otpCodes.attempts,
    })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, actor.id),
        eq(otpCodes.purpose, "WA_VERIFY"),
        eq(otpCodes.target, target),
        isNull(otpCodes.consumedAt),
        gte(otpCodes.expiresAt, stamp),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!row) {
    return { error: "Kode tidak ditemukan atau sudah kedaluwarsa. Minta kode baru." };
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return { error: "Terlalu banyak percobaan. Minta kode baru." };
  }

  const matches = timingSafeEqualHex(await hashOtpCode(actor.id, code), row.codeHash);
  if (!matches) {
    await db
      .update(otpCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(otpCodes.id, row.id));
    return {
      error: `Kode OTP salah. Sisa percobaan: ${OTP_MAX_ATTEMPTS - row.attempts - 1}.`,
    };
  }

  const [claimed] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.waNumber, target), ne(users.id, actor.id)))
    .limit(1);
  if (claimed) {
    return { error: "Nomor WhatsApp tidak dapat digunakan." };
  }

  const account = await loadAccountContact(db, actor.id);
  if (!account || !account.isActive) {
    return { error: "Akun Anda tidak aktif atau tidak ditemukan." };
  }

  const consumeOtp = db
    .update(otpCodes)
    .set({ consumedAt: stamp })
    .where(eq(otpCodes.id, row.id));

  const updateUser = db
    .update(users)
    .set({ waNumber: target, waVerifiedAt: stamp, updatedAt: stamp })
    .where(eq(users.id, actor.id));

  const writeLog = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "account.wa.verify",
    entityType: "user",
    entityId: actor.id,
    prevValue: JSON.stringify({ waNumber: account.waNumber }),
    newValue: JSON.stringify({ waNumber: target }),
    createdAt: stamp,
  });

  try {
    await db.batch([consumeOtp, updateUser, writeLog]);
  } catch {
    return { error: "Nomor WhatsApp tidak dapat digunakan." };
  }

  revalidatePath("/account");
  return {
    success: true,
    maskedNumber: maskWaNumber(target),
    message: `Nomor WhatsApp berhasil diverifikasi: ${maskWaNumber(target)}.`,
  };
}

/**
 * Menyalakan atau mematikan kanal luar per akun. Kanal hanya dapat dinyalakan
 * bila alamatnya sudah terverifikasi; in-app tidak diwakili baris preferensi.
 */
export async function setNotificationPreference(
  channel: Channel,
  enabled: boolean,
): Promise<ContactActionResult> {
  if (!(CHANNELS as readonly string[]).includes(channel)) {
    return { error: "Kanal notifikasi tidak dikenal." };
  }

  const actor = await loadActor();
  if (!actor) return { error: "Sesi telah berakhir. Silakan masuk kembali." };

  const { db } = appContext();
  const account = await loadAccountContact(db, actor.id);
  if (!account || !account.isActive) {
    return { error: "Akun Anda tidak aktif atau tidak ditemukan." };
  }

  if (enabled) {
    if (channel === "EMAIL" && !account.emailVerifiedAt) {
      return { error: "Surel harus terverifikasi sebelum kanal email dapat diaktifkan." };
    }
    if (channel === "WHATSAPP" && !account.waVerifiedAt) {
      return {
        error: "Nomor WhatsApp harus terverifikasi sebelum kanal WhatsApp dapat diaktifkan.",
      };
    }
  }

  const [existing] = await db
    .select({ enabled: notificationPreferences.enabled })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, actor.id),
        eq(notificationPreferences.channel, channel),
      ),
    )
    .limit(1);

  const now = nowSeconds();
  const stamp = new Date(now * 1000);

  const upsert = db
    .insert(notificationPreferences)
    .values({
      userId: actor.id,
      channel,
      enabled,
      updatedAt: stamp,
    })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.channel],
      set: { enabled, updatedAt: stamp },
    });

  const writeLog = db.insert(activityLogs).values({
    id: newId("log"),
    actorId: actor.id,
    action: "account.notification.preference",
    entityType: "user",
    entityId: actor.id,
    prevValue: JSON.stringify({ channel, enabled: existing?.enabled ?? false }),
    newValue: JSON.stringify({ channel, enabled }),
    createdAt: stamp,
  });

  await db.batch([upsert, writeLog]);
  revalidatePath("/account");

  return {
    success: true,
    message:
      channel === "EMAIL"
        ? `Kanal notifikasi Email ${enabled ? "diaktifkan" : "dinonaktifkan"}.`
        : `Kanal notifikasi WhatsApp ${enabled ? "diaktifkan" : "dinonaktifkan"}.`,
  };
}
