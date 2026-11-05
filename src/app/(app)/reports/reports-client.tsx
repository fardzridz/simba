"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/icons";
import type { ReportRecapRow } from "@/db/queries/reports";

export interface ReportsClientProps {
  rows: ReportRecapRow[];
  periods: { key: string; label: string }[];
  activePeriodKey: string;
  periodLabel: string;
  activeDivision: string;
  divisionNames: string[];
  userRole: "ADMIN" | "SUPER_ADMIN";
  userDivisionName: string;
}

export default function ReportsClient({
  rows,
  periods,
  activePeriodKey,
  periodLabel,
  activeDivision,
  divisionNames,
  userRole,
  userDivisionName,
}: ReportsClientProps) {
  const router = useRouter();

  const divisionText =
    userRole === "SUPER_ADMIN"
      ? activeDivision === "semua"
        ? "seluruh divisi instansi"
        : `divisi ${activeDivision}`
      : `divisi ${userDivisionName}`;

  // Ringkasan periode dihitung dari baris yang tampil agar selalu
  // sama dengan tabel pratinjau (§7.1: satu rumus untuk semua tampilan).
  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          totalAssignments: acc.totalAssignments + r.totalAssignments,
          completed: acc.completed + r.completed,
          onTime: acc.onTime + r.onTime,
          overdue: acc.overdue + r.overdue,
          finalDocuments: acc.finalDocuments + r.finalDocuments,
          cancelled: acc.cancelled + r.cancelled,
        }),
        {
          totalAssignments: 0,
          completed: 0,
          onTime: 0,
          overdue: 0,
          finalDocuments: 0,
          cancelled: 0,
        },
      ),
    [rows],
  );

  const firstPeriodKey = periods[0]?.key ?? "";
  const hasActiveFilters = activePeriodKey !== firstPeriodKey || activeDivision !== "semua";

  function updateParams(next: { periode?: string; divisi?: string }) {
    const params = new URLSearchParams();
    const periode = next.periode ?? activePeriodKey;
    const divisi = next.divisi ?? activeDivision;
    if (periode && periode !== firstPeriodKey) params.set("periode", periode);
    if (userRole === "SUPER_ADMIN" && divisi && divisi !== "semua") {
      params.set("divisi", divisi);
    }
    const query = params.toString();
    router.push(query ? `/reports?${query}` : "/reports");
  }

  const resetFilters = () => {
    router.push("/reports");
  };

  const exportHref = `/api/reports/export?periode=${encodeURIComponent(activePeriodKey)}${
    activeDivision !== "semua" ? `&divisi=${encodeURIComponent(activeDivision)}` : ""
  }`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman (Disembunyikan saat cetak kertas) */}
      <div className="print:hidden">
        <h1 className="text-h1 font-semibold text-ink">Laporan &amp; Ekspor</h1>
        <p className="mt-1 text-body text-ink-3">
          Periode {periodLabel}, {divisionText}. Angka dihitung dari tugas yang dibuat dalam
          periode ini.
        </p>
      </div>

      {/* Baris Filter Laporan (Disembunyikan saat cetak kertas) */}
      <div className="card p-3 flex flex-wrap items-center gap-3 bg-surface print:hidden">
        {/* Pemilih Periode */}
        <select
          value={activePeriodKey}
          onChange={(e) => updateParams({ periode: e.target.value })}
          aria-label="Pilih rentang periode"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          {periods.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Pemilih Divisi */}
        {userRole === "SUPER_ADMIN" ? (
          <select
            value={activeDivision}
            onChange={(e) => updateParams({ divisi: e.target.value })}
            aria-label="Filter divisi laporan"
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          >
            <option value="semua">Divisi: Semua</option>
            {divisionNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <div className="h-8 rounded-md border border-border bg-neutral-surface px-3 flex items-center text-body-sm text-ink-2">
            <span>Divisi: {userDivisionName}</span>
          </div>
        )}

        {/* Hapus Filter */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-body-sm font-medium text-ink-2 hover:text-ink hover:underline"
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
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1 tabular-nums">
                  {summary.totalAssignments}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Selesai</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1 tabular-nums">
                  {summary.completed}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Tepat Waktu</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1 tabular-nums">
                  {summary.onTime}
                </span>
                <span className="text-body-sm text-ink-3">
                  dari {summary.completed} selesai
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Terlambat</span>
                <span className="font-display-kpi text-[28px] font-semibold text-error mt-1 tabular-nums">
                  {summary.overdue}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Dokumen Final</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1 tabular-nums">
                  {summary.finalDocuments}
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
                <a
                  href={exportHref}
                  className="inline-flex flex-1 h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-body font-semibold text-on-dark transition-colors hover:bg-primary-hover active:bg-primary-active shadow-sm"
                >
                  <Icon name="unduh" size={15} />
                  Ekspor CSV
                </a>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink hover:bg-neutral-surface active:bg-border transition-colors"
                >
                  Cetak / PDF
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-body-sm text-ink-3 border-t border-border pt-3 space-y-1">
            <p>Berkas CSV memakai pemisah titik koma dan terbuka di Excel.</p>
            <p>Format XLSX menyusul pada Sprint 5.</p>
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
              {summary.totalAssignments} penugasan pada {rows.length} divisi
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
                    <td className="py-3 text-right font-mono text-body text-ink tabular-nums">
                      {row.totalAssignments}
                    </td>
                    <td className="py-3 text-right font-mono text-body text-ink tabular-nums">
                      {row.completed}
                    </td>
                    <td className="py-3 text-right font-mono text-body font-semibold text-error tabular-nums">
                      {row.overdue}
                    </td>
                    <td className="py-3 text-right font-mono text-body text-ink tabular-nums">
                      {row.finalDocuments}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border pt-3 text-body-sm text-ink-3 space-y-1 print:hidden">
            <p className="text-ink-2 font-medium">
              Ekspor memakai filter yang sama dengan layar ini.
            </p>
            <p>Kepala laporan memuat daftar filter yang sedang aktif.</p>
            {summary.cancelled > 0 ? (
              <p>
                {summary.cancelled} penugasan berstatus Dibatalkan dikeluarkan dari hitungan
                di atas.
              </p>
            ) : null}
          </div>
        </div>

        {/* Kolom Kanan: Pratinjau Lembar Cetak A4 (4 Kolom) */}
        <div className="card p-6 flex flex-col gap-4 desktop:col-span-4 print:hidden">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-h2 font-semibold text-ink">Tampilan Cetak A4</h2>
            <span className="text-body-sm font-mono text-ink-3">A4 Portrait</span>
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
                Filter: {divisionText}
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
            Sidebar, tombol, dan filter disembunyikan otomatis saat mencetak lewat fitur cetak
            peramban.
          </p>
        </div>
      </div>
    </div>
  );
}
