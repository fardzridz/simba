"use client";

import { useEffect } from "react";
// Berkas ini MENGGANTIKAN root layout saat aktif, sehingga tidak mewarisi
// stylesheet apa pun. Impor langsung di sini supaya token warna dan tipografi
// tetap berlaku; tanpa ini halaman galat tampil tanpa gaya sama sekali.
import "./globals.css";

/**
 * Batas galat terluar (sesuai Next.js 16, `dist/docs/01-app/03-api-reference/
 * 03-file-conventions/error.md` § Global Error).
 *
 * Kapan ini aktif: hanya ketika galat terjadi di root layout atau template,
 * yaitu lapisan yang tidak terjangkau `error.tsx` mana pun. Contoh nyata di
 * aplikasi ini: kueri divisi atau hitungan notifikasi di `(app)/layout.tsx`
 * gagal, sehingga seluruh kerangka aplikasi tidak bisa dirender.
 *
 * Aturan yang dipegang:
 * - Wajib Komponen Klien; `metadata` tidak didukung, jadi judul dipasang lewat
 *   elemen `<title>` React.
 * - Wajib mendefinisikan `<html>` dan `<body>` sendiri.
 * - Pesan tidak menyebut detail internal (nama tabel, kueri, jejak stack).
 *   `error.digest` ditampilkan karena itu satu-satunya nilai aman untuk
 *   mencocokkan kejadian ini dengan log server.
 * - Satu tindakan pemulihan yang pasti: muat ulang segmen lewat `retry`.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Galat fatal di luar jangkauan batas galat rute:", error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";

  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <title>Portal tidak dapat dimuat</title>
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
          <div
            role="alert"
            aria-live="polite"
            className="card w-full max-w-[520px] p-6 text-center"
          >
            <h1 className="text-h1 font-semibold text-ink">
              Portal tidak dapat dimuat
            </h1>

            <p className="mt-2 text-body text-ink-2">
              Kerangka aplikasi gagal disiapkan, jadi halaman ini belum bisa
              menampilkan menu maupun data. Ini bukan berarti akun Anda tidak
              berhak atas datanya.
            </p>

            <p className="mt-3 text-body-sm text-ink-3">
              Coba muat ulang. Bila kegagalan berulang, sampaikan waktu kejadian
              kepada admin divisi agar dapat dicocokkan dengan log server.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => retry()}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-body font-semibold text-on-dark transition-colors duration-[120ms] hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
              >
                Muat ulang
              </button>
            </div>

            {digest ? (
              <p className="mt-4 text-body-sm text-ink-3">
                Kode kejadian: <span className="font-mono">{digest}</span>
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
