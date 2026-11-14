"use client";

import Link from "next/link";
import { Icon } from "@/app/icons";

/**
 * Bilah alat halaman cetak.
 *
 * Tombol cetak tetap disediakan karena dialog cetak peramban tidak dapat dibuka
 * otomatis tanpa gestur pengguna di sebagian peramban. Yang dihilangkan hanyalah
 * kop instansi dan blok tanda tangan, sesuai keputusan pemilik aplikasi.
 *
 * Tidak ada state di sini: tidak ada nilai yang berasal dari jam sekarang, jadi
 * tidak ada risiko perbedaan antara HTML server dan peramban.
 */
export function PrintToolbar({
  backHref,
  total,
  loaded,
}: {
  backHref: string;
  total: number;
  loaded: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 print:hidden">
      <Link
        href={backHref}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-body-sm font-semibold text-ink transition-colors hover:bg-neutral-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
      >
        Kembali ke laporan
      </Link>

      <p className="text-body-sm text-ink-3">
        Halaman ini memuat seluruh <span className="tabular-nums">{total}</span> baris
        hasil filter
        {loaded < total ? (
          <>
            {" "}
            (tercetak <span className="tabular-nums">{loaded}</span> baris)
          </>
        ) : null}
        .
      </p>

      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-body-sm font-semibold text-on-dark transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
      >
        <Icon name="unduh" size={16} />
        Cetak sekarang
      </button>
    </div>
  );
}
