import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type EmptyStateIllustration =
  | "tugas"
  | "rak"
  | "notifikasi"
  | "tanpa-akses"
  | "custom";

const ILLUSTRATION_MAP: Record<Exclude<EmptyStateIllustration, "custom">, string> = {
  tugas: "/ilustrasi/kosong-tugas.svg",
  rak: "/ilustrasi/kosong-rak.svg",
  notifikasi: "/ilustrasi/kosong-notifikasi.svg",
  "tanpa-akses": "/ilustrasi/tanpa-akses.svg",
};

export type EmptyStateAction =
  | {
      type: "button";
      label: string;
      onClick?: () => void;
      variant?: "primary" | "secondary";
    }
  | {
      type: "link";
      label: string;
      href: string;
      variant?: "primary" | "secondary";
    };

export interface EmptyStateProps {
  title: string;
  description: string;
  illustration?: EmptyStateIllustration;
  customIllustrationSrc?: string;
  action?: EmptyStateAction;
  reason?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Komponen Keadaan Kosong (sesuai wireframe/state-kosong.svg & public/ilustrasi/README.md).
 *
 * Tiga penyebab utama keadaan kosong dipisahkan secara eksplisit:
 * 1. Pertama kali (belum ada data)
 * 2. Hasil filter nol
 * 3. Tanpa akses pada cakupan
 *
 * Selalu menyebutkan sebab dan satu aksi berikutnya, pantang hanya menulis "Tidak ada data".
 */
export default function EmptyState({
  title,
  description,
  illustration = "tugas",
  customIllustrationSrc,
  action,
  reason,
  className = "",
  children,
}: EmptyStateProps) {
  const imgSrc =
    illustration === "custom"
      ? customIllustrationSrc
      : ILLUSTRATION_MAP[illustration];

  return (
    <div
      role="region"
      aria-label={title}
      className={`card flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      {imgSrc ? (
        <div className="mb-4 flex items-center justify-center">
          <Image
            src={imgSrc}
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

      {action ? (
        <div className="mt-4">
          {action.type === "link" ? (
            <Link
              href={action.href}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-body font-semibold transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none ${
                action.variant === "primary"
                  ? "bg-primary text-on-dark hover:bg-primary-hover active:bg-primary-active"
                  : "border border-border-strong bg-surface text-ink-2 hover:bg-neutral-surface active:bg-border"
              }`}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-body font-semibold transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none ${
                action.variant === "primary"
                  ? "bg-primary text-on-dark hover:bg-primary-hover active:bg-primary-active"
                  : "border border-border-strong bg-surface text-ink-2 hover:bg-neutral-surface active:bg-border"
              }`}
            >
              {action.label}
            </button>
          )}
        </div>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}

      {reason ? (
        <p className="mt-4 text-body-sm text-ink-3">Sebab: {reason}</p>
      ) : null}
    </div>
  );
}
