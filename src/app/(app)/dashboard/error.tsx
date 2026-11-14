"use client";

import RouteError from "../route-error";

/**
 * Batas galat untuk Dashboard.
 *
 * Dashboard merangkum angka dari beberapa kueri sekaligus, jadi kegagalan
 * sebagian paling mungkin muncul di sini. Pesan sengaja tidak menyebut angka
 * mana yang gagal: pengguna tidak dapat menindaklanjuti detail itu.
 *
 * Aksi kedua diarahkan ke daftar tugas, bukan ke Dashboard, karena tautan ke
 * halaman yang sedang gagal hanya akan memutar pengguna kembali ke galat.
 */
export default function DashboardError({
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
      moduleName="Dashboard"
      title="Dashboard gagal dimuat"
      description="Ringkasan penugasan tidak dapat dihitung saat ini. Angka pada tampilan sebelumnya mungkin sudah tidak berlaku."
      actionHref="/tasks"
      actionLabel="Buka Daftar Tugas"
    />
  );
}
