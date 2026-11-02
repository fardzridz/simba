"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/app/icons";
import type { ReportDivisionRow, ReportPeriod, ReportView } from "@/db/queries/reports";

export type Role = "ADMIN" | "SUPER_ADMIN";

export type ReportsFilterState = {
  period: ReportPeriod;
  /** null berarti semua divisi (Super Admin); Admin terikat divisinya sendiri. */
  divisionId: string | null;
  status: string;
  categoryId: string;
};

export interface ReportsClientProps {
  role: Role;
  report: ReportView;
  filters: ReportsFilterState;
  periodOptions: { id: ReportPeriod; label: string }[];
  divisionOptions: { id: string; name: string }[];
  categoryOptions: { id: string; name: string }[];
  ownDivisionName: string;
}

const DEFAULT_PERIOD: ReportPeriod = "bulan_ini";

/** Susun URL laporan dari filter; default tidak dikirim agar bersih. */
function buildReportsUrl(state: ReportsFilterState, forExport: boolean): string {
  const params = new URLSearchParams();
  if (state.period !== DEFAULT_PERIOD) params.set("period", state.period);
  if (forExport) params.set("period", state.period);
  if (state.divisionId) params.set("divisi", state.divisionId);
  if (state.status) params.set("status", state.status);
  if (state.categoryId) params.set("kategori", state.categoryId);
  const qs = params.toString();
  return `${forExport ? "/reports/export" : "/reports"}${qs ? `?${qs}` : ""}`;
}

export default function ReportsClient({
  role,
  report,
  filters,
  periodOptions,
  divisionOptions,
  categoryOptions,
  ownDivisionName,
}: ReportsClientProps) {
  const router = useRouter();

  const current: ReportsFilterState = {
    period: filters.period,
    divisionId: filters.divisionId,
    status: filters.status ?? "",
    categoryId: filters.categoryId ?? "",
  };

  const update = (patch: Partial<ReportsFilterState>) => {
    router.push(buildReportsUrl({ ...current, ...patch }, false));
  };

  const hasActiveFilters = Boolean(
    current.period !== DEFAULT_PERIOD ||
      current.status ||
      current.categoryId ||
      (role === "SUPER_ADMIN" && current.divisionId),
  );

  const resetFilters = () => {
    router.push(
      buildReportsUrl(
        {
          period: DEFAULT_PERIOD,
          divisionId: role === "SUPER_ADMIN" ? null : current.divisionId,
          status: "",
          categoryId: "",
        },
        false,
      ),
    );
  };

  const rows: ReportDivisionRow[] = report.rows;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman (Disembunyikan saat cetak kertas) */}
      <div className="print:hidden">
        <h1 className="text-h1 font-semibold text-ink">Laporan &amp; Ekspor</h1>
        <p className="mt-1 text-body text-ink-3">
          Periode {report.rangeLabel},{" "}
          {role === "SUPER_ADMIN"
            ? current.divisionId
              ? `divisi ${report.scopeLabels.division}.`
              : "seluruh divisi instansi."
            : `divisi ${ownDivisionName}.`}
        </p>
      </div>

      {/* Baris Filter Laporan (Disembunyikan saat cetak kertas) */}
      <div className="card p-3 flex flex-wrap items-center gap-3 bg-surface print:hidden">
        {/* Pemilih Periode */}
        <select
          value={current.period}
          onChange={(e) => update({ period: e.target.value as ReportPeriod })}
          aria-label="Pilih rentang periode"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          {periodOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Pemilih Divisi */}
        {role === "SUPER_ADMIN" ? (
          <select
            value={current.divisionId ?? ""}
            onChange={(e) => update({ divisionId: e.target.value || null })}
            aria-label="Filter divisi laporan"
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          >
            <option value="">Divisi: Semua</option>
            {divisionOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="h-8 rounded-md border border-border bg-neutral-surface px-3 flex items-center text-body-sm text-ink-2">
            <span>Divisi: {ownDivisionName}</span>
          </div>
        )}

        {/* Pemilih Status */}
        <select
          value={current.status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label="Filter status laporan"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="">Status: semua</option>
          <option value="SELESAI">Selesai</option>
          <option value="MENUNGGU_VERIFIKASI">Menunggu Verifikasi</option>
          <option value="SEDANG_DIKERJAKAN">Sedang Dikerjakan</option>
          <option value="BELUM_DIKERJAKAN">Belum Dikerjakan</option>
        </select>

        {/* Pemilih Kategori */}
        <select
          value={current.categoryId}
          onChange={(e) => update({ categoryId: e.target.value })}
          aria-label="Filter kategori laporan"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="">Kategori: semua</option>
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
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
                  {report.summary.totalAssignments}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Selesai</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1">
                  {report.summary.completed}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Tepat Waktu</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1">
                  {report.summary.onTime}
                </span>
                <span className="text-[11px] text-ink-3">
                  dari {report.summary.completed} selesai
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Terlambat</span>
                <span className="font-display-kpi text-[28px] font-semibold text-error mt-1">
                  {report.summary.overdue}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-body-sm text-ink-3">Dokumen Final</span>
                <span className="font-display-kpi text-[28px] font-semibold text-ink mt-1">
                  {report.summary.finalDocuments}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-body-sm text-ink-3 border-t border-border pt-3">
            Angka dihitung dari database {report.periodLabel.toLowerCase()} ({report.rangeLabel}); ekspor memakai rumus yang sama.
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
                  href={buildReportsUrl(current, true)}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-body font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm"
                >
                  <Icon name="unduh" size={16} />
                  Ekspor CSV
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink hover:bg-neutral-surface active:bg-border transition-colors"
                >
                  Cetak / PDF
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-body-sm text-ink-3 border-t border-border pt-3 space-y-1">
            <p>
              CSV menyajikan angka yang identik dengan angka di layar untuk filter aktif ini.
            </p>
            <p>Baris pertama berkas memuat periode dan daftar filter aktif.</p>
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
              {rows.length} divisi ditampilkan dari {report.summary.totalAssignments} penugasan
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
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-body-sm text-ink-3">
                      0 penugasan pada periode ini.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border pt-3 text-body-sm text-ink-3 space-y-1 print:hidden">
            <p className="text-ink-2 font-medium">
              Hasil ekspor identik dengan filter di layar.
            </p>
            <p>
              {report.summary.cancelled} penugasan berstatus Dibatalkan dikeluarkan dari penyebut progres.
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
              <p className="text-ink-3 text-[11px]">Periode: {report.rangeLabel}</p>
              <p className="text-[10px] text-ink-3 mt-0.5">
                Filter: {report.scopeLabels.division}, {report.scopeLabels.status.toLowerCase()}, {report.scopeLabels.category.toLowerCase()}
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
              <span className="font-semibold">{role === "SUPER_ADMIN" ? "Kepala Instansi" : "Kepala Divisi"}</span>
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
