"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../loading-state";

export interface WithdrawSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskNumber: string;
  taskTitle: string;
  onWithdraw: () => Promise<{
    success?: boolean;
    error?: string;
  }>;
}

/**
 * Dialog konfirmasi penarikan pengumpulan oleh pelaksana (permintaan pengguna
 * Fase 6). Dapat dibatalkan ulang: pengumpulan kembali menjadi draf, bukan
 * penghapusan permanen, sehingga nadanya peringatan biasa bukan merah bahaya.
 */
export default function WithdrawSubmissionModal({
  isOpen,
  onClose,
  taskNumber,
  taskTitle,
  onWithdraw,
}: WithdrawSubmissionModalProps) {
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
      const result = await onWithdraw();
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    } catch {
      setError("Penarikan pengumpulan gagal diproses. Coba lagi.");
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
            <h2 id={titleId} className="text-h2 font-semibold text-ink">
              Batalkan Pengumpulan
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
          <div className="rounded-md border border-warning/30 bg-warning-surface p-3 text-body-sm text-warning">
            <span className="font-semibold">Akibat pembatalan:</span> status tugas
            kembali ke Sedang Dikerjakan, berkas terkirim menjadi draf yang dapat
            Anda hapus per berkas atau perbarui, lalu dikumpulkan ulang. Admin
            divisi diberi tahu bahwa pengumpulan ditarik.
          </div>

          <p className="text-body-sm text-ink-3">
            Jendela pembatalan hanya terbuka selama Admin belum menilai
            pengumpulan ini.
          </p>

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
            <LoadingButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText="Membatalkan..."
              className="h-9 px-4 text-body"
            >
              Ya, Batalkan Pengumpulan
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
