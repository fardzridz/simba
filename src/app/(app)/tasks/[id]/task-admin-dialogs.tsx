"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../../loading-state";

export interface ExtendDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskNumber: string;
  currentDueDateFormatted: string;
  onExtend: (newDueDate: string, reason: string) => void;
}

export function ExtendDeadlineModal({
  isOpen,
  onClose,
  taskNumber,
  currentDueDateFormatted,
  onExtend,
}: ExtendDeadlineModalProps) {
  const [newDueDate, setNewDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const dateInputId = useId();
  const reasonInputId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewDueDate("");
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

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDueDate) {
      setError("Pilih tanggal tenggat baru.");
      return;
    }
    if (!reason.trim()) {
      setError("Alasan perpanjangan tenggat wajib diisi untuk jejak audit.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onExtend(newDueDate, reason);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[480px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 id={titleId} className="text-h2 font-semibold text-ink">
              Perpanjang Tenggat
            </h2>
            <span className="font-mono text-body-sm text-ink-3">
              {taskNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="text-body-sm text-ink-2 bg-neutral-surface/60 p-3 rounded-md">
            <span className="text-ink-3">Tenggat saat ini:</span>{" "}
            <span className="font-semibold text-ink">{currentDueDateFormatted}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={dateInputId} className="text-body-sm font-medium text-ink">
              Tenggat baru <span className="text-error">*wajib</span>
            </label>
            <input
              id={dateInputId}
              type="date"
              required
              value={newDueDate}
              onChange={(e) => {
                setNewDueDate(e.target.value);
                if (error) setError(null);
              }}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={reasonInputId} className="text-body-sm font-medium text-ink">
              Alasan perubahan tenggat <span className="text-error">*wajib (dicatat di log)</span>
            </label>
            <textarea
              id={reasonInputId}
              rows={3}
              required
              maxLength={500}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Jelaskan alasan perpanjangan tenggat (misal: perpanjangan masa verifikasi lapangan)..."
              className="w-full rounded-md border border-border bg-surface p-3 text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
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
              Batal
            </button>
            <LoadingButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText="Menyimpan..."
              className="h-9 px-4 text-body"
            >
              Simpan Perubahan
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface CancelTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskNumber: string;
  taskTitle: string;
  onCancelTask: (reason: string) => Promise<{
    success?: boolean;
    error?: string;
  }>;
}

export function CancelTaskModal({
  isOpen,
  onClose,
  taskNumber,
  taskTitle,
  onCancelTask,
}: CancelTaskModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const reasonInputId = useId();

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan pembatalan tugas wajib diisi.");
      return;
    }
    if (reason.trim().length > 500) {
      setError("Alasan pembatalan maksimal 500 karakter.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onCancelTask(reason.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    } catch {
      setError("Pembatalan gagal diproses. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[480px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 id={titleId} className="text-h2 font-semibold text-error">
              Batalkan Tugas
            </h2>
            <span className="font-mono text-body-sm text-ink-3">
              {taskNumber} · {taskTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 hover:bg-neutral-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-md border border-error/30 bg-error-surface p-3 text-body-sm text-error">
            <span className="font-semibold">Peringatan:</span> Tugas yang dibatalkan akan dihentikan secara permanen dan staf penerima akan menerima pemberitahuan resmi.
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={reasonInputId} className="text-body-sm font-medium text-ink">
              Alasan pembatalan tugas <span className="text-error">*wajib</span>
            </label>
            <textarea
              id={reasonInputId}
              rows={3}
              required
              maxLength={500}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Tuliskan alasan resmi pembatalan tugas ini..."
              className="w-full rounded-md border border-border bg-surface p-3 text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
          </div>

          {error ? (
            <p className="text-body-sm font-medium text-error">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink hover:bg-neutral-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-9 items-center justify-center rounded-md bg-error px-4 text-body font-semibold text-on-dark transition-colors hover:bg-error-hover active:bg-error-active disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Membatalkan..." : "Batalkan Tugas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
