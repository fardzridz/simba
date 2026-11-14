"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Icon } from "@/app/icons";
import {
  REPORT_DATE_BASES,
  REPORT_PAGE_SIZES,
  REPORT_STATUS_OPTIONS,
  type ReportDateBasis,
  type ReportPageSize,
  type ReportPeriod,
  type ReportRowsResult,
} from "@/db/queries/reports";
import {
  DEFAULT_DATE_BASIS,
  DEFAULT_PERIOD,
  buildExportHref,
  buildPrintHref,
  buildReportsUrl,
  describeScope,
  pageItems,
  type ReportsFilterState,
  type ReportsPaging,
} from "./report-actions";
import ReportTable from "./report-table";

export type Role = "ADMIN" | "SUPER_ADMIN";
export type { ReportsFilterState };

export interface ReportsClientProps {
  role: Role;
  report: ReportRowsResult;
  filters: ReportsFilterState;
  paging: ReportsPaging;
  periodOptions: { id: ReportPeriod; label: string }[];
  divisionOptions: { id: string; name: string }[];
  categoryOptions: { id: string; name: string }[];
  staffOptions: { id: string; name: string }[];
}

const CONTROL =
  "h-9 w-full rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light";

/** Label kecil di atas kontrol filter. */
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="label text-ink-3">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Tombol sekunder yang dipakai ketiga tombol ekspor dan cetak. */
const SECONDARY =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 text-body-sm font-semibold text-ink transition-colors hover:bg-neutral-surface active:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light";

export default function ReportsClient({
  role,
  report,
  filters,
  paging,
  periodOptions,
  divisionOptions,
  categoryOptions,
  staffOptions,
}: ReportsClientProps) {
  const router = useRouter();
  const statusId = useId();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const current: ReportsFilterState = {
    period: filters.period,
    divisionId: filters.divisionId,
    status: filters.status ?? "",
    categoryId: filters.categoryId ?? "",
    userId: filters.userId ?? "",
    dateBasis: filters.dateBasis,
    dateFrom: filters.dateFrom ?? "",
    dateTo: filters.dateTo ?? "",
  };

  const go = (patch: Partial<ReportsFilterState>, nextPage = 1) => {
    const merged = { ...current, ...patch };
    // Setiap perubahan filter kembali ke halaman 1. Tanpa ini, pengguna yang
    // sedang di halaman 5 lalu mempersempit filter akan melihat halaman kosong
    // padahal hasilnya ada di halaman 1.
    router.push(
      buildReportsUrl(merged, { page: nextPage, pageSize: paging.pageSize }, false),
    );
  };

  const hasActiveFilters = Boolean(
    current.period !== DEFAULT_PERIOD ||
      current.status ||
      current.categoryId ||
      current.userId ||
      current.dateBasis !== DEFAULT_DATE_BASIS ||
      current.dateFrom ||
      current.dateTo ||
      (role === "SUPER_ADMIN" && current.divisionId),
  );

  const resetFilters = () => {
    setStatusMessage("Filter dikembalikan ke awal.");
    router.push(
      buildReportsUrl(
        {
          period: DEFAULT_PERIOD,
          divisionId: role === "SUPER_ADMIN" ? null : current.divisionId,
          status: "",
          categoryId: "",
          userId: "",
          dateBasis: DEFAULT_DATE_BASIS,
          dateFrom: "",
          dateTo: "",
        },
        { page: 1, pageSize: paging.pageSize },
        false,
      ),
    );
  };

  const exportCsv = buildExportHref(current, paging, "csv");
  const exportXlsx = buildExportHref(current, paging, "xlsx");
  const printHref = buildPrintHref(current, paging);
  const rows = report.rows;
  const firstRow = report.total === 0 ? 0 : (report.page - 1) * report.pageSize + 1;
  const lastRow = Math.min(report.page * report.pageSize, report.total);

  return (
    <div className="flex flex-col gap-4">
      {/* Judul halaman */}
      <div>
        <h1 className="text-h1 font-semibold text-ink">Laporan &amp; Ekspor</h1>
        <p className="mt-1 text-body text-ink-3">
          {describeScope({
            rangeLabel: report.rangeLabel,
            divisionName: report.scopeLabels.division,
            statusLabel: report.scopeLabels.status,
            categoryLabel: report.scopeLabels.category,
            staffLabel: report.scopeLabels.staff,
          })}
        </p>
      </div>

      {/* Baris filter */}
      <section
        aria-labelledby={`${statusId}-filter`}
        className="card flex flex-col gap-3 p-4 print:hidden"
      >
        <h2 id={`${statusId}-filter`} className="sr-only">
          Filter laporan
        </h2>

        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-4">
          <Field label="Periode" htmlFor={`${statusId}-period`}>
            <select
              id={`${statusId}-period`}
              value={current.period}
              onChange={(e) => go({ period: e.target.value as ReportPeriod })}
              className={CONTROL}
            >
              {periodOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Acuan tanggal" htmlFor={`${statusId}-basis`}>
            <select
              id={`${statusId}-basis`}
              value={current.dateBasis}
              onChange={(e) => go({ dateBasis: e.target.value as ReportDateBasis })}
              className={CONTROL}
            >
              {REPORT_DATE_BASES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tanggal mulai" htmlFor={`${statusId}-from`}>
            <input
              id={`${statusId}-from`}
              type="date"
              value={current.dateFrom}
              onChange={(e) => go({ dateFrom: e.target.value })}
              className={CONTROL}
            />
          </Field>

          <Field label="Tanggal selesai" htmlFor={`${statusId}-to`}>
            <input
              id={`${statusId}-to`}
              type="date"
              // Nilai dikendalikan sepenuhnya oleh state: kolom ini tidak boleh
              // menampilkan tanggal hari ini saat nilainya masih kosong, karena
              // pengguna akan mengira tanggal itu berlaku untuk laporannya.
              value={current.dateTo}
              onChange={(e) => go({ dateTo: e.target.value })}
              className={CONTROL}
            />
          </Field>

          <Field label="Divisi" htmlFor={`${statusId}-division`}>
            {role === "SUPER_ADMIN" ? (
              <select
                id={`${statusId}-division`}
                value={current.divisionId ?? ""}
                onChange={(e) => go({ divisionId: e.target.value || null, userId: "" })}
                className={CONTROL}
              >
                <option value="">Semua divisi</option>
                {divisionOptions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="flex h-9 items-center rounded-md border border-border bg-neutral-surface px-2.5 text-body-sm text-ink-2">
                {report.scopeLabels.division}
              </p>
            )}
          </Field>

          <Field label="Petugas" htmlFor={`${statusId}-staff`}>
            <select
              id={`${statusId}-staff`}
              value={current.userId}
              onChange={(e) => go({ userId: e.target.value })}
              className={CONTROL}
            >
              <option value="">Semua petugas</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" htmlFor={`${statusId}-status`}>
            <select
              id={`${statusId}-status`}
              value={current.status}
              onChange={(e) => go({ status: e.target.value })}
              className={CONTROL}
            >
              <option value="">Semua status</option>
              {REPORT_STATUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kategori" htmlFor={`${statusId}-category`}>
            <select
              id={`${statusId}-category`}
              value={current.categoryId}
              onChange={(e) => go({ categoryId: e.target.value })}
              className={CONTROL}
            >
              <option value="">Semua kategori</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Alasan rentang tanggal tidak diterapkan, bukan dibiarkan diam-diam */}
        {report.rangeIssue ? (
          <p
            role="status"
            className="rounded-md bg-warning-surface px-3 py-2 text-body-sm text-warning"
          >
            {report.rangeIssue === "partial"
              ? "Rentang tanggal belum lengkap. Isi tanggal mulai dan tanggal selesai; selama salah satu kosong, laporan memakai periode preset di atas."
              : "Tanggal mulai melewati tanggal selesai, jadi rentang ini tidak dipakai. Laporan memakai periode preset di atas."}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="text-body-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              Hapus filter
            </button>
          ) : (
            <span className="text-body-sm text-ink-3">
              {report.dateBasisLabel === "Tanggal selesai"
                ? "Menampilkan tugas yang selesai pada rentang ini."
                : `Menampilkan tugas menurut ${report.dateBasisLabel.toLowerCase()}.`}
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/*
              Tautan, bukan tombol: tidak ada lagi yang perlu diperiksa sebelum
              mengunduh. `download` dipakai agar peramban tidak menavigasi
              halaman saat berkas disajikan.
            */}
            <a
              href={exportCsv}
              download
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-body-sm font-semibold text-on-dark shadow-sm transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              <Icon name="unduh" size={16} />
              Ekspor CSV
            </a>
            <a href={exportXlsx} download className={SECONDARY}>
              <Icon name="unduh" size={16} />
              Ekspor Excel
            </a>
            {/*
              Cetak membuka halaman tersendiri, bukan `window.print()` di sini.
              Halaman ini hanya memuat satu halaman data (25 baris); mencetaknya
              langsung akan menghasilkan laporan terpotong tanpa peringatan.
            */}
            <a href={printHref} target="_blank" rel="noopener" className={SECONDARY}>
              <Icon name="lihat" size={16} />
              Cetak / PDF
            </a>
          </div>
        </div>

        <p className="text-body-sm text-ink-3">
          Ketiga tombol memakai filter yang sedang aktif dan memuat seluruh{" "}
          <span className="tabular-nums">{report.summary.total}</span> baris hasil
          filter, bukan hanya halaman ini.
        </p>
      </section>

      {statusMessage ? (
        <p role="status" className="text-body-sm text-ink-2">
          {statusMessage}
        </p>
      ) : null}

      {/* Tabel */}
      <section aria-labelledby={`${statusId}-table`} className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3">
          <h2 id={`${statusId}-table`} className="text-h2 font-semibold text-ink">
            Daftar Penugasan
          </h2>
          <p className="text-body-sm text-ink-3">
            <span className="tabular-nums">{report.summary.total}</span> baris
            <span aria-hidden="true"> · </span>
            selesai <span className="tabular-nums">{report.summary.completed}</span>
            <span aria-hidden="true"> · </span>
            terlambat <span className="tabular-nums">{report.summary.late}</span>
            <span aria-hidden="true"> · </span>
            lewat tenggat <span className="tabular-nums">{report.summary.overdue}</span>
          </p>
        </div>

        {/*
          Peringatan ini hanya muncul saat dicetak. Halaman layar memuat satu
          halaman data (25 baris); mencetaknya langsung lewat Ctrl+P akan
          menghasilkan laporan terpotong tanpa satu pun tanda. Menyebutkannya
          lebih baik daripada membiarkan pengguna mengira laporannya lengkap.
        */}
        <p className="hidden bg-warning-surface px-4 py-2 text-body-sm text-warning print:block">
          Halaman ini hanya memuat {rows.length} dari {report.total} penugasan.
          Untuk mencetak seluruh hasil filter, tutup dialog cetak lalu tekan
          tombol &quot;Cetak / PDF&quot;.
        </p>

        <div className="overflow-x-auto">
          <ReportTable
            rows={rows}
            startNumber={firstRow}
            linked
            emptyMessage="Tidak ada penugasan yang cocok dengan filter ini."
            emptyAction={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-semibold text-primary hover:underline"
                >
                  Hapus filter
                </button>
              ) : null
            }
          />
        </div>

        {/* Paginasi */}
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 print:hidden">
          <p className="text-body-sm text-ink-3">
            Menampilkan <span className="tabular-nums">{firstRow}</span> sampai{" "}
            <span className="tabular-nums">{lastRow}</span> dari{" "}
            <span className="tabular-nums">{report.total}</span> penugasan
          </p>

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor={`${statusId}-pagesize`} className="label text-ink-3">
              Per halaman
            </label>
            <select
              id={`${statusId}-pagesize`}
              value={paging.pageSize}
              onChange={(e) =>
                router.push(
                  buildReportsUrl(
                    current,
                    { page: 1, pageSize: Number(e.target.value) as ReportPageSize },
                    false,
                  ),
                )
              }
              className="h-8 rounded-md border border-border bg-surface px-2 text-body-sm text-ink"
            >
              {REPORT_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>

            <nav aria-label="Halaman laporan" className="flex items-center gap-1">
              <button
                type="button"
                disabled={report.page <= 1}
                onClick={() =>
                  router.push(
                    buildReportsUrl(
                      current,
                      { page: report.page - 1, pageSize: paging.pageSize },
                      false,
                    ),
                  )
                }
                className="h-8 rounded-md border border-border px-2 text-body-sm text-ink hover:bg-neutral-surface disabled:opacity-40"
              >
                Sebelumnya
              </button>
              {pageItems(report.page, report.totalPages).map((item, index) =>
                item === "gap" ? (
                  <span key={`gap-${index}`} className="px-1 text-body-sm text-ink-3">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    aria-current={item === report.page ? "page" : undefined}
                    onClick={() =>
                      router.push(
                        buildReportsUrl(
                          current,
                          { page: item, pageSize: paging.pageSize },
                          false,
                        ),
                      )
                    }
                    className={
                      item === report.page
                        ? "h-8 min-w-8 rounded-md bg-primary px-2 text-body-sm font-semibold tabular-nums text-on-dark"
                        : "h-8 min-w-8 rounded-md border border-border px-2 text-body-sm tabular-nums text-ink hover:bg-neutral-surface"
                    }
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={report.page >= report.totalPages}
                onClick={() =>
                  router.push(
                    buildReportsUrl(
                      current,
                      { page: report.page + 1, pageSize: paging.pageSize },
                      false,
                    ),
                  )
                }
                className="h-8 rounded-md border border-border px-2 text-body-sm text-ink hover:bg-neutral-surface disabled:opacity-40"
              >
                Berikutnya
              </button>
            </nav>
          </div>
        </div>
      </section>
    </div>
  );
}
