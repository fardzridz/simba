import { Skeleton, TableSkeleton } from "../loading-state";

/**
 * Keadaan memuat Log Aktivitas.
 *
 * Banner "log tidak dapat diubah" tetap ditampilkan sebagai kerangka karena ia
 * bagian dari penjelasan halaman, bukan data. Tidak ada baris log yang dikarang
 * selama memuat (R-17, R-38).
 */
export default function LogsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">Memuat log aktivitas.</span>

      {/* Judul + subjudul */}
      <div aria-hidden="true">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-3 w-80" />
      </div>

      {/* Banner aturan log */}
      <div
        className="rounded-lg border border-border bg-surface-sunken p-3"
        aria-hidden="true"
      >
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-1.5 h-3 w-2/3" />
      </div>

      {/* Baris filter */}
      <div
        className="card flex flex-wrap items-center gap-3 p-3 bg-surface"
        aria-hidden="true"
      >
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Tabel log + paginasi */}
      <div aria-hidden="true">
        <TableSkeleton
          rows={8}
          ariaLabel="Memuat log aktivitas..."
          columns={[
            { labelWidth: "w-28" },
            { labelWidth: "w-32" },
            { labelWidth: "w-24" },
            { labelWidth: "w-40" },
            { labelWidth: "w-20", align: "right" },
          ]}
        />
        <div className="mt-3 flex flex-col gap-3 text-body-sm tablet:flex-row tablet:items-center tablet:justify-between">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    </div>
  );
}
