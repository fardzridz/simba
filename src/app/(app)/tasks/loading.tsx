import { KpiStripSkeleton, Skeleton, TableSkeleton } from "../loading-state";

/**
 * Keadaan memuat daftar Tugas.
 *
 * Urutan kerangka mengikuti halaman asli: judul + tombol aksi, pita empat KPI,
 * baris filter, lalu tabel. Tinggi baris tabel sama dengan tabel asli supaya
 * tidak ada pergeseran tata letak (CLS) ketika data tiba.
 */
export default function TasksLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Memuat daftar tugas.</span>

      {/* Judul halaman + tombol buat tugas */}
      <div
        className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between"
        aria-hidden="true"
      >
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-3 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Pita empat KPI */}
      <KpiStripSkeleton
        count={4}
        ariaLabel="Memuat ringkasan tugas divisi..."
      />

      {/* Baris filter */}
      <div
        className="card flex flex-wrap items-center gap-3 p-3"
        aria-hidden="true"
      >
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Tabel tugas */}
      <TableSkeleton
        rows={6}
        ariaLabel="Memuat daftar tugas..."
        columns={[
          { labelWidth: "w-40" },
          { labelWidth: "w-24" },
          { labelWidth: "w-28" },
          { labelWidth: "w-20" },
          { labelWidth: "w-20", align: "right" },
        ]}
      />

      {/* Baris paginasi */}
      <div
        className="flex flex-col gap-3 pt-2 text-body-sm tablet:flex-row tablet:items-center tablet:justify-between"
        aria-hidden="true"
      >
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-8 w-56" />
      </div>
    </div>
  );
}
