import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface SkeletonProps {
  className?: string;
}

/**
 * Baris dasar skeleton dengan animasi pulsa yang menghormati prefers-reduced-motion.
 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[4px] bg-neutral-surface motion-reduce:animate-none ${className}`}
    />
  );
}

export interface TableSkeletonProps {
  rows?: number;
  columns?: Array<{
    labelWidth?: string;
    align?: "left" | "right" | "center";
  }>;
  ariaLabel?: string;
  className?: string;
}

/**
 * Skeleton Tabel Daftar (sesuai wireframe/state-memuat.svg panel 1).
 *
 * Aturan:
 * - Tinggi baris sama persis dengan tabel asli sehingga tidak terjadi layout shift (CLS).
 * - Menampilkan baris header dan deretan sel skeleton netral.
 * - aria-busy="true" dengan aria-label deskriptif.
 */
export function TableSkeleton({
  rows = 5,
  columns = [
    { labelWidth: "w-44" },
    { labelWidth: "w-28" },
    { labelWidth: "w-20", align: "right" },
    { labelWidth: "w-24", align: "right" },
  ],
  ariaLabel = "Memuat daftar data...",
  className = "",
}: TableSkeletonProps) {
  return (
    <div
      role="region"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`card overflow-hidden ${className}`}
    >
      <table className="w-full text-body" aria-hidden="true">
        <thead className="bg-surface-sunken">
          <tr className="border-b border-border">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-2.5 px-4 ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                      ? "text-center"
                      : "text-left"
                }`}
              >
                <Skeleton
                  className={`h-3 ${col.labelWidth ?? "w-24"} ${
                    col.align === "right"
                      ? "ml-auto"
                      : col.align === "center"
                        ? "mx-auto"
                        : ""
                  }`}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr
              key={rIdx}
              className="border-b border-border last:border-b-0"
            >
              {columns.map((col, cIdx) => (
                <td
                  key={cIdx}
                  className={`py-3 px-4 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  <Skeleton
                    className={`h-3.5 ${
                      cIdx === 0
                        ? "w-3/4"
                        : cIdx === 1
                          ? "w-1/2"
                          : col.labelWidth ?? "w-16"
                    } ${
                      col.align === "right"
                        ? "ml-auto"
                        : col.align === "center"
                          ? "mx-auto"
                          : ""
                    }`}
                  />
                  {cIdx === 0 ? (
                    <Skeleton className="mt-1.5 h-2.5 w-1/3" />
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface KpiStripSkeletonProps {
  count?: number;
  ariaLabel?: string;
  className?: string;
}

/**
 * Skeleton Pita KPI (sesuai wireframe/state-memuat.svg panel 2).
 *
 * Aturan:
 * - Jumlah dan ukuran kartu persis sama dengan keadaan terisi.
 * - Angka tidak dikarang sementara data belum tiba.
 * - Layout 2 kolom pada ponsel, 4 kolom pada tablet dan desktop.
 */
export function KpiStripSkeleton({
  count = 4,
  ariaLabel = "Memuat ringkasan KPI...",
  className = "",
}: KpiStripSkeletonProps) {
  return (
    <section
      aria-busy="true"
      aria-label={ariaLabel}
      className={`grid grid-cols-2 gap-3 tablet:grid-cols-4 ${className}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="card p-4 flex flex-col justify-between"
          aria-hidden="true"
        >
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-14" />
          </div>
          <Skeleton className="mt-3 h-2.5 w-28" />
        </div>
      ))}
    </section>
  );
}

export interface LoadingButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
}

/**
 * Tombol dengan keadaan memuat (sesuai wireframe/state-memuat.svg panel 3).
 *
 * Aturan:
 * - Menggunakan aria-busy="true" dan menyebut aksi nyata yang sedang terjadi ("Menyimpan...", "Menyiapkan berkas...").
 * - Tombol terkunci (disabled) selama proses sehingga klik ganda tidak membuat mutasi ganda.
 * - Spinner bisu tanpa teks dilarang karena pembaca layar dan pengguna tidak mengetahui apa yang terjadi.
 */
export function LoadingButton({
  loading = false,
  loadingText = "Memproses...",
  variant = "primary",
  disabled,
  children,
  className = "",
  ...rest
}: LoadingButtonProps) {
  const baseClasses =
    "inline-flex h-9 items-center justify-center rounded-md px-4 text-body font-semibold transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none disabled:cursor-not-allowed";

  const variantClasses = {
    primary:
      "bg-primary text-on-dark hover:bg-primary-hover active:bg-primary-active disabled:bg-disabled-surface disabled:text-disabled-text focus-visible:outline-focus-light",
    secondary:
      "border border-border-strong bg-surface text-ink-2 hover:bg-neutral-surface active:bg-border disabled:border-border disabled:bg-disabled-surface disabled:text-disabled-text focus-visible:outline-focus-light",
    danger:
      "bg-error text-on-dark hover:bg-error active:opacity-90 disabled:bg-disabled-surface disabled:text-disabled-text focus-visible:outline-focus-light",
  }[variant];

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          />
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
