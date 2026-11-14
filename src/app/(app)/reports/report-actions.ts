import type {
  ReportDateBasis,
  ReportPageSize,
  ReportPeriod,
} from "@/db/queries/reports";
import { REPORT_DEFAULT_PAGE_SIZE } from "@/db/queries/reports";

/**
 * Logika murni halaman laporan: penyusunan URL untuk layar, urutan halaman, dan
 * tautan ekspor.
 *
 * Dipisahkan dari komponen supaya dapat diuji tanpa DOM. Yang dikunci di sini
 * adalah satu janji yang mudah rusak tanpa terlihat: filter yang tampil di layar
 * dan filter yang dipakai berkas ekspor harus berasal dari keadaan yang sama.
 */

export const DEFAULT_PERIOD: ReportPeriod = "bulan_ini";
export const DEFAULT_DATE_BASIS: ReportDateBasis = "selesai";

export type ReportsFilterState = {
  period: ReportPeriod;
  /** null berarti semua divisi (Super Admin); Admin terikat divisinya sendiri. */
  divisionId: string | null;
  status: string;
  categoryId: string;
  userId: string;
  dateBasis: ReportDateBasis;
  dateFrom: string;
  dateTo: string;
};

export type ReportsPaging = {
  page: number;
  pageSize: ReportPageSize;
};

/**
 * Parameter query bersama untuk layar, ekspor, dan cetak.
 *
 * Satu penyusun dipakai ketiganya supaya tidak mungkin ada filter yang ikut ke
 * layar tetapi tertinggal saat diekspor. `forFile` membuang parameter halaman:
 * berkas unduhan dan hasil cetak selalu memuat SELURUH baris hasil filter.
 */
function reportParams(state: ReportsFilterState, paging: ReportsPaging, forFile: boolean): string {
  const params = new URLSearchParams();
  // Berkas dan hasil cetak selalu membawa periode secara eksplisit: isinya tidak
  // boleh bergantung pada nilai default yang bisa berubah di kemudian hari.
  if (forFile || state.period !== DEFAULT_PERIOD) {
    params.set("period", state.period);
  }
  if (state.divisionId) params.set("divisi", state.divisionId);
  if (state.status) params.set("status", state.status);
  if (state.categoryId) params.set("kategori", state.categoryId);
  if (state.userId) params.set("petugas", state.userId);
  if (forFile || state.dateBasis !== DEFAULT_DATE_BASIS) {
    params.set("acuan", state.dateBasis);
  }
  if (state.dateFrom) params.set("dateFrom", state.dateFrom);
  if (state.dateTo) params.set("dateTo", state.dateTo);

  if (!forFile) {
    if (paging.page > 1) params.set("page", String(paging.page));
    if (paging.pageSize !== REPORT_DEFAULT_PAGE_SIZE) {
      params.set("perPage", String(paging.pageSize));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Susun URL halaman layar.
 *
 * Hanya untuk halaman layar. URL ekspor dan cetak disusun fungsi tersendiri
 * supaya tidak mungkin ada pemanggil yang mengira `forExport` mengubah tujuan
 * menjadi rute berkas, padahal yang berubah hanyalah parameter halaman.
 */
export function buildReportsUrl(
  state: ReportsFilterState,
  paging: ReportsPaging,
  forExport: boolean,
): string {
  return `/reports${reportParams(state, paging, forExport)}`;
}

/** Jenis berkas yang dapat diunduh dari halaman laporan. */
export type ReportExportFormat = "csv" | "xlsx";

/**
 * Tautan unduhan untuk format tertentu. Parameter `format` hanya dikirim untuk
 * Excel; CSV adalah bentuk bawaan sehingga URL-nya tetap bersih.
 */
export function buildExportHref(
  state: ReportsFilterState,
  paging: ReportsPaging,
  format: ReportExportFormat,
): string {
  const qs = reportParams(state, paging, true);
  if (format === "csv") return `/reports/export${qs}`;
  const separator = qs ? "&" : "?";
  return `/reports/export${qs}${separator}format=xlsx`;
}

/**
 * Tautan halaman cetak.
 *
 * Cetak TIDAK memakai `window.print()` pada halaman layar. Halaman layar hanya
 * memuat satu halaman data (25 baris), sehingga mencetaknya akan menghasilkan
 * laporan yang terpotong tanpa satu pun peringatan. Rute cetak memuat seluruh
 * baris hasil filter, sama seperti ekspor.
 */
export function buildPrintHref(
  state: ReportsFilterState,
  paging: ReportsPaging,
): string {
  return `/reports/print${reportParams(state, paging, true)}`;
}

/**
 * Tautan kembali dari halaman cetak ke halaman layar.
 *
 * Membawa filter yang sama tanpa parameter halaman, supaya pengguna tidak
 * kehilangan konteks setelah menutup halaman cetak, dan mendarat di halaman 1
 * hasil filter tersebut.
 *
 * Tanggal mentah diambil dari parameter asli, bukan dari `filters`, karena
 * `filters` menyimpan batas hari dalam epoch dan mengubahnya kembali ke
 * YYYY-MM-DD berisiko menggeser tanggal satu hari.
 */
export function buildBackHref(
  filters: {
    period: ReportPeriod;
    divisionId: string | null;
    status: string | null;
    categoryId: string | null;
    userId: string | null;
    dateBasis: ReportDateBasis;
  },
  raw: { dateFrom?: string; dateTo?: string },
): string {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  params.set("acuan", filters.dateBasis);
  if (filters.divisionId) params.set("divisi", filters.divisionId);
  if (filters.status) params.set("status", filters.status);
  if (filters.categoryId) params.set("kategori", filters.categoryId);
  if (filters.userId) params.set("petugas", filters.userId);
  if (raw.dateFrom) params.set("dateFrom", raw.dateFrom);
  if (raw.dateTo) params.set("dateTo", raw.dateTo);
  return `/reports?${params.toString()}`;
}

/**
 * Judul halaman yang menyebut apa yang sedang dilihat, tanpa mengulang seluruh
 * filter. Dipakai sebagai teks di bawah judul halaman.
 */
export function describeScope(input: {
  rangeLabel: string;
  divisionName: string;
  statusLabel: string;
  categoryLabel: string;
  staffLabel: string;
}): string {
  const parts = [input.rangeLabel, input.divisionName];
  if (input.statusLabel !== "Semua status") parts.push(input.statusLabel);
  if (input.categoryLabel !== "Semua kategori") parts.push(input.categoryLabel);
  if (input.staffLabel !== "Semua petugas") parts.push(input.staffLabel);
  return parts.join(" · ");
}

/** Jumlah halaman yang ditampilkan di kontrol paginasi, termasuk elipsis. */
export function pageItems(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const items: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("gap");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("gap");
  items.push(totalPages);
  return items;
}
