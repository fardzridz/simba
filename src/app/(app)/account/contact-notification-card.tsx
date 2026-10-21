"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/app/icons";
import { maskWaNumber, normalizeEmail, normalizeWaNumber } from "@/lib/contact";
import {
  requestEmailChange,
  requestWaOtp,
  setNotificationPreference,
  verifyWaOtp,
} from "./actions";

interface ContactNotificationCardProps {
  initialEmail?: string | null;
  initialWaNumber?: string | null;
  initialEmailVerified?: boolean;
  initialWaVerified?: boolean;
  initialEmailEnabled?: boolean;
  initialWaEnabled?: boolean;
}

export default function ContactNotificationCard({
  initialEmail = null,
  initialWaNumber = null,
  initialEmailVerified = false,
  initialWaVerified = false,
  initialEmailEnabled = false,
  initialWaEnabled = false,
}: ContactNotificationCardProps) {
  // State kontak & preferensi
  const [email, setEmail] = useState(initialEmail);
  const [isEmailVerified, setIsEmailVerified] = useState(initialEmailVerified);
  const [waNumber, setWaNumber] = useState(initialWaNumber);
  const [isWaVerified, setIsWaVerified] = useState(initialWaVerified);

  // Kanal eksternal default mati (§1 D8)
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [waEnabled, setWaEnabled] = useState(initialWaEnabled);

  // State Modal Ubah Surel
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailModalError, setEmailModalError] = useState<string | null>(null);

  // State Modal Ubah WhatsApp (2 Tahap: Input Nomor -> Verifikasi OTP 6 digit)
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waStep, setWaStep] = useState<"input_number" | "input_otp">("input_number");
  const [newWaInput, setNewWaInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [waModalError, setWaModalError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Kunci scroll halaman saat modal aktif
  useEffect(() => {
    if (isEmailModalOpen || isWaModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isEmailModalOpen, isWaModalOpen]);

  // Dukungan tombol Escape untuk menutup modal
  useEffect(() => {
    if (!isEmailModalOpen && !isWaModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEmailModalOpen(false);
        setIsWaModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEmailModalOpen, isWaModalOpen]);

  // Hitung mundur kirim ulang OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Feedback Notification Banner
  const [feedback, setFeedback] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  const showFeedback = (text: string, tone: "success" | "error" = "success") => {
    setFeedback({ text, tone });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Status pengiriman ke server (mencegah klik ganda)
  const [emailPending, setEmailPending] = useState(false);
  const [waPending, setWaPending] = useState(false);
  const [togglePending, setTogglePending] = useState<"EMAIL" | "WHATSAPP" | null>(null);

  // Handler Kirim Tautan Verifikasi Surel
  const handleSendEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailPending) return;

    const trimmed = normalizeEmail(newEmailInput);
    if (!trimmed) {
      setEmailModalError("Format alamat surel tidak valid.");
      return;
    }
    if (trimmed === email?.toLowerCase()) {
      setEmailModalError("Alamat surel baru tidak boleh sama dengan alamat saat ini.");
      return;
    }

    setEmailModalError(null);
    setEmailPending(true);
    try {
      const result = await requestEmailChange(trimmed);
      if (result.error) {
        setEmailModalError(result.error);
        return;
      }
      setIsEmailModalOpen(false);
      setNewEmailInput("");
      showFeedback(result.message ?? "Tautan verifikasi telah dikirim.");
    } catch {
      setEmailModalError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setEmailPending(false);
    }
  };

  // Handler Kirim OTP WhatsApp
  const handleRequestWaOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (waPending) return;

    if (!normalizeWaNumber(newWaInput)) {
      setWaModalError("Nomor WhatsApp tidak valid. Awali dengan +62.");
      return;
    }

    setWaModalError(null);
    setWaPending(true);
    try {
      const result = await requestWaOtp(newWaInput);
      if (result.error) {
        setWaModalError(result.error);
        return;
      }
      setWaStep("input_otp");
      setOtpInput("");
      setResendCooldown(60);
      showFeedback(result.message ?? "Kode verifikasi telah dikirim.");
    } catch {
      setWaModalError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setWaPending(false);
    }
  };

  // Handler Kirim Ulang OTP (batas 60 detik ditegakkan server)
  const handleResendWaOtp = async () => {
    if (waPending || resendCooldown > 0) return;
    setWaModalError(null);
    setWaPending(true);
    try {
      const result = await requestWaOtp(newWaInput);
      if (result.error) {
        setWaModalError(result.error);
        return;
      }
      setResendCooldown(60);
      showFeedback(result.message ?? "Kode verifikasi baru telah dikirim.");
    } catch {
      setWaModalError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setWaPending(false);
    }
  };

  // Handler Verifikasi Kode OTP WhatsApp
  const handleVerifyWaOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (waPending) return;

    if (!/^\d{6}$/.test(otpInput.trim())) {
      setWaModalError("Masukkan 6 digit angka kode OTP.");
      return;
    }

    setWaPending(true);
    try {
      const result = await verifyWaOtp(newWaInput, otpInput.trim());
      if (result.error) {
        setWaModalError(result.error);
        return;
      }

      const normalized = normalizeWaNumber(newWaInput);
      setWaNumber(normalized);
      setIsWaVerified(true);
      setWaModalError(null);
      setIsWaModalOpen(false);
      setNewWaInput("");
      setOtpInput("");
      setWaStep("input_number");
      showFeedback(result.message ?? "Nomor WhatsApp berhasil diverifikasi.");
    } catch {
      setWaModalError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setWaPending(false);
    }
  };

  // Handler Toggle Kanal (disimpan per akun di notification_preferences)
  const handleToggle = async (channel: "EMAIL" | "WHATSAPP") => {
    const verified = channel === "EMAIL" ? isEmailVerified : isWaVerified;
    if (!verified) {
      showFeedback(
        channel === "EMAIL"
          ? "Surel harus terverifikasi sebelum kanal email dapat diaktifkan."
          : "Nomor WhatsApp harus terverifikasi sebelum kanal WhatsApp dapat diaktifkan.",
        "error",
      );
      return;
    }

    if (togglePending) return;
    const current = channel === "EMAIL" ? emailEnabled : waEnabled;
    setTogglePending(channel);
    try {
      const result = await setNotificationPreference(channel, !current);
      if (result.error) {
        showFeedback(result.error, "error");
        return;
      }
      if (channel === "EMAIL") setEmailEnabled(!current);
      else setWaEnabled(!current);
      showFeedback(result.message ?? "Preferensi kanal diperbarui.");
    } catch {
      showFeedback("Tidak dapat menyimpan preferensi. Coba lagi.", "error");
    } finally {
      setTogglePending(null);
    }
  };

  const newEmailId = useId();
  const newWaId = useId();
  const otpId = useId();

  return (
    <section aria-labelledby="kontak-notifikasi-title" className="card col-span-1 desktop:col-span-2 p-4 desktop:p-6 flex flex-col gap-5">
      {/* Header Kartu */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 id="kontak-notifikasi-title" className="text-h2 font-semibold text-ink">
            Kontak & notifikasi
          </h2>
          <p className="text-body-sm text-ink-3 mt-0.5">
            Kanal notifikasi eksternal untuk pembaruan tugas, tenggat, dan revisi.
          </p>
        </div>
        <span className="rounded-full bg-neutral-surface px-2.5 py-0.5 text-body-sm font-medium text-ink-3 border border-border">
          Berlaku per akun
        </span>
      </div>

      {/* Spanduk Feedback */}
      {feedback ? (
        <div
          role="status"
          className={`rounded-lg border p-3.5 text-body-sm font-semibold flex items-center gap-2 ${
            feedback.tone === "success"
              ? "border-success/30 bg-success-surface text-success"
              : "border-error/30 bg-error-surface text-error"
          }`}
        >
          <Icon name={feedback.tone === "success" ? "centang" : "terlambat"} size={16} />
          <span>{feedback.text}</span>
        </div>
      ) : null}

      {/* Baris Surel & Nomor WhatsApp */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
        {/* Kolom Surel */}
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-ink-3 font-medium">Surel</span>
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-neutral-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                <Icon name="centang" size={12} className="text-success" />
                Terverifikasi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning-surface px-2 py-0.5 text-body-sm font-medium text-warning">
                Belum terverifikasi
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-body font-semibold text-ink truncate">
              {email ?? "Belum diatur"}
            </span>
            <button
              type="button"
              onClick={() => {
                setNewEmailInput("");
                setEmailModalError(null);
                setIsEmailModalOpen(true);
              }}
              className="shrink-0 rounded-md border border-border-strong bg-surface px-3 py-1 text-body-sm font-semibold text-ink-2 hover:bg-neutral-surface active:bg-neutral-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              Ubah Surel
            </button>
          </div>
          <p className="text-body-sm text-ink-3 pt-1">
            Surel bukan untuk masuk akun. Perubahan berlaku setelah tautan verifikasi dibuka.
          </p>
        </div>

        {/* Kolom Nomor WhatsApp */}
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-ink-3 font-medium">Nomor WhatsApp</span>
            {isWaVerified ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-neutral-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                <Icon name="centang" size={12} className="text-success" />
                Terverifikasi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning-surface px-2 py-0.5 text-body-sm font-medium text-warning">
                Belum terverifikasi
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-body font-mono font-semibold text-ink">
              {maskWaNumber(waNumber)}
            </span>
            <button
              type="button"
              onClick={() => {
                setNewWaInput("");
                setOtpInput("");
                setWaStep("input_number");
                setWaModalError(null);
                setIsWaModalOpen(true);
              }}
              className="shrink-0 rounded-md border border-border-strong bg-surface px-3 py-1 text-body-sm font-semibold text-ink-2 hover:bg-neutral-surface active:bg-neutral-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              Ubah Nomor
            </button>
          </div>
          <p className="text-body-sm text-ink-3 pt-1">
            Satu nomor hanya boleh terpasang di satu akun. Kode verifikasi berlaku 10 menit.
          </p>
        </div>
      </div>

      {/* Saklar Preferensi Kanal Notifikasi (Toggles) */}
      <div className="rounded-lg border border-border bg-surface-sunken p-4 flex flex-col gap-4">
        <div>
          <h3 className="text-body font-semibold text-ink">Preferensi Pengiriman Notifikasi</h3>
          <p className="text-body-sm text-ink-3">
            Notifikasi in-app tetap selalu aktif sebagai sumber kebenaran. Kanal luar bersifat opsional.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          {/* Toggle Email */}
          <div className="flex items-center justify-between rounded-md border border-border bg-surface p-3.5">
            <div className="flex flex-col pr-4">
              <span className="text-body font-semibold text-ink">Kanal Email</span>
              <span className="text-body-sm text-ink-3">
                Kirimkan ringkasan tugas dan revisi ke surel terverifikasi.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={emailEnabled}
                aria-label="Aktifkan notifikasi surel"
                disabled={!isEmailVerified || togglePending !== null}
                onClick={() => handleToggle("EMAIL")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light disabled:cursor-not-allowed disabled:opacity-50 ${
                  emailEnabled ? "bg-primary" : "bg-border-strong"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow-sm ring-0 transition duration-200 ease-in-out ${
                    emailEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-body-sm font-medium text-ink-2 w-10">
                {emailEnabled ? "aktif" : "mati"}
              </span>
            </div>
          </div>

          {/* Toggle WhatsApp */}
          <div className="flex items-center justify-between rounded-md border border-border bg-surface p-3.5">
            <div className="flex flex-col pr-4">
              <span className="text-body font-semibold text-ink">Kanal WhatsApp</span>
              <span className="text-body-sm text-ink-3">
                Peringatan tugas mendesak dan tenggat dekat langsung ke nomor ponsel.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={waEnabled}
                aria-label="Aktifkan notifikasi WhatsApp"
                disabled={!isWaVerified || togglePending !== null}
                onClick={() => handleToggle("WHATSAPP")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light disabled:cursor-not-allowed disabled:opacity-50 ${
                  waEnabled ? "bg-primary" : "bg-border-strong"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow-sm ring-0 transition duration-200 ease-in-out ${
                    waEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-body-sm font-medium text-ink-2 w-10">
                {waEnabled ? "aktif" : "mati"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Catatan Kaki Sesuai Wireframe L02 */}
      <div className="rounded-lg bg-surface-sunken border border-border p-4 flex flex-col gap-1.5 text-body-sm text-ink-3">
        <p>• Kanal luar mati secara default. Notifikasi in-app tetap selalu aktif.</p>
        <p>• Satu nomor hanya boleh terpasang di satu akun.</p>
        <p>• Ubah surel menunggu tautan verifikasi ke alamat baru.</p>
        <p>• Surel bukan untuk masuk. Perubahan berlaku setelah tautan verifikasi dibuka.</p>
        <p>• Kode WhatsApp berlaku 10 menit dan maksimal 5 percobaan. Kirim ulang paling cepat 60 detik.</p>
        <p>• Setiap perubahan kontak menulis log berisi nilai lama dan baru.</p>
      </div>

      {/* MODAL 1: UBAH SUREL */}
      {isEmailModalOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEmailModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-email-title"
            className="w-full max-w-[480px] rounded-lg border border-border bg-surface p-5 tablet:p-6 shadow-card-hover flex flex-col gap-4 my-auto"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="modal-email-title" className="text-h2 font-semibold text-ink">
                Ubah Alamat Surel
              </h3>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                aria-label="Tutup dialog"
              >
                <Icon name="tutup" size={16} />
              </button>
            </div>

            <form onSubmit={handleSendEmailVerification} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={newEmailId} className="text-body-sm font-medium text-ink">
                  Alamat Surel Baru *
                </label>
                <input
                  id={newEmailId}
                  type="email"
                  required
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="pegawai@instansi.go.id"
                  className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                />
                {emailModalError ? (
                  <p className="text-body-sm text-error">{emailModalError}</p>
                ) : null}
              </div>

              <div className="rounded-md bg-neutral-surface border border-border p-3.5 text-body-sm text-ink-2 leading-relaxed">
                <p>Tautan verifikasi akan dikirimkan ke alamat surel baru ini. Alamat lama tetap aktif menerima notifikasi hingga tautan dibuka.</p>
              </div>

              <div className="flex flex-col-reverse tablet:flex-row tablet:items-center tablet:justify-end gap-2.5 tablet:gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="inline-flex h-9 w-full tablet:w-auto items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink-2 hover:bg-neutral-surface active:bg-neutral-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={emailPending}
                  className="inline-flex h-9 w-full tablet:w-auto items-center justify-center rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailPending ? "Mengirim…" : "Kirim Tautan Verifikasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* MODAL 2: UBAH NOMOR WHATSAPP (DENGAN TAHAP VERIFIKASI OTP) */}
      {isWaModalOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWaModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-wa-title"
            className="w-full max-w-[480px] rounded-lg border border-border bg-surface p-5 tablet:p-6 shadow-card-hover flex flex-col gap-4 my-auto"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="modal-wa-title" className="text-h2 font-semibold text-ink">
                {waStep === "input_number" ? "Ubah Nomor WhatsApp" : "Verifikasi Nomor WhatsApp"}
              </h3>
              <button
                type="button"
                onClick={() => setIsWaModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                aria-label="Tutup dialog"
              >
                <Icon name="tutup" size={16} />
              </button>
            </div>

            {waStep === "input_number" ? (
              <form onSubmit={handleRequestWaOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={newWaId} className="text-body-sm font-medium text-ink">
                    Nomor WhatsApp Baru (Format Internasional) *
                  </label>
                  <input
                    id={newWaId}
                    type="tel"
                    required
                    value={newWaInput}
                    onChange={(e) => setNewWaInput(e.target.value)}
                    placeholder="+62 812 3456 7890"
                    className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-body font-mono text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  />
                  {waModalError ? (
                    <p className="text-body-sm text-error">{waModalError}</p>
                  ) : null}
                  <p className="text-body-sm text-ink-3">
                    Satu nomor hanya boleh terpasang di satu akun. Awali dengan +62.
                  </p>
                </div>

                <div className="flex flex-col-reverse tablet:flex-row tablet:items-center tablet:justify-end gap-2.5 tablet:gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setIsWaModalOpen(false)}
                    className="inline-flex h-9 w-full tablet:w-auto items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink-2 hover:bg-neutral-surface active:bg-neutral-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={waPending}
                    className="inline-flex h-9 w-full tablet:w-auto items-center justify-center rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {waPending ? "Mengirim…" : "Kirim Kode OTP"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyWaOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor={otpId} className="text-body-sm font-medium text-ink">
                    Masukkan Kode 6 Digit OTP *
                  </label>
                  <input
                    id={otpId}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  />
                  {waModalError ? (
                    <p className="text-body-sm text-error">{waModalError}</p>
                  ) : null}
                  <p className="text-body-sm text-ink-3">
                    Kode berlaku 10 menit, maksimal 5 percobaan.
                  </p>
                </div>

                <div className="flex items-center justify-between py-1">
                  <button
                    type="button"
                    onClick={() => setWaStep("input_number")}
                    className="text-body-sm text-ink-3 hover:text-ink underline focus-visible:outline-2 focus-visible:outline-focus-light"
                  >
                    Ganti nomor
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || waPending}
                    onClick={handleResendWaOtp}
                    className="text-body-sm font-medium text-primary hover:text-primary-hover disabled:text-ink-3 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-focus-light"
                  >
                    {resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : "Kirim ulang OTP"}
                  </button>
                </div>

                <div className="flex flex-col-reverse tablet:flex-row tablet:items-center tablet:justify-end gap-2.5 tablet:gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setIsWaModalOpen(false)}
                    className="inline-flex h-9 w-full tablet:w-auto items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink-2 hover:bg-neutral-surface active:bg-neutral-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={waPending}
                    className="inline-flex h-9 w-full tablet:w-auto items-center justify-center rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {waPending ? "Memverifikasi…" : "Verifikasi & Simpan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
