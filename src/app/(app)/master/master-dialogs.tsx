"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../loading-state";
import type { MasterUser, MasterDivision, MasterCategory } from "@/lib/mock-master";

// ==========================================
// 1. DIALOG RESET KATA SANDI (Wireframe L17)
// ==========================================
export interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: MasterUser | null;
  onConfirm: (username: string) => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: ResetPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
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

  const handleReset = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      onConfirm(user.username);
      setIsSubmitting(false);
      onClose();
    }, 400);
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
            Sesi pengguna akan diakhiri setelah kata sandi direset.
          </p>
          <p className="text-ink-3 text-[11px]">
            Tindakan ini tercatat di log aktivitas dan kata sandi baru sementara akan dikirimkan kepada pengguna.
          </p>
        </div>

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
// 2. DIALOG NONAKTIFKAN AKUN PENGGUNA
// ==========================================
export interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: MasterUser | null;
  onConfirm: (userId: string, reason: string) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan penonaktifan akun wajib diisi untuk rekam audit.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onConfirm(user.id, reason);
      setIsSubmitting(false);
      onClose();
    }, 400);
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
  onSave: (userData: Partial<MasterUser>) => void;
}

export function UserFormModal({
  isOpen,
  onClose,
  user,
  onSave,
}: UserFormModalProps) {
  const isEdit = Boolean(user);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [divisionName, setDivisionName] = useState("Hukum & Sengketa");
  const [role, setRole] = useState<"USER" | "ADMIN" | "SUPER_ADMIN">("USER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFullName(user.fullName);
        setUsername(user.username);
        setEmail(user.email);
        setDivisionName(user.divisionName);
        setRole(user.role);
      } else {
        setFullName("");
        setUsername("");
        setEmail("");
        setDivisionName("Hukum & Sengketa");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setError("Seluruh kolom wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSave({
        id: user?.id ?? `usr_new_${Date.now()}`,
        fullName,
        username,
        email,
        divisionName,
        divisionCode: divisionName === "Hukum & Sengketa" ? "HUK" : "PGS",
        role,
        roleLabel: role === "SUPER_ADMIN" ? "Super Admin" : role === "ADMIN" ? "Admin Divisi" : "Staf",
        isActive: user?.isActive ?? true,
        lastLoginFormatted: user?.lastLoginFormatted ?? "Belum pernah",
      });
      setIsSubmitting(false);
      onClose();
    }, 400);
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-body-sm font-medium text-ink">Divisi</label>
              <select
                value={divisionName}
                onChange={(e) => setDivisionName(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              >
                <option value="Hukum & Sengketa">Hukum &amp; Sengketa</option>
                <option value="Pengawasan">Pengawasan</option>
                <option value="SDM & Organisasi">SDM &amp; Organisasi</option>
                <option value="Sekretariat">Sekretariat</option>
                <option value="Penindakan">Penindakan</option>
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
  onSave: (divisionData: Partial<MasterDivision>) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Nama dan kode divisi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSave({
        id: division?.id ?? `div_new_${Date.now()}`,
        name,
        code: code.toUpperCase(),
        memberCount: division?.memberCount ?? 0,
        isActive: division?.isActive ?? true,
        createdAtFormatted: division?.createdAtFormatted ?? "Hari ini",
      });
      setIsSubmitting(false);
      onClose();
    }, 400);
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
              Kode Divisi (3 huruf mono) *
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
  onSave: (categoryData: Partial<MasterCategory>) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSave({
        id: category?.id ?? `cat_new_${Date.now()}`,
        name,
        taskCount: category?.taskCount ?? 0,
        isActive: category?.isActive ?? true,
        createdAtFormatted: category?.createdAtFormatted ?? "Hari ini",
      });
      setIsSubmitting(false);
      onClose();
    }, 400);
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
