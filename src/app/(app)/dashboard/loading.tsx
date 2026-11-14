import { KpiStripSkeleton, Skeleton } from "../loading-state";

/**
 * Keadaan memuat Dashboard.
 *
 * Kerangka mengikuti susunan asli (banner lingkup, delapan kartu metrik, lalu
 * dua panel) supaya tidak ada pergeseran tata letak saat angka tiba. Tidak ada
 * satu digit pun dirender selama memuat, karena angka sementara adalah data
 * karangan (R-17, R-38).
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Memuat ringkasan dashboard.</span>

      {/* Banner lingkup & satuan data */}
      <div
        className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface px-4 py-3 shadow-xs tablet:flex-row tablet:items-center tablet:justify-between"
        aria-hidden="true"
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Delapan kartu metrik */}
      <KpiStripSkeleton
        count={8}
        ariaLabel="Memuat ringkasan metrik dashboard..."
      />

      {/* Distribusi status & antrean review */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12" aria-hidden="true">
        <div className="card flex flex-col p-4 desktop:col-span-7 desktop:p-6">
          <div className="border-b border-border pb-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3 w-72" />
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, row) => (
              <div key={row} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-1.5 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col p-4 desktop:col-span-5 desktop:p-6">
          <div className="border-b border-border pb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
