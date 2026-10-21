"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/app/icons";
import { EmptyState } from "../states";
import DocumentDetailPanel from "./document-detail-panel";
import {
  MOCK_FINAL_DOCUMENTS,
  type FinalDocument,
} from "@/lib/mock-documents";
import { MOCK_CATEGORIES } from "@/lib/mock-division-members";

export interface DocumentsClientProps {
  userRole?: "USER" | "ADMIN" | "SUPER_ADMIN";
  userDivisionName?: string;
}

export default function DocumentsClient({
  userRole = "ADMIN",
  userDivisionName = "Hukum & Sengketa",
}: DocumentsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [selectedAge, setSelectedAge] = useState<number | "semua">("semua");
  const [selectedDivision, setSelectedDivision] = useState<string>("semua");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    MOCK_FINAL_DOCUMENTS[0]?.id ?? null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter dokumen sesuai kriteria
  const filteredDocuments = useMemo(() => {
    return MOCK_FINAL_DOCUMENTS.filter((doc) => {
      // Filter Divisi (terkunci untuk Staf dan Admin Divisi)
      if (userRole !== "SUPER_ADMIN") {
        if (doc.divisionName !== userDivisionName) return false;
      } else if (selectedDivision !== "semua") {
        if (doc.divisionName !== selectedDivision) return false;
      }

      // Filter Pencarian (Nomor Tugas atau Judul)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchNumber = doc.taskNumber.toLowerCase().includes(q);
        const matchRecipient = doc.recipientName.toLowerCase().includes(q);
        if (!matchTitle && !matchNumber && !matchRecipient) return false;
      }

      // Filter Kategori
      if (selectedCategory !== "semua" && doc.categoryName !== selectedCategory) {
        return false;
      }

      // Filter Rentang Waktu Arsip
      if (selectedAge !== "semua") {
        if (doc.archivedDaysAgo > selectedAge) return false;
      }

      return true;
    });
  }, [
    userRole,
    userDivisionName,
    selectedDivision,
    searchQuery,
    selectedCategory,
    selectedAge,
  ]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedCategory !== "semua" ||
      selectedAge !== "semua" ||
      (userRole === "SUPER_ADMIN" && selectedDivision !== "semua"),
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("semua");
    setSelectedAge("semua");
    setSelectedDivision("semua");
    setCurrentPage(1);
  };

  // Dokumen yang saat ini aktif ditampilkan di panel samping
  const activeDocument = useMemo(() => {
    if (!selectedDocId) return null;
    return filteredDocuments.find((d) => d.id === selectedDocId) ?? null;
  }, [selectedDocId, filteredDocuments]);

  // Paginasi
  const totalDocs = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalDocs / pageSize));
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage, pageSize]);

  const startRecord = totalDocs === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalDocs);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-h1 font-semibold text-ink">Katalog Dokumen Final</h1>
        <p className="mt-1 text-body text-ink-3">
          {userRole === "SUPER_ADMIN"
            ? `Dokumen final lintas seluruh divisi (${totalDocs} dokumen sah). Satu tugas, satu baris dokumen.`
            : `Dokumen final divisi ${userDivisionName}. Satu tugas, satu baris dokumen.`}
        </p>
      </div>

      {/* Baris Filter Dokumen */}
      <div className="card p-3 flex flex-wrap items-center gap-3 bg-surface">
        {/* Input Cari Nomor / Judul */}
        <div className="relative flex-1 min-w-[200px] tablet:max-w-[260px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
            <Icon name="cari" size={15} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nomor atau judul..."
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          />
        </div>

        {/* Pemilih Divisi */}
        {userRole === "SUPER_ADMIN" ? (
          <select
            value={selectedDivision}
            onChange={(e) => {
              setSelectedDivision(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter divisi"
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          >
            <option value="semua">Divisi: Semua</option>
            <option value="Hukum & Sengketa">Hukum &amp; Sengketa</option>
            <option value="Pengawasan">Pengawasan</option>
            <option value="SDM & Organisasi">SDM &amp; Organisasi</option>
            <option value="Sekretariat">Sekretariat</option>
            <option value="Penindakan">Penindakan</option>
          </select>
        ) : (
          <div className="h-8 rounded-md border border-border bg-neutral-surface px-3 flex items-center text-body-sm text-ink-2">
            <span>Divisi: {userDivisionName} (terkunci)</span>
          </div>
        )}

        {/* Pemilih Kategori */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter kategori"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="semua">Kategori: semua</option>
          {MOCK_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Pemilih Rentang Waktu Arsip */}
        <select
          value={String(selectedAge)}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedAge(val === "semua" ? "semua" : Number(val));
            setCurrentPage(1);
          }}
          aria-label="Rentang waktu arsip"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="semua">Arsip: semua</option>
          <option value="30">Arsip: 30 hari</option>
          <option value="90">Arsip: 90 hari</option>
          <option value="365">Arsip: 1 tahun</option>
        </select>

        {/* Tombol Hapus Filter */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-body-sm font-semibold text-primary hover:underline"
          >
            Hapus filter
          </button>
        ) : null}
      </div>

      {/* Konten Utama: 2 Kolom (Tabel + Panel Samping) */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12">
        {/* Kolom Kiri: Tabel Dokumen Final (7 Kolom pada Desktop) */}
        <div className="flex flex-col gap-4 desktop:col-span-7">
          {totalDocs === 0 ? (
            <EmptyState
              title={
                hasActiveFilters
                  ? "Belum ada dokumen final pada filter ini"
                  : "Belum ada dokumen final terarsip"
              }
              description={
                hasActiveFilters
                  ? "Hapus filter atau sesuaikan kata kunci untuk menemukan dokumen arsip lainnya."
                  : "Dokumen final akan otomatis muncul di sini begitu penugasan staf disetujui oleh admin divisi."
              }
              reason={
                hasActiveFilters
                  ? "data dokumen final ada, tetapi tersaring oleh kombinasi filter yang aktif."
                  : "belum ada tugas yang selesai diverifikasi dan diarsipkan ke dalam sistem."
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
            <div className="card overflow-hidden">
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
                    {paginatedDocuments.map((doc) => {
                      const isSelected = doc.id === selectedDocId;
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary-surface/40 hover:bg-primary-surface/60"
                              : "hover:bg-neutral-surface/40"
                          }`}
                        >
                          {/* Kolom 1: Nomor Tugas Mono */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-body-sm text-ink-3">
                              {doc.taskNumber}
                            </span>
                          </td>

                          {/* Kolom 2: Judul Dokumen */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-ink hover:text-primary">
                                {doc.title}
                              </span>
                              <span className="text-body-sm text-ink-3">
                                {doc.categoryName}
                              </span>
                            </div>
                          </td>

                          {/* Kolom 3: Tanggal Arsip */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-body text-ink">
                            {doc.archivedDateFormatted}
                          </td>

                          {/* Kolom 4: Jumlah Berkas */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-body-sm text-ink-2">
                            {doc.files.length} berkas
                          </td>

                          {/* Kolom 5: Aksi */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocId(doc.id);
                              }}
                              className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
                            >
                              <Icon name="unduh" size={13} />
                              Unduh
                            </button>
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
                  Menampilkan {startRecord} sampai {endRecord} dari {totalDocs} dokumen
                </span>

                {totalPages > 1 ? (
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setCurrentPage(pg)}
                        className={`flex h-7 w-7 items-center justify-center rounded-md border text-body-sm font-semibold transition-colors ${
                          pg === currentPage
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

        {/* Kolom Kanan: Panel Samping Detail Dokumen (5 Kolom pada Desktop) */}
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
