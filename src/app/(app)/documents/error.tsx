"use client";

import RouteError from "../route-error";

/**
 * Batas galat untuk Katalog Dokumen Final.
 *
 * Sama seperti modul daftar lain: filter aktif tidak diubah saat mencoba lagi,
 * dan pesan tidak menyebut berkas atau divisi mana yang gagal dibaca.
 */
export default function DocumentsError({
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
      moduleName="Katalog Dokumen"
      pageTitle="Katalog Dokumen Final"
      title="Katalog dokumen gagal dimuat"
      description="Daftar dokumen final tidak dapat diambil saat ini. Filter yang sedang aktif belum berubah; mencoba lagi akan memakai filter yang sama."
    />
  );
}
