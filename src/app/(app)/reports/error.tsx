"use client";

import RouteError from "../route-error";

/**
 * Batas galat untuk modul Laporan & Ekspor.
 *
 * Perilaku bersama ada di `../route-error.tsx`; berkas ini hanya menyatakan
 * teks yang khas modul laporan. `error.tsx` tidak menangkap galat di
 * `(app)/layout.tsx`; untuk lapisan itu ada `src/app/global-error.tsx`.
 */
export default function ReportsError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={retry}
      moduleName="Laporan & Ekspor"
      pageTitle="Laporan & Ekspor"
      title="Laporan gagal dimuat"
      description="Data rekapitulasi tidak dapat diambil saat ini. Angka yang tampil sebelumnya mungkin sudah tidak berlaku."
    />
  );
}
