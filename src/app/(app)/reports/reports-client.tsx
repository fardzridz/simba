"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../loading-state";
import {
  MOCK_PERIOD_SUMMARY,
  MOCK_DIVISION_REPORT_ROWS,
  type DivisionReportRow,
} from "@/lib/mock-reports";
import { MOCK_CATEGORIES } from "@/lib/mock-division-members";

export interface ReportsClientProps {
  userRole?: "ADMIN" | "SUPER_ADMIN";
  userDivisionName?: string;
}

export default function ReportsClient({
  userRole = "ADMIN",
  userDivisionName = "Hukum & Sengketa",
}: ReportsClientProps) {
  const [periodOption, setPeriodOption] = useState("okt_2026");
  const [selectedDivision, setSelectedDivision] = useState(
    userRole === "SUPER_ADMIN" ? "semua" : userDivisionName,
  );
  const [selectedStatus, setSelectedStatus] = useState("semua");
  const [selectedCategory, setSelectedCategory] = useState("semua");

  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const periodLabel = useMemo(() => {
    switch (periodOption) {
      case "sep_2026":
        return "1 sampai 30 Sep 2026";
      case "triwulan_3":
        return "1 Jul sampai 30 Sep 2026";
      case "tahun_2026":
        return "1 Jan sampai 17 Okt 2026";
      default:
        return "1 sampai 17 Okt 2026";
    }
  }, [periodOption]);

  const rows: DivisionReportRow[] = useMemo(() => {
    if (userRole !== "SUPER_ADMIN" || selectedDivision !== "semua") {
      const targetDiv = userRole === "SUPER_ADMIN" ? selectedDivision : userDivisionName;
      return MOCK_DIVISION_REPORT_ROWS.filter(
        (r) => r.divisionName.toLowerCase() === targetDiv.toLowerCase(),
      );
    }
    return MOCK_DIVISION_REPORT_ROWS;
  }, [userRole, userDivisionName, selectedDivision]);

  const hasActiveFilters = Boolean(
    periodOption !== "okt_2026" ||
      selectedStatus !== "semua" ||
      selectedCategory !== "semua" ||
      (userRole === "SUPER_ADMIN" && selectedDivision !== "semua"),
  );

  const resetFilters = () => {
    setPeriodOption("okt_2026");
    setSelectedDivision(userRole === "SUPER_ADMIN" ? "semua" : userDivisionName);
    setSelectedStatus("semua");
    setSelectedCategory("semua");
  };

  const handleExportXlsx = () => {
    setIsExportingXlsx(true);
    setExportNotice(null);

    // Simulasi penyusunan berkas XLSX berkecepatan tinggi di sisi klien
    setTimeout(() => {
      setIsExportingXlsx(false);
      setExportNotice(
        `Berkas Laporan_Penugasan_${periodOption}_${userRole}.xlsx berhasil disiapkan dan diunduh (378 baris data).`,
      );
      setTimeout(() => setExportNotice(null), 5000);
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman (Disembunyikan saat cetak kertas) */}
      <div className="print:hidden">
        <h1 className="text-h1 font-semibold text-ink">Laporan &amp; Ekspor</h1>
        <p className="mt-1 text-body text-ink-3">
          Periode {periodLabel},{" "}
          {userRole === "SUPER_ADMIN"
            ? selectedDivision === "semua"
              ? "seluruh divisi instansi."
              : `divisi ${selectedDivision}.`
            : `divisi ${userDivisionName}.`}
        </p>
      </div>

      {/* Spanduk Notifikasi Ekspor */}
      {exportNotice ? (
        <div
          role="status"
          className="rounded-lg border border-success/30 bg-success-surface p-4 text-body-sm font-semibold text-success flex items-center gap-2 print:hidden"
        >
          <Icon name="centang" size={16} />
          <span>{exportNotice}</span>
        </div>
      ) : null}

      {/* Baris Filter Laporan (Disembunyikan saat cetak kertas) */}
      <div className="card p-3 flex flex-wrap items-center gap-3 bg-surface print:hidden">
        {/* Pemilih Periode */}
        <select
          value={periodOption}
          onChange={(e) => setPeriodOption(e.target.value)}
          aria-label="Pilih rentang periode"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="okt_2026">1 sampai 17 Okt 2026 (Bulan berjalan)</option>
          <option value="sep_2026">1 sampai 30 Sep 2026 (Bulan lalu)</option>
          <option value="triwulan_3">1 Jul s.d. 30 Sep 2026 (Triwulan III)</option>
          <option value="tahun_2026">Tahun 2026 (Tahun berjalan)</option>
        </select>

        {/* Pemilih Divisi */}
        {userRole === "SUPER_ADMIN" ? (
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            aria-label="Filter divisi laporan"
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
            <span>Divisi: {userDivisionName}</span>
          </div>
        )}

        {/* Pemilih Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter status laporan"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="semua">Status: semua</option>
          <option value="SELESAI">Selesai</option>
          <option value="MENUNGGU_VERIFIKASI">Menunggu Verifikasi</option>
          <option value="SEDANG_DIKERJAKAN">Sedang Dikerjakan</option>
          <option value="BELUM_DIKERJAKAN">Belum Dikerjakan</option>
        </select>

        {/* Pemilih Kategori */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter kategori laporan"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="semua">Kategori: semua</option>
          {MOCK_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
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

      {/* Bagian Atas: Ringkasan Periode + Ekspor (Swiss Grid 2 Kolom) */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12 print:hidden">
        {/* Kolom Kiri: Ringkasan Periode (8 Kolom) */}
        <div className="card p-6 flex flex-col justify-between desktop:col-span-8">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-h2 font-semibold text-ink">Ringkasan Periode</h2>
              <span className="text-body-sm text-ink-3">satuan: penugasan</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 tablet:grid-cols-5">
              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Penugasan</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1">
                  {MOCK_PERIOD_SUMMARY.totalAssignments}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Selesai</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1">
                  {MOCK_PERIOD_SUMMARY.completed}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Tepat Waktu</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1">
                  {MOCK_PERIOD_SUMMARY.onTime}
                </span>
                <span className="text-[11px] text-ink-3">
                  dari {MOCK_PERIOD_SUMMARY.completed} selesai
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Terlambat</span>
                <span className="font-display-kpi text-[28px] font-semibold text-error mt-1">
                  {MOCK_PERIOD_SUMMARY.overdue}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Dokumen Final</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1">
                  {MOCK_PERIOD_SUMMARY.finalDocuments}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-body-sm text-ink-3 border-t border-border pt-3">
            Angka memakai rumus yang sama dengan dashboard dan ekspor, satuan penugasan.
          </p>
        </div>

        {/* Kolom Kanan: Panel Aksi Ekspor (4 Kolom) */}
        <div className="card p-6 flex flex-col justify-between desktop:col-span-4">
          <div>
            <h2 className="text-h2 font-semibold text-ink border-b border-border pb-3">
              Ekspor
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              <span className="text-body-sm font-medium text-ink-2">
                Pilih format berkas laporan:
              </span>

              <div className="flex flex-wrap items-center gap-3">
                <LoadingButton
                  type="button"
                  variant="primary"
                  loading={isExportingXlsx}
                  loadingText="Menyiapkan berkas..."
                  onClick={handleExportXlsx}
                  className="flex-1 h-10 text-body font-semibold shadow-sm"
                >
                  Ekspor XLSX
                </LoadingButton>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isExportingXlsx}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink hover:bg-neutral-surface active:bg-border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cetak / PDF
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-body-sm text-ink-3 border-t border-border pt-3 space-y-1">
            <p>Menyiapkan berkas, {MOCK_PERIOD_SUMMARY.totalAssignments} baris data.</p>
            <p>Tombol terkunci sementara saat berkas sedang dikompilasi.</p>
          </div>
        </div>
      </div>

      {/* Bagian Bawah: Pratinjau Tabel + Pratinjau Cetak A4 */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12 print:block">
        {/* Kolom Kiri: Tabel Pratinjau Rekapitulasi (8 Kolom) */}
        <div className="card p-6 flex flex-col gap-4 desktop:col-span-8 print:shadow-none print:border-none print:p-0">
          <div className="flex items-center justify-between border-b border-border pb-3 print:border-ink">
            <h2 className="text-h2 font-semibold text-ink">Pratinjau</h2>
            <span className="text-body-sm text-ink-3 print:hidden">
              {rows.length} divisi ditampilkan dari {MOCK_PERIOD_SUMMARY.totalAssignments} penugasan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border text-body-sm font-semibold text-ink-2 print:border-ink print:text-ink">
                  <th scope="col" className="py-2.5">
                    Divisi
                  </th>
                  <th scope="col" className="py-2.5 text-right">
                    Penugasan
                  </th>
                  <th scope="col" className="py-2.5 text-right">
                    Selesai
                  </th>
                  <th scope="col" className="py-2.5 text-right">
                    Terlambat
                  </th>
                  <th scope="col" className="py-2.5 text-right">
                    Dokumen Final
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border print:divide-ink">
                {rows.map((row) => (
                  <tr key={row.divisionId} className="hover:bg-neutral-surface/40">
                    <td className="py-3 font-medium text-ink">
                      {row.divisionName}
                    </td>
                    <td className="py-3 text-right font-mono text-body text-ink">
                      {row.totalAssignments}
                    </td>
                    <td className="py-3 text-right font-mono text-body text-ink">
                      {row.completed}
                    </td>
                    <td className="py-3 text-right font-mono text-body font-semibold text-error">
                      {row.overdue}
                    </td>
                    <td className="py-3 text-right font-mono text-body text-ink">
                      {row.finalDocuments}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border pt-3 text-body-sm text-ink-3 space-y-1 print:hidden">
            <p className="text-ink-2 font-medium">
              Hasil ekspor identik dengan filter di layar.
            </p>
            <p>Kepala laporan memuat daftar filter yang sedang aktif.</p>
            <p>
              {MOCK_PERIOD_SUMMARY.cancelled} penugasan berstatus Dibatalkan dikeluarkan dari penyebut progres.
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Pratinjau Lembar Cetak A4 (4 Kolom) */}
        <div className="card p-6 flex flex-col gap-4 desktop:col-span-4 print:hidden">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-h2 font-semibold text-ink">Tampilan Cetak A4</h2>
            <span className="text-[11px] font-mono text-ink-3">A4 Portrait</span>
          </div>

          {/* Kotak Lembar Pratinjau Kertas KOP Instansi */}
          <div className="border border-border-strong rounded-md p-4 bg-surface shadow-xs flex flex-col gap-3 font-sans text-xs">
            <div className="text-center border-b border-ink pb-2">
              <span className="font-mono text-[10px] text-ink-3 block">
                [KOP INSTANSI PENYELENGGARA PEMILU]
              </span>
              <h3 className="font-semibold text-ink text-sm mt-0.5">
                Laporan Rekapitulasi Penugasan
              </h3>
              <p className="text-ink-3 text-[11px]">Periode: {periodLabel}</p>
              <p className="text-[10px] text-ink-3 mt-0.5">
                Filter: Divisi {userDivisionName}, status: semua
              </p>
            </div>

            {/* Tabel Mini Pratinjau Cetak */}
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-ink font-semibold text-ink">
                  <th className="py-1">Divisi</th>
                  <th className="py-1 text-right">Tugas</th>
                  <th className="py-1 text-right">Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 3).map((r) => (
                  <tr key={r.divisionId}>
                    <td className="py-1 text-ink">{r.divisionName}</td>
                    <td className="py-1 text-right font-mono">{r.totalAssignments}</td>
                    <td className="py-1 text-right font-mono">{r.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Kolom Tanda Tangan Resmi */}
            <div className="mt-3 flex flex-col items-center text-center text-[10px] text-ink border-t border-border pt-3">
              <span>Mengetahui,</span>
              <span className="font-semibold">Kepala Divisi</span>
              <div className="w-24 border-b border-ink mt-8 mb-1" />
              <span className="text-ink-3 font-mono">Nama &amp; NIP Pejabat</span>
            </div>
          </div>

          <p className="text-body-sm text-ink-3 border-t border-border pt-3">
            Sidebar, tombol, dan filter disembunyikan otomatis saat mencetak lewat fitur cetak peramban.
          </p>
        </div>
      </div>
    </div>
  );
}
