import {
  getReportExport,
  readReportFilters,
} from "@/db/queries/reports";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import { buildReportCsv } from "@/lib/report-csv";
import { REPORT_HEADERS, reportRowValues } from "@/lib/report-row-format";
import { buildXlsx, safeSheetName } from "@/lib/xlsx-writer";
import { jakartaDateInput, nowSeconds } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Ekspor laporan penugasan.
 *
 * Berkas SELALU memuat seluruh baris hasil filter, bukan hanya halaman yang
 * sedang dilihat di layar. Kueri, filter, dan urutannya sama dengan layar,
 * sehingga "yang terlihat itulah yang diekspor" berlaku dalam arti: kolom dan
 * isinya identik, dan tidak ada baris yang hilang tanpa disadari.
 *
 * Format: `csv` (bawaan) dan `xlsx` lewat parameter `format`.
 */

/** Batas baris ekspor, untuk mencegah berkas raksasa menghabiskan memori Worker. */
const MAX_EXPORT_ROWS = 20_000;

export async function GET(request: Request) {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  // Staf pelaksana tidak boleh membuka laporan, termasuk bentuk ekspornya.
  if (scope.role === "USER") {
    return new Response("Akses laporan ditolak untuk staf pelaksana.", { status: 403 });
  }

  const url = new URL(request.url);
  const filters = readReportFilters(url.searchParams, scope);
  const { db } = appContext();

  // Seluruh baris hasil filter dimuat dalam SATU kueri, bukan per halaman:
  // 5.000 baris dengan cara per halaman berarti 50 kueri dan 50 kali
  // penghitungan ringkasan yang hasilnya dibuang.
  const report = await getReportExport(db, scope, filters, MAX_EXPORT_ROWS);
  const rows = report.rows;

  const truncated = report.total > MAX_EXPORT_ROWS;
  const filenameBase = report.isCustomRange
    ? `laporan-penugasan-custom-${jakartaDateInput(nowSeconds())}`
    : `laporan-penugasan-${report.period}`;

  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  if (format === "xlsx") {
    // Susunan baris sengaja dibuat PENDEK: judul, ringkasan mendatar, satu baris
    // keterangan filter, lalu tabel data.
    //
    // Versi sebelumnya menaruh 15 baris keterangan vertikal (label di kolom A,
    // nilai di kolom B) sebelum tabel dimulai di baris 17. Akibatnya, saat berkas
    // dibuka yang terlihat pertama hanyalah dua kolom berisi teks — tabelnya
    // sendiri berada jauh di bawah. Ringkasan sekarang disusun mendatar dan
    // keterangan filter digabung jadi satu baris, sehingga kepala tabel ada di
    // baris ke-6 dan langsung terlihat.
    const TITLE_ROW = 0;
    const SUMMARY_LABEL_ROW = 1;
    const SUMMARY_VALUE_ROW = 2;
    const FILTER_ROW = 3;
    const TABLE_HEADER_ROW = 5;

    // Ringkasan mendatar: label di satu baris, angkanya tepat di bawahnya.
    // Susunan ini muat dalam 6 kolom dan terbaca sebagai tabel kecil, bukan
    // sebagai teks lepas.
    const summaryLabels: (string | number)[] = [
      "Total",
      "Selesai",
      "Terlambat",
      "Lewat tenggat",
      "Dibatalkan",
      "Terarsip",
    ];
    const summaryValues: (string | number)[] = [
      report.summary.total,
      report.summary.completed,
      report.summary.late,
      report.summary.overdue,
      report.summary.cancelled,
      report.summary.archived,
    ];

    // Keterangan filter digabung satu baris selebar tabel. Label "Terlambat"
    // dan "Lewat tenggat" di ringkasan atas perlu penjelasan, jadi keduanya
    // disebut di sini.
    const filterLine = [
      `Periode: ${report.isCustomRange ? `tanggal kustom (${report.rangeLabel})` : `${report.periodLabel} (${report.rangeLabel})`}`,
      `Acuan tanggal: ${report.dateBasisLabel}`,
      `Divisi: ${report.scopeLabels.division}`,
      `Status: ${report.scopeLabels.status}`,
      `Kategori: ${report.scopeLabels.category}`,
      `Petugas: ${report.scopeLabels.staff}`,
      "Terlambat = selesai melewati tenggat; Lewat tenggat = belum selesai dan tenggat sudah lewat.",
    ].join("  ·  ");

    const sheetRows: (string | number)[][] = [
      ["LAPORAN PENUGASAN"],
      summaryLabels,
      summaryValues,
      [filterLine],
      [],
      REPORT_HEADERS,
      ...rows.map((row, index) => reportRowValues(row, index)),
    ];

    const bytes = buildXlsx({
      sheetName: safeSheetName("Laporan Penugasan"),
      rows: sheetRows,
      // Hanya judul yang ditebalkan tanpa garis.
      headerRows: 1,
      // Garis untuk tabel data dan blok ringkasan; judul & keterangan tetap bersih.
      tableHeaderRow: TABLE_HEADER_ROW,
      summaryHeaderRow: SUMMARY_LABEL_ROW,
      summaryRows: 2,
      // Judul dan baris keterangan digabung selebar tabel agar tidak terlihat
      // seperti sel tunggal yang menggantung di kolom A.
      mergeRowIndices: [TITLE_ROW, FILTER_ROW],
      // Hanya kepala tabel yang dibekukan. Membekukan seluruh blok pembuka
      // membuat layar tertutup keterangan dan tabelnya tidak pernah terlihat.
      freezeRows: TABLE_HEADER_ROW + 1,
      columnWidths: [6, 20, 32, 26, 12, 20, 14, 14, 18, 8, 12],
    });

    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
        "Cache-Control": "no-store",
        ...(truncated ? { "X-Report-Truncated": String(report.total) } : {}),
      },
    });
  }

  const csv = buildReportCsv({
    report,
    rows,
    headers: REPORT_HEADERS,
    valuesOf: reportRowValues,
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      "Cache-Control": "no-store",
      ...(truncated ? { "X-Report-Truncated": String(report.total) } : {}),
    },
  });
}
