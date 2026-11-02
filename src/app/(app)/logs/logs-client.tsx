"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/app/icons";
import { EmptyState } from "../states";
import type { ActivityLogItem } from "@/db/queries/logs";

export interface LogsClientProps {
  userRole: "ADMIN" | "SUPER_ADMIN";
  userDivisionName: string;
  /** Filter aktif dari URL; sumbernya server agar layar tetap akurat. */
  filters: {
    q: string;
    aksi: string;
    entitas: string;
    periode: string;
  };
  items: ActivityLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  actionOptions: { id: string; label: string }[];
  entityOptions: { id: string; label: string }[];
}

const PERIODE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Periode: semua" },
  { value: "7", label: "Periode: 7 hari" },
  { value: "30", label: "Periode: 30 hari" },
  { value: "90", label: "Periode: 90 hari" },
];

export default function LogsClient({
  userRole,
  userDivisionName,
  filters,
  items,
  total,
  page,
  pageSize,
  totalPages,
  actionOptions,
  entityOptions,
}: LogsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = Boolean(
    filters.q || filters.aksi || filters.entitas || filters.periode,
  );

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Filter baru selalu mulai dari halaman pertama.
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function goToPage(pageNum: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(pageNum));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-h1 font-semibold text-ink">Log Aktivitas</h1>
        <p className="mt-1 text-body text-ink-3">
          {userRole === "SUPER_ADMIN"
            ? "Rekam jejak audit trail seluruh operasi data dan mutasi status di sistem."
            : `Rekam jejak audit trail divisi ${userDivisionName}, termasuk aksi Super Admin yang menyentuh divisi ini.`}
        </p>
      </div>

      {/* Banner Immutability Log Sesuai Wireframe L15 */}
      <div className="rounded-lg border border-border bg-surface-sunken p-3 text-body-sm text-ink-2">
        <p>
          Log tidak dapat diubah atau dihapus lewat antarmuka. Hanya Admin divisi dan
          Super Admin yang dapat membukanya.
        </p>
      </div>

      {/* Baris Filter Audit Trail */}
      <div
        className={`card p-3 flex flex-wrap items-center gap-3 bg-surface transition-opacity ${
          isPending ? "opacity-70" : "opacity-100"
        }`}
      >
        {/* Kotak Cari Cepat */}
        <div className="relative flex-1 min-w-[200px] tablet:max-w-[260px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
            <Icon name="cari" size={15} />
          </span>
          <input
            type="search"
            defaultValue={filters.q}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateParams({ q: e.currentTarget.value.trim() || null });
              }
            }}
            onBlur={(e) => {
              if (e.currentTarget.value.trim() !== filters.q) {
                updateParams({ q: e.currentTarget.value.trim() || null });
              }
            }}
            aria-label="Cari kode aksi, entitas, aktor, atau isi catatan"
            placeholder="Cari log atau nomor..."
            className="h-9 w-full rounded-md border border-border-strong bg-surface pl-8 pr-3 text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          />
        </div>

        {/* Pemilih Kelas Aksi */}
        <select
          value={filters.aksi}
          onChange={(e) => updateParams({ aksi: e.target.value || null })}
          aria-label="Filter kelas aksi log"
          className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="">Aksi: semua</option>
          {actionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Pemilih Entitas */}
        <select
          value={filters.entitas}
          onChange={(e) => updateParams({ entitas: e.target.value || null })}
          aria-label="Filter entitas log"
          className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="">Entitas: semua</option>
          {entityOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Pemilih Periode */}
        <select
          value={filters.periode}
          onChange={(e) => updateParams({ periode: e.target.value || null })}
          aria-label="Filter periode log"
          className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          {PERIODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Tombol Hapus Filter */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => updateParams({ q: null, aksi: null, entitas: null, periode: null })}
            className="ml-auto text-body-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          >
            Hapus filter
          </button>
        ) : null}
      </div>

      {/* Tabel Log Aktivitas */}
      {total === 0 ? (
        <EmptyState
          title={
            hasActiveFilters
              ? "Belum ada log aktivitas pada filter ini"
              : "Belum ada aktivitas tercatat"
          }
          description={
            hasActiveFilters
              ? "Hapus filter untuk melihat rekaman audit trail lainnya."
              : "Setiap aktivitas penugasan dan perubahan data akan tercatat otomatis di sini."
          }
          reason={
            hasActiveFilters
              ? "rekaman aktivitas ada, tetapi tersaring habis oleh kombinasi filter aktif."
              : "belum ada aktivitas yang menulis riwayat pada rentang ini."
          }
          illustration="rak"
          action={
            hasActiveFilters
              ? {
                  type: "button",
                  label: "Hapus filter",
                  variant: "secondary",
                  onClick: () =>
                    updateParams({ q: null, aksi: null, entitas: null, periode: null }),
                }
              : undefined
          }
        />
      ) : (
        <div className={`card overflow-hidden ${isPending ? "opacity-70" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border bg-neutral-surface/60 text-body-sm font-semibold text-ink-2">
                  <th scope="col" className="px-4 py-3">
                    Waktu
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Aktor
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Aksi
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Entitas
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ringkasan perubahan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-surface/40 transition-colors">
                    {/* Kolom 1: Waktu WIB */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-body text-ink-2">
                      {log.timestampFormatted}
                    </td>

                    {/* Kolom 2: Aktor */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-ink text-body-sm">
                          {log.actorName}
                        </span>
                        <span className="text-body-sm text-ink-3">
                          {log.actorRoleLabel}
                        </span>
                      </div>
                    </td>

                    {/* Kolom 3: Kode Aksi Monospasi */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-body-sm font-medium text-ink bg-neutral-surface/80 px-2 py-0.5 rounded border border-border">
                        {log.actionCode}
                      </span>
                    </td>

                    {/* Kolom 4: Entitas */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-body-sm text-ink font-medium">
                          {log.entityLabel}
                        </span>
                        <span className="font-mono text-body-sm text-ink-3 break-all">
                          {log.entityId}
                        </span>
                      </div>
                    </td>

                    {/* Kolom 5: Ringkasan Perubahan */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-body-sm text-ink">{log.summary}</span>
                        {log.detailNote ? (
                          <span className="text-body-sm text-ink-3 mt-0.5">
                            {log.detailNote}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Baris Informasi Paginasi & Edukasi Audit Trail */}
          <div className="flex flex-col gap-3 border-t border-border p-4 tablet:flex-row tablet:items-center tablet:justify-between text-body-sm text-ink-3">
            <span>
              Menampilkan {startRecord} sampai {endRecord} dari {total} aktivitas
            </span>

            {totalPages > 1 ? (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => goToPage(pg)}
                    aria-current={pg === page ? "page" : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border text-body-sm font-semibold transition-colors ${
                      pg === page
                        ? "border-primary bg-primary text-on-dark"
                        : "border-border bg-surface text-ink hover:bg-neutral-surface"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Catatan Kaki Integritas Audit Trail */}
      <p className="text-body-sm text-ink-3">
        Nilai sebelum dan sesudah disimpan, sehingga perubahan dapat diperiksa tanpa
        membuka data aslinya.
      </p>
    </div>
  );
}
