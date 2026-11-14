"use client";

import RouteError from "../route-error";

/**
 * Batas galat untuk Log Aktivitas.
 *
 * Log adalah bukti audit, jadi pesan galat tidak boleh menyiratkan bahwa tidak
 * ada aktivitas tercatat. Yang benar: log belum berhasil dibaca.
 */
export default function LogsError({
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
      moduleName="Log Aktivitas"
      pageTitle="Log Aktivitas"
      title="Log aktivitas gagal dibaca"
      description="Rekam jejak audit tidak dapat diambil saat ini. Ini bukan berarti tidak ada aktivitas tercatat; catatan tetap tersimpan di server."
    />
  );
}
