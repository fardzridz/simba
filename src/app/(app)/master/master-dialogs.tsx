"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../loading-state";
import type { MasterActionResult } from "./actions";
import type { MasterUser, MasterDivision, MasterCategory } from "@/db/queries/master";

/** Nilai formulir pengguna yang dikirim ke aksi server. */
export type UserFormValues = {
  fullName: string;
  username: string;
  email: string;
  /** String mentah dari isian; kosong berarti tanpa NIP (server memvalidasi). */
  nip: string | null;
  divisionId: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
};

// ==========================================
// 0. DIALOG KONFIRMASI HAPUS (pengguna/divisi/kategori)
// ==========================================
export interface MasterDeleteModalProps {
  heading: "Hapus Pengguna" | "Hapus Divisi" | "Hapus Kategori";
  subjectLine: string;
  warning: string;
  onConfirm: () => Promise<MasterActionResult>;
}

/**
 * Konfirmasi penghapusan master (tanpa isian alasan; jejak audit cukup dari
 * log aksi user.deleted/division.deleted/category.deleted). Hanya data yang
 * belum dipakai riwayat yang lolos dari aksi server.
 */
export function MasterDeleteModal({
  isOpen,
  onClose,
  heading,
  subjectLine,
  warning,
  onConfirm,
}: MasterDeleteModalProps & { isOpen: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onConfirm();
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[460px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <h2 id={titleId} className="text-h2 font-semibold text-error">
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        <span className="font-mono text-body-sm text-ink-3">{subjectLine}</span>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-md border border-error/30 bg-error-surface p-3 text-body-sm text-error">
            <span className="font-semibold">Peringatan:</span> {warning}
          </div>

          {error ? (
            <p className="text-body-sm font-medium text-error">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink hover:bg-neutral-surface"
            >
              Kembali
            </button>
            <LoadingButton
              type="submit"
              variant="danger"
              loading={isSubmitting}
              loadingText="Menghapus..."
            >
              Hapus Permanen
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 1. DIALOG RESET KATA SANDI (Wireframe L17)
// ==========================================
export interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: MasterUser | null;
  onConfirm: () => Promise<MasterActionResult>;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: ResetPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setError(null);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleReset = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onConfirm();
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[420px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <h2 id={titleId} className="text-h2 font-semibold text-ink">
            Reset Kata Sandi
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 text-body-sm text-ink-2">
          <p>
            Pengguna:{" "}
            <span className="font-mono font-semibold text-ink">
              {user.username}
            </span>{" "}
            ({user.fullName})
          </p>
          <p className="text-ink">
            Sistem membuat sandi awal sekali pakai yang baru dan menampilkannya
            di layar setelah proses reset. Salin sebelum menutup dialog.
          </p>
          <p className="text-ink">
            Sesi yang sedang berjalan langsung dicabut setelah reset.
          </p>
          <p className="text-ink-3 text-[11px]">
            Teruskan sandi awal itu kepada pengguna melalui kanal lain agar ia
            dapat masuk lalu menggantinya dari menu Akun. Log aktivitas mencatat
            aksi reset tanpa menyertakan sandinya.
          </p>
        </div>

        {error ? (
          <p className="text-body-sm font-medium text-error">{error}</p>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink hover:bg-neutral-surface"
          >
            Batal
          </button>
          <LoadingButton
            type="button"
            variant="primary"
            loading={isSubmitting}
            loadingText="Mereset..."
            onClick={handleReset}
            className="h-9 px-4 text-body-sm font-semibold"
          >
            Reset Kata Sandi
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1b. DIALOG SANDI AWAL SEKALI PAKAI (hasil createUser / resetPassword)
// ==========================================
export interface CreatedPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "created" | "reset";
  username: string;
  oneTimePassword: string;
}

/**
 * Menampilkan sandi awal sekali pakai hasil pembuatan akun atau reset. Nielsen:
 * dialog ini tidak bisa ditutup lewat klik luar atau tombol X supaya Super
 * Admin terpaksa menyadari sandinya hanya ditampilkan sekali.
 */
export function CreatedPasswordModal({
  isOpen,
  onClose,
  mode,
  username,
  oneTimePassword,
}: CreatedPasswordModalProps) {
  const [copied, setCopied] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(oneTimePassword);
      setCopied(true);
    } catch {
      // Papan klip tidak tersedia; sandi tetap terbaca di kotak untuk disalin manual.
    }
  };

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[440px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="border-b border-border pb-3">
          <h2 id={titleId} className="text-h2 font-semibold text-ink">
            {mode === "created" ? "Akun Dibuat" : "Kata Sandi Direset"}
          </h2>
          <p className="mt-1 text-body-sm text-ink-3">
            Pengguna: <span className="font-mono font-semibold text-ink">@{username}</span>
          </p>
        </div>

        <div className="rounded-md border border-info/30 bg-info-surface p-3 text-body-sm text-ink">
          <span className="font-semibold">Tampilkan sekali:</span> sandi di bawah
          tidak disimpan oleh sistem. Salin, kirim lewat kanal lain, lalu minta
          pengguna menggantinya dari menu Akun setelah masuk.
        </div>

        <div className="flex items-center gap-3">
          <code className="min-h-9 flex-1 rounded-md border border-border-strong bg-neutral-surface px-3 py-2 font-mono text-body-sm tracking-[0.08em] break-all select-all text-ink">
            {oneTimePassword}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            aria-live="polite"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-body-sm font-semibold text-ink hover:bg-neutral-surface"
          >
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>

        <div className="flex items-center justify-end border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark transition-colors hover:bg-primary-hover active:bg-primary-active"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. DIALOG NONAKTIFKAN AKUN PENGGUNA
// ==========================================
export interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: MasterUser | null;
  onConfirm: (reason: string) => Promise<MasterActionResult>;
}

export function DeactivateUserModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: DeactivateUserModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setIsSubmitting(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan penonaktifan akun wajib diisi untuk rekam audit.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onConfirm(reason);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[460px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <h2 id={titleId} className="text-h2 font-semibold text-error">
              Nonaktifkan Pengguna
            </h2>
            <span className="font-mono text-body-sm text-ink-3">
              {user.username} · {user.fullName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-md border border-error/30 bg-error-surface p-3 text-body-sm text-error">
            <span className="font-semibold">Aturan Bisnis:</span> Akun beriwayat dinonaktifkan, bukan dihapus. Seluruh penugasan dan jejak audit lampau tetap terjaga.
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm font-medium text-ink">
              Alasan penonaktifan <span className="text-error">*wajib</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: Pegawai mutasi ke instansi lain / purna tugas..."
              className="w-full rounded-md border border-border bg-surface p-2.5 text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
          </div>

          {error ? (
            <p className="text-body-sm font-medium text-error">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink hover:bg-neutral-surface"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-9 items-center justify-center rounded-md bg-error px-4 text-body-sm font-semibold text-on-dark hover:bg-error-hover active:bg-error-active disabled:opacity-50"
            >
              {isSubmitting ? "Memproses..." : "Nonaktifkan Akun"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 3. DIALOG TAMBAH / UBAH PENGGUNA
// ==========================================
export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: MasterUser | null;
  divisions: MasterDivision[];
  onSave: (values: UserFormValues) => Promise<MasterActionResult>;
}

export function UserFormModal({
  isOpen,
  onClose,
  user,
  divisions,
  onSave,
}: UserFormModalProps) {
  const isEdit = Boolean(user);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [nip, setNip] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN" | "SUPER_ADMIN">("USER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const nipId = useId();

  // Pilihan divisi: aktif dulu, divisi milik akun yang diedit tetap tampil bila nonaktif.
  const divisionOptions = divisions.filter(
    (d) => d.isActive || d.id === user?.divisionId,
  );

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFullName(user.fullName);
        setUsername(user.username);
        setEmail(user.email);
        setNip(user.nip ?? "");
        setDivisionId(user.divisionId);
        setRole(user.role);
      } else {
        setFullName("");
        setUsername("");
        setEmail("");
        setNip("");
        setDivisionId("");
        setRole("USER");
      }
      setError(null);
      setIsSubmitting(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !divisionId) {
      setError("Seluruh kolom wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onSave({ fullName, username, email, nip, divisionId, role });
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[480px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <h2 id={titleId} className="text-h2 font-semibold text-ink">
            {isEdit ? "Ubah Pengguna" : "Tambah Pengguna Baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-body-sm font-medium text-ink">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Ahmad Fauzi Pratama"
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-body-sm font-medium text-ink">Nama Pengguna *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ahmad.fauzi"
                className="h-9 w-full rounded-md border border-border bg-surface px-3 font-mono text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-body-sm font-medium text-ink">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ahmad@contoh.local"
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <label htmlFor={nipId} className="text-body-sm font-medium text-ink">
                NIP <span className="text-ink-3 font-normal">(opsional)</span>
              </label>
              <span className="text-body-sm text-ink-3">18 digit angka</span>
            </div>
            <input
              id={nipId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="199805212006041002"
              className="h-9 w-full rounded-md border border-border bg-surface px-3 font-mono text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-body-sm font-medium text-ink">Divisi *</label>
              <select
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              >
                <option value="">Pilih divisi</option>
                {divisionOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-body-sm font-medium text-ink">Peran</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "USER" | "ADMIN" | "SUPER_ADMIN")}
                className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              >
                <option value="USER">Staf Pelaksana</option>
                <option value="ADMIN">Admin Divisi</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>

          {isEdit ? (
            <p className="text-body-sm text-ink-3">
              Perubahan data akun (nama, surel, NIP, divisi, peran) tidak
              mengubah kata sandi milik pengguna.
            </p>
          ) : (
            <div className="rounded-md border border-border bg-neutral-surface p-3 text-body-sm text-ink-2">
              Sandi awal akun baru dibuat otomatis sekali pakai dan ditampilkan
              di layar setelah akun tersimpan. Pengguna wajib menggantinya
              setelah masuk dari menu Akun.
            </div>
          )}

          {error ? <p className="text-body-sm font-medium text-error">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink hover:bg-neutral-surface"
            >
              Batal
            </button>
            <LoadingButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText="Menyimpan..."
              className="h-9 px-4 text-body-sm font-semibold"
            >
              Simpan Pengguna
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 4. DIALOG TAMBAH / UBAH DIVISI
// ==========================================
export interface DivisionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  division: MasterDivision | null;
  onSave: (values: { name: string; code: string }) => Promise<MasterActionResult>;
}

export function DivisionFormModal({
  isOpen,
  onClose,
  division,
  onSave,
}: DivisionFormModalProps) {
  const isEdit = Boolean(division);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      if (division) {
        setName(division.name);
        setCode(division.code);
      } else {
        setName("");
        setCode("");
      }
      setError(null);
      setIsSubmitting(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, division]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Nama dan kode divisi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onSave({ name, code });
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[420px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <h2 id={titleId} className="text-h2 font-semibold text-ink">
            {isEdit ? "Ubah Divisi" : "Tambah Divisi Baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-body-sm font-medium text-ink">Nama Divisi *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Hukum & Sengketa"
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-body-sm font-medium text-ink">
              Kode Divisi (2 sampai 4 huruf kapital) *
            </label>
            <input
              type="text"
              required
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="HUK"
              className="h-9 w-full rounded-md border border-border bg-surface px-3 font-mono text-body-sm text-ink uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
            <span className="text-[11px] text-ink-3">
              Dipakai sebagai awalan nomor surat tugas (misal HUK/2026/10/001).
            </span>
          </div>

          {error ? <p className="text-body-sm font-medium text-error">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink hover:bg-neutral-surface"
            >
              Batal
            </button>
            <LoadingButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText="Menyimpan..."
              className="h-9 px-4 text-body-sm font-semibold"
            >
              Simpan Divisi
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 5. DIALOG TAMBAH / UBAH KATEGORI
// ==========================================
export interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: MasterCategory | null;
  onSave: (values: { name: string }) => Promise<MasterActionResult>;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  category,
  onSave,
}: CategoryFormModalProps) {
  const isEdit = Boolean(category);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name);
      } else {
        setName("");
      }
      setError(null);
      setIsSubmitting(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, category]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onSave({ name });
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[420px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="flex items-start justify-between border-b border-border pb-3">
          <h2 id={titleId} className="text-h2 font-semibold text-ink">
            {isEdit ? "Ubah Kategori" : "Tambah Kategori Baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-body-sm font-medium text-ink">Nama Kategori Dokumen *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kearsipan / Persuratan"
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
            <span className="text-[11px] text-ink-3">
              Kategori nonaktif tidak dapat dipakai tugas baru, tetapi riwayat tugas lama tetap tampil.
            </span>
          </div>

          {error ? <p className="text-body-sm font-medium text-error">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink hover:bg-neutral-surface"
            >
              Batal
            </button>
            <LoadingButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText="Menyimpan..."
              className="h-9 px-4 text-body-sm font-semibold"
            >
              Simpan Kategori
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
