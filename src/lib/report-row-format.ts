import type { Priority } from "@/db/schema";
import type { ReportRow } from "@/db/queries/reports";
import { assignmentStatusLabel } from "@/db/queries/reports";
import { formatWibDate } from "@/lib/time";

/**
 * Format satu baris laporan untuk SEMUA saluran keluar: tabel layar, hasil
 * cetak, CSV, dan Excel.
 *
 * Dikumpulkan di satu tempat karena bila tiap saluran memformat sendiri-sendiri,
 * keempatnya akan perlahan berbeda. Pada laporan resmi, "Terlambat 1 hari" di
 * layar tetapi "Terlambat 2 hari" di berkas unduhan adalah cacat yang tidak
 * bisa dijelaskan kepada pembaca.
 */

export const PRIORITY_LABELS: Record<Priority, string> = {
  RENDAH: "Rendah",
  SEDANG: "Sedang",
  TINGGI: "Tinggi",
  MENDESAK: "Mendesak",
};

/** Tanda untuk sel yang memang tidak punya nilai. */
export const EMPTY_CELL = "-";

export type Accuracy =
  | { kind: "belum" }
  | { kind: "tepat"; days: 0 }
  | { kind: "terlambat"; days: number };

/**
 * Ketepatan waktu satu baris.
 *
 * Aturan: tugas dianggap tepat waktu bila `completedAt <= dueAt`, yaitu selesai
 * paling lambat pada detik tenggat. Tugas yang belum selesai tidak punya
 * ketepatan waktu sama sekali; ia bukan "tepat waktu" dan bukan "terlambat",
 * melainkan belum ada hasilnya. Menghitungnya sebagai salah satu dari keduanya
 * akan membuat ringkasan tidak dapat dipertanggungjawabkan.
 *
 * Jumlah hari keterlambatan dibulatkan KE ATAS: terlambat satu jam tetap
 * dilaporkan "Terlambat 1 hari", bukan "Terlambat 0 hari" yang terbaca seperti
 * tidak terlambat.
 */
export function accuracyOf(row: {
  status: ReportRow["status"];
  dueAt: number;
  completedAt: number | null;
}): Accuracy {
  if (row.status !== "SELESAI" || row.completedAt === null) {
    return { kind: "belum" };
  }
  const diffSeconds = row.completedAt - row.dueAt;
  if (diffSeconds <= 0) return { kind: "tepat", days: 0 };
  return { kind: "terlambat", days: Math.max(1, Math.ceil(diffSeconds / 86_400)) };
}

export function accuracyLabel(accuracy: Accuracy): string {
  if (accuracy.kind === "belum") return EMPTY_CELL;
  if (accuracy.kind === "tepat") return "Tepat waktu";
  return `Terlambat ${accuracy.days} hari`;
}

/** Tanggal WIB, atau tanda kosong bila belum ada. */
export function dateCell(epochSeconds: number | null): string {
  return epochSeconds === null ? EMPTY_CELL : formatWibDate(epochSeconds);
}

/**
 * Susunan kolom laporan. Dipakai bersama oleh tabel layar, cetak, CSV, dan
 * Excel supaya urutan dan judulnya tidak mungkin berbeda antar saluran.
 *
 * `printMm` adalah lebar kolom pada kertas A4 landscape (267mm bersih). Jumlah
 * seluruh `printMm` sengaja di bawah 267mm; ada tes yang menjaganya.
 */
export type ReportColumn = {
  key: string;
  header: string;
  /** Lebar kolom saat dicetak, dalam milimeter. */
  printMm: number;
  align: "left" | "right";
  /** Nilai teks untuk CSV/Excel. */
  value: (row: ReportRow, index: number) => string;
};

/**
 * Kolom "Petugas" memuat empat bidang (nama, jabatan, divisi, NIP) di dalam satu
 * sel, bukan empat kolom terpisah. Alasannya ruang: 13 kolom terpisah berjumlah
 * 301mm dan tidak muat di A4 landscape (267mm), sedangkan cara ini memuat data
 * yang sama dalam 259mm.
 */
export function staffDetailLines(row: ReportRow): string[] {
  const lines = [row.staffName];
  if (row.staffPosition) lines.push(row.staffPosition);
  lines.push(row.divisionName);
  if (row.staffNip) lines.push(`NIP ${row.staffNip}`);
  return lines;
}

export const REPORT_COLUMNS: ReportColumn[] = [
  {
    key: "no",
    header: "No",
    printMm: 8,
    align: "right",
    value: (_row, index) => String(index + 1),
  },
  {
    key: "taskNumber",
    header: "Nomor Tugas",
    printMm: 30,
    align: "left",
    value: (row) => row.taskNumber,
  },
  {
    key: "title",
    header: "Judul & Kategori",
    printMm: 45,
    align: "left",
    value: (row) => `${row.title} (${row.categoryName})`,
  },
  {
    key: "staff",
    header: "Petugas & Divisi",
    printMm: 32,
    align: "left",
    value: (row) => staffDetailLines(row).join(" / "),
  },
  {
    key: "priority",
    header: "Prioritas",
    printMm: 18,
    align: "left",
    value: (row) => PRIORITY_LABELS[row.priority],
  },
  {
    key: "status",
    header: "Status",
    printMm: 24,
    align: "left",
    value: (row) => assignmentStatusLabel(row.status),
  },
  {
    key: "dueAt",
    header: "Tenggat",
    printMm: 20,
    align: "left",
    value: (row) => dateCell(row.dueAt),
  },
  {
    key: "completedAt",
    header: "Selesai",
    printMm: 20,
    align: "left",
    value: (row) => dateCell(row.completedAt),
  },
  {
    key: "accuracy",
    header: "Ketepatan Waktu",
    printMm: 22,
    align: "left",
    value: (row) => accuracyLabel(accuracyOf(row)),
  },
  {
    key: "revisionCount",
    header: "Revisi",
    printMm: 14,
    align: "right",
    value: (row) => String(row.revisionCount),
  },
  {
    key: "archived",
    header: "Dokumen",
    printMm: 18,
    align: "left",
    value: (row) => (row.archived ? "Terarsip" : EMPTY_CELL),
  },
];

export const REPORT_COLUMNS_TOTAL_MM = REPORT_COLUMNS.reduce(
  (sum, column) => sum + column.printMm,
  0,
);

/** Nilai satu baris untuk CSV/Excel, mengikuti urutan `REPORT_COLUMNS`. */
export function reportRowValues(row: ReportRow, index: number): string[] {
  return REPORT_COLUMNS.map((column) => column.value(row, index));
}

export const REPORT_HEADERS = REPORT_COLUMNS.map((column) => column.header);
