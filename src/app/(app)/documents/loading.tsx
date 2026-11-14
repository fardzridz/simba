import { Skeleton, TableSkeleton } from "../loading-state";

/**
 * Keadaan memuat Katalog Dokumen Final.
 *
 * Kerangka mengikuti tata letak dua kolom (daftar 7/12 + panel detail 5/12)
 * supaya panel detail tidak melompat saat data pertama tiba.
 */
export default function DocumentsLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">Memuat katalog dokumen final.</span>

      {/* Judul + subjudul */}
      <div aria-hidden="true">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="mt-2 h-3 w-96" />
      </div>

      {/* Baris filter */}
      <div
        className="card flex flex-wrap items-center gap-3 p-3 bg-surface"
        aria-hidden="true"
      >
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Daftar dokumen + panel detail */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12" aria-hidden="true">
        <div className="flex flex-col gap-4 desktop:col-span-7">
          <TableSkeleton
            rows={6}
            ariaLabel="Memuat daftar dokumen..."
            columns={[
              { labelWidth: "w-36" },
              { labelWidth: "w-28" },
              { labelWidth: "w-20" },
            ]}
          />
          <div className="flex flex-col gap-3 border-t border-border p-4 text-body-sm tablet:flex-row tablet:items-center tablet:justify-between">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>

        <div className="card flex flex-col gap-4 p-6 desktop:col-span-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
    </div>
  );
}
