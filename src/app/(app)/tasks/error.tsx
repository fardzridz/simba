"use client";

import RouteError from "../route-error";

/**
 * Batas galat untuk daftar Tugas.
 *
 * Aksi kedua diarahkan ke Dashboard karena daftar tugas sendiri yang gagal
 * dimuat; mengulang ke halaman yang sama tidak menambah pilihan pengguna.
 */
export default function TasksError({
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
      moduleName="Daftar Tugas"
      title="Daftar tugas gagal dimuat"
      description="Penugasan tidak dapat diambil saat ini. Filter yang sedang aktif belum berubah; mencoba lagi akan memakai filter yang sama."
    />
  );
}
