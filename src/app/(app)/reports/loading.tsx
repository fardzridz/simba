import { Skeleton } from "../loading-state";

/**
 * Keadaan memuat untuk modul Laporan & Ekspor.
 *
 * Bentuk kerangka mengikuti tata letak baru: judul, satu kartu filter berisi
 * delapan kontrol, lalu satu kartu tabel penuh. Tidak ada angka yang dikarang
 * selama memuat (R-17, R-38).
 */
export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">Memuat laporan dan pilihan ekspor.</span>

      {/* Judul halaman */}
      <div aria-hidden="true">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-3 w-80" />
      </div>

      {/* Baris filter */}
      <div className="card flex flex-col gap-3 p-4" aria-hidden="true">
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-3">
          <Skeleton className="h-3 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="card overflow-hidden" aria-hidden="true">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-border bg-surface-sunken">
              {Array.from({ length: 6 }).map((_, column) => (
                <th key={column} className="px-3 py-2.5">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, row) => (
              <tr key={row} className="border-b border-border last:border-b-0">
                {Array.from({ length: 6 }).map((_, column) => (
                  <td key={column} className="px-3 py-2.5">
                    <Skeleton className="h-3.5 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
