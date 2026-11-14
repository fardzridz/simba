"use client";

import { useEffect } from "react";
import ErrorState from "./error-state";

export interface RouteErrorProps {
  /** Nilai yang dilempar; bisa bukan `Error` bila berasal dari Komponen Klien. */
  error: unknown;
  /** `retry` dari Next.js 16: me-render ulang segmen, bukan sekadar menghapus state. */
  retry: () => void;
  /** Label modul untuk log konsol, bukan untuk pengguna. */
  moduleName: string;
  title: string;
  description: string;
  retryLabel?: string;
  actionHref?: string;
  actionLabel?: string;
  /** Judul halaman yang sedang gagal, ditampilkan di atas kartu galat. */
  pageTitle?: string;
}

/**
 * Kerangka bersama untuk berkas `error.tsx` di tiap rute.
 *
 * Alasan dipisah: lima rute butuh perilaku yang sama persis (pesan tanpa detail
 * internal, satu tombol pemulihan, kode kejadian dari `digest`). Menyalinnya
 * lima kali membuat aturan keamanan mudah menyimpang di salah satu salinan.
 *
 * Aturan yang dipegang (R-27, R-36):
 * - `error` disempitkan dengan `instanceof Error` sebelum properti dibaca,
 *   karena galat dari Komponen Klien diteruskan apa adanya.
 * - `digest` ditampilkan sebagai kode kejadian: itu satu-satunya nilai yang
 *   aman dan berguna untuk mencocokkan dengan log server di produksi.
 * - Tidak ada nama tabel, kueri, atau jejak stack yang pernah dirender.
 */
export default function RouteError({
  error,
  retry,
  moduleName,
  title,
  description,
  retryLabel = "Coba muat ulang",
  actionHref = "/dashboard",
  actionLabel = "Kembali ke Dashboard",
  pageTitle,
}: RouteErrorProps) {
  useEffect(() => {
    console.error(`Gagal memuat ${moduleName}:`, error);
  }, [error, moduleName]);

  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";

  return (
    <div className="flex flex-col gap-4">
      {pageTitle ? (
        <div className="print:hidden">
          <h1 className="text-h1 font-semibold text-ink">{pageTitle}</h1>
        </div>
      ) : null}

      <ErrorState
        title={title}
        description={description}
        onRetry={retry}
        retryLabel={retryLabel}
        actionHref={actionHref}
        actionLabel={actionLabel}
      >
        <p className="text-body-sm text-ink-3">
          Bila galat berulang, sampaikan waktu kejadian dan halaman ini kepada admin
          divisi agar dapat dicocokkan dengan log server.
        </p>
        {digest ? (
          <p className="mt-1 text-body-sm text-ink-3">
            Kode kejadian: <span className="font-mono">{digest}</span>
          </p>
        ) : null}
      </ErrorState>
    </div>
  );
}
