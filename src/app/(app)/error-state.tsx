import Image from "next/image";
import type { ReactNode } from "react";

export interface ErrorBannerProps {
  title: string;
  description: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Banner Galat Inline (sesuai wireframe/state-galat.svg panel 1).
 *
 * Digunakan saat daftar atau data dalam kartu gagal dimuat.
 * Aturan antislop & sistem desain:
 * - Warna permukaan error-surface (#FEE2E2) dengan teks error (#B91C1C, kontras 5.30:1 lolos AA).
 * - role="alert" dengan pengumuman aria-live="polite" agar pembaca layar mengetahui.
 * - Tombol tunggal "Coba lagi" (tidak ada pengulangan otomatis/loop tak berkesudahan).
 * - Pesan tidak menyebut detail teknis internal yang membingungkan pengguna.
 */
export function ErrorBanner({
  title,
  description,
  detail,
  onRetry,
  retryLabel = "Coba lagi",
  className = "",
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-md bg-error-surface p-4 text-error ${className}`}
    >
      <h4 className="text-body font-semibold">{title}</h4>
      <p className="mt-1 text-body-sm">{description}</p>
      {detail ? <p className="mt-1 text-body-sm opacity-90">{detail}</p> : null}

      {onRetry ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink-2 shadow-sm transition-colors duration-[120ms] hover:bg-neutral-surface active:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            {retryLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  actionHref?: string;
  actionLabel?: string;
  illustration?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Komponen Keadaan Galat Halaman / Sesi Penuh (sesuai wireframe/state-galat.svg & public/ilustrasi/galat-muat.svg).
 */
export default function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Coba lagi",
  actionHref,
  actionLabel,
  illustration = true,
  className = "",
  children,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`card flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      {illustration ? (
        <div className="mb-4 flex items-center justify-center">
          <Image
            src="/ilustrasi/galat-muat.svg"
            alt=""
            width={240}
            height={150}
            unoptimized
            aria-hidden="true"
            className="h-auto w-auto max-w-[240px] tablet:max-w-[280px]"
          />
        </div>
      ) : null}

      <h3 className="text-h2 font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-[440px] text-body text-ink-2">{description}</p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink-2 transition-colors duration-[120ms] hover:bg-neutral-surface active:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            {retryLabel}
          </button>
        ) : null}

        {actionHref && actionLabel ? (
          <a
            href={actionHref}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-body font-semibold text-on-dark transition-colors duration-[120ms] hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            {actionLabel}
          </a>
        ) : null}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/**
 * Pesan galat spesifik tingkat bidang form (sesuai wireframe/state-galat.svg panel 2).
 */
export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-body-sm font-medium text-error">
      {message}
    </p>
  );
}
