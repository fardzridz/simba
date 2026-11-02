"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/app/icons";
import { EmptyState } from "../states";
import DocumentDetailPanel from "./document-detail-panel";
import type { CatalogItem } from "@/db/queries/documents";
import type { CategoryOption } from "@/db/queries/form-data";

export interface DocumentsClientProps {
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  /** Filter aktif dari URL; sumbernya server agar layar dan angka selalu sama. */
  filters: {
    q: string;
    categoryId: string;
    umur: string;
    divisionId: string;
  };
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categoryOptions: CategoryOption[];
  /** Hanya terisi untuk Super Admin. */
  divisionOptions: { id: string; name: string }[];
  userDivisionName: string;
}

const AGE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Arsip: semua" },
  { value: "30", label: "Arsip: 30 hari" },
  { value: "90", label: "Arsip: 90 hari" },
  { value: "365", label: "Arsip: 1 tahun" },
];

export default function DocumentsClient({
  role,
  filters,
  items,
  total,
  page,
  pageSize,
  totalPages,
  categoryOptions,
  divisionOptions,
  userDivisionName,
}: DocumentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.categoryId ||
      filters.umur ||
      (role === "SUPER_ADMIN" && filters.divisionId),
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

  const resetFilters = () => {
    updateParams({ q: null, kategori: null, umur: null, divisi: null });
  };

  const activeDocument = useMemo(() => {
    if (!selectedDocId) return null;
    return items.find((item) => item.id === selectedDocId) ?? null;
  }, [selectedDocId, items]);

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-h1 font-semibold text-ink">Katalog Dokumen Final</h1>
        <p className="mt-1 text-body text-ink-3">
          {role === "SUPER_ADMIN"
            ? `Dokumen final lintas seluruh divisi (${total} dokumen). Satu penugasan selesai, satu baris dokumen.`
            : `Dokumen final divisi ${userDivisionName} (${total} dokumen). Satu penugasan selesai, satu baris dokumen.`}
        </p>
      </div>

      {/* Baris Filter Dokumen */}
      <div
        className={`card p-3 flex flex-wrap items-center gap-3 bg-surface transition-opacity ${
          isPending ? "opacity-70" : "opacity-100"
        }`}
      >
        {/* Input Cari Nomor / Judul / Nama Penerima */}
        <div className="relative flex-1 min-w-[200px] tablet:max-w-[280px]">
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
            aria-label="Cari nomor tugas, judul, atau nama penerima"
            placeholder="Cari nomor atau judul..."
            className="h-9 w-full rounded-md border border-border-strong bg-surface pl-8 pr-3 text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          />
        </div>

        {/* Pemilih Divisi (Super Admin) */}
        {role === "SUPER_ADMIN" ? (
          <select
            value={filters.divisionId}
            onChange={(e) => updateParams({ divisi: e.target.value || null })}
            aria-label="Filter divisi"
            className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          >
            <option value="">Divisi: Semua</option>
            {divisionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="h-9 rounded-md border border-border bg-neutral-surface px-3 flex items-center text-body-sm text-ink-2">
            <span>Divisi: {userDivisionName} (terkunci)</span>
          </div>
        )}

        {/* Pemilih Kategori */}
        <select
          value={filters.categoryId}
          onChange={(e) => updateParams({ kategori: e.target.value || null })}
          aria-label="Filter kategori"
          className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="">Kategori: semua</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        {/* Pemilih Rentang Waktu Arsip */}
        <select
          value={filters.umur}
          onChange={(e) => updateParams({ umur: e.target.value || null })}
          aria-label="Rentang waktu arsip"
          className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          {AGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Tombol Hapus Filter */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-body-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          >
            Hapus filter
          </button>
        ) : null}
      </div>

      {/* Konten Utama: 2 Kolom (Tabel + Panel Samping) */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12">
        {/* Kolom Kiri: Tabel Dokumen Final */}
        <div className="flex flex-col gap-4 desktop:col-span-7">
          {total === 0 ? (
            <EmptyState
              title={
                hasActiveFilters
                  ? "Belum ada dokumen final pada filter ini"
                  : "Belum ada dokumen final terarsip"
              }
              description={
                hasActiveFilters
                  ? "Hapus filter atau sesuaikan kata kunci untuk menemukan dokumen arsip lainnya."
                  : "Dokumen final akan muncul di sini setelah admin divisi menyetujui pengumpulan staf."
              }
              reason={
                hasActiveFilters
                  ? "data dokumen final ada, tetapi tersaring habis oleh kombinasi filter aktif."
                  : "belum ada penugasan yang selesai diverifikasi dan diarsipkan ke sistem."
              }
              illustration="rak"
              action={
                hasActiveFilters
                  ? {
                      type: "button",
                      label: "Hapus filter",
                      variant: "secondary",
                      onClick: resetFilters,
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
                        Nomor Tugas
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Judul Dokumen
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Diarsipkan
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Berkas
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((doc) => {
                      const isSelected = doc.id === selectedDocId;
                      const firstFile = doc.files[0];
                      return (
                        <tr
                          key={doc.id}
                          tabIndex={0}
                          onClick={() => setSelectedDocId(doc.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedDocId(doc.id);
                            }
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary-surface/40 hover:bg-primary-surface/60"
                              : "hover:bg-neutral-surface/40"
                          }`}
                        >
                          {/* Kolom 1: Nomor Tugas Mono (motif identitas) */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-body-sm text-ink-3">
                              {doc.taskNumber}
                            </span>
                          </td>

                          {/* Kolom 2: Judul Dokumen */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-ink">
                                {doc.title}
                              </span>
                              <span className="text-body-sm text-ink-3">
                                {doc.categoryName}
                              </span>
                            </div>
                          </td>

                          {/* Kolom 3: Tanggal Arsip WIB */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-body text-ink">
                                {doc.archivedDateFormatted}
                              </span>
                              <span className="text-body-sm text-ink-3">
                                {doc.recipientName}
                              </span>
                            </div>
                          </td>

                          {/* Kolom 4: Jumlah Berkas */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-body-sm text-ink-2">
                            {doc.files.length} berkas
                          </td>

                          {/* Kolom 5: Aksi Unduh Nyata */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            {doc.files.length > 0 && firstFile ? (
                              <a
                                href={firstFile.downloadUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
                              >
                                <Icon name="unduh" size={13} />
                                Unduh
                              </a>
                            ) : (
                              <span className="text-body-sm text-ink-3">
                                tidak ada berkas
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Baris Informasi Paginasi Bawah */}
              <div className="flex flex-col gap-3 border-t border-border p-4 tablet:flex-row tablet:items-center tablet:justify-between text-body-sm text-ink-3">
                <span>
                  Menampilkan {startRecord} sampai {endRecord} dari {total} dokumen
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
        </div>

        {/* Kolom Kanan: Panel Samping Detail Dokumen */}
        <div className="desktop:col-span-5">
          <DocumentDetailPanel
            document={activeDocument}
            onClose={() => setSelectedDocId(null)}
          />
        </div>
      </div>
    </div>
  );
}
