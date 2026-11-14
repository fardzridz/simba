import type { ReportRow, ReportRowsResult } from "@/db/queries/reports";

/**
 * Berkas CSV laporan penugasan.
 *
 * Isi berkas memakai `REPORT_COLUMNS` yang sama dengan tabel layar, sehingga
 * kolom yang diunduh tidak mungkin berbeda dari kolom yang dilihat.
 */

/** Seluruh CSV memakai tanda koma; nilai berisi koma dikelilingi kutip ganda. */
export function csvField(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export function buildReportCsv(input: {
  report: ReportRowsResult;
  rows: ReportRow[];
  headers: string[];
  valuesOf: (row: ReportRow, index: number) => string[];
}): string {
  const { report, rows, headers, valuesOf } = input;

  const lines: string[] = [
    "LAPORAN PENUGASAN",
    `Periode,${csvField(report.isCustomRange ? `Tanggal kustom (${report.rangeLabel})` : `${report.periodLabel} (${report.rangeLabel})`)}`,
    `Acuan tanggal,${csvField(report.dateBasisLabel)}`,
    `Divisi,${csvField(report.scopeLabels.division)}`,
    `Status,${csvField(report.scopeLabels.status)}`,
    `Kategori,${csvField(report.scopeLabels.category)}`,
    `Petugas,${csvField(report.scopeLabels.staff)}`,
    "",
    "Ringkasan (satuan: penugasan)",
    `Total,${report.summary.total}`,
    `Selesai,${report.summary.completed}`,
    `Terlambat (selesai melewati tenggat),${report.summary.late}`,
    `Belum selesai dan lewat tenggat,${report.summary.overdue}`,
    `Dibatalkan,${report.summary.cancelled}`,
    `Dokumen terarsip,${report.summary.archived}`,
    "",
    "Daftar penugasan",
    headers.map(csvField).join(","),
  ];

  rows.forEach((row, index) => {
    lines.push(valuesOf(row, index).map(csvField).join(","));
  });

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
