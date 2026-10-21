import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export interface ForbiddenStateProps {
  title?: string;
  message?: string;
  auditNotice?: string;
  supportHint?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Komponen Keadaan Akses Ditolak / 403 (sesuai wireframe/state-403.svg & public/ilustrasi/tanpa-akses.svg).
 *
 * Aturan keamanan & privasi (Hard Gate R-36, C-5):
 * - TIDAK menampilkan detail teknis internal: nama tabel, id kueri, jejak stack, nama pemilik data, atau nomor tugas di luar cakupan.
 * - Menyatakan dengan jelas bahwa data berada di luar cakupan akun dan percobaan akses tercatat di log aktivitas.
 * - Memberi satu tindakan kembali yang pasti (biasanya "Kembali ke Dashboard").
 */
export default function ForbiddenState({
  title = "Akses ditolak",
  message = "Data ini di luar cakupan akunmu.",
  auditNotice = "Percobaan akses ini tercatat di log aktivitas.",
  supportHint = "Hubungi admin divisimu bila menurutmu ini keliru.",
  backHref = "/dashboard",
  backLabel = "Kembali ke Dashboard",
  className = "",
  children,
}: ForbiddenStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <div
        role="alert"
        aria-label={title}
        className="card w-full max-w-[420px] p-6 text-center"
      >
        <div className="mb-4 flex items-center justify-center">
          <Image
            src="/ilustrasi/tanpa-akses.svg"
            alt=""
            width={240}
            height={150}
            unoptimized
            aria-hidden="true"
            className="h-auto w-auto max-w-[240px]"
          />
        </div>

        <h2 className="text-h2 font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-body text-ink-2">{message}</p>
        {auditNotice ? (
          <p className="mt-1 text-body text-ink-2">{auditNotice}</p>
        ) : null}
        {supportHint ? (
          <p className="mt-3 text-body-sm text-ink-3">{supportHint}</p>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Link
            href={backHref}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-5 text-body font-semibold text-ink-2 shadow-sm transition-colors duration-[120ms] hover:bg-neutral-surface active:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            {backLabel}
          </Link>
        </div>

        {children ? <div className="mt-4">{children}</div> : null}
      </div>

      <p className="mt-6 max-w-[440px] text-center text-body-sm text-ink-3">
        Cakupan diperiksa di server untuk setiap permintaan, termasuk setiap unduhan berkas.
      </p>
    </div>
  );
}
