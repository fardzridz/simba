import Link from "next/link";
import type { ReportRow } from "@/db/queries/reports";
import { assignmentStatusLabel } from "@/db/queries/reports";
import {
  EMPTY_CELL,
  PRIORITY_LABELS,
  REPORT_COLUMNS,
  accuracyLabel,
  accuracyOf,
  dateCell,
  staffDetailLines,
} from "@/lib/report-row-format";

/**
 * Tabel daftar penugasan, dipakai bersama oleh halaman layar dan halaman cetak.
 *
 * Disatukan karena keduanya menampilkan data yang sama dengan kolom yang sama.
 * Bila masing-masing menyusun selnya sendiri, cepat atau lambat satu di antaranya
 * tertinggal saat kolom berubah, dan pembaca akan menerima laporan cetak yang
 * kolomnya berbeda dari yang dilihat di layar.
 *
 * Komponen ini sengaja tanpa state dan tanpa efek samping supaya dapat dirender
 * di server (halaman cetak) maupun di peramban (halaman layar).
 */

export type ReportTableProps = {
  rows: ReportRow[];
  /** Nomor urut baris pertama, agar penomoran melanjutkan halaman sebelumnya. */
  startNumber?: number;
  /** Tautan judul tugas. Dimatikan di halaman cetak. */
  linked?: boolean;
  /** Keterangan bila tidak ada baris. */
  emptyMessage: string;
  /** Isi tambahan di dalam sel kosong, misalnya tombol hapus filter. */
  emptyAction?: React.ReactNode;
};

export default function ReportTable({
  rows,
  startNumber = 1,
  linked = false,
  emptyMessage,
  emptyAction,
}: ReportTableProps) {
  return (
    <table className="print-table w-full text-left text-body">
      <caption className="sr-only">
        Daftar penugasan sesuai filter aktif, {rows.length} baris.
      </caption>
      <thead>
        <tr className="border-b border-border bg-surface-sunken print:bg-transparent">
          {REPORT_COLUMNS.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`label px-3 py-2.5 font-medium ${
                column.align === "right" ? "text-right" : ""
              }`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border print:divide-ink">
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={REPORT_COLUMNS.length}
              className="px-3 py-10 text-center text-body-sm text-ink-3"
            >
              {emptyMessage}
              {emptyAction ? <> {emptyAction}</> : null}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => {
            const accuracy = accuracyOf(row);
            const staffLines = staffDetailLines(row);
            return (
              <tr
                key={row.assignmentId}
                className="align-top hover:bg-neutral-surface/40 print:hover:bg-transparent"
              >
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-body-sm text-ink-3">
                  {startNumber + index}
                </td>

                <td className="px-3 py-2.5 whitespace-nowrap font-mono text-body-sm text-ink">
                  {row.taskNumber}
                </td>

                <td className="px-3 py-2.5">
                  {linked ? (
                    <Link
                      href={`/tasks/${row.taskId}?assignment=${encodeURIComponent(row.assignmentId)}`}
                      className="font-medium text-ink transition-colors hover:text-primary hover:underline print:text-ink print:no-underline"
                    >
                      {row.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">{row.title}</span>
                  )}
                  <span className="block text-body-sm text-ink-3">{row.categoryName}</span>
                </td>

                <td className="px-3 py-2.5">
                  {staffLines.map((line, lineIndex) => (
                    <span
                      key={line}
                      className={
                        lineIndex === 0
                          ? "block text-body-sm font-medium text-ink"
                          : "block text-body-sm text-ink-3"
                      }
                    >
                      {line}
                    </span>
                  ))}
                </td>

                <td className="px-3 py-2.5 whitespace-nowrap text-body-sm text-ink-2">
                  {PRIORITY_LABELS[row.priority]}
                </td>

                <td className="px-3 py-2.5 whitespace-nowrap text-body-sm text-ink">
                  {assignmentStatusLabel(row.status)}
                </td>

                <td className="px-3 py-2.5 whitespace-nowrap text-body-sm tabular-nums text-ink-2">
                  {dateCell(row.dueAt)}
                </td>

                <td className="px-3 py-2.5 whitespace-nowrap text-body-sm tabular-nums text-ink-2">
                  {dateCell(row.completedAt)}
                </td>

                <td
                  className={`px-3 py-2.5 whitespace-nowrap text-body-sm ${
                    accuracy.kind === "terlambat" ? "font-medium text-error" : "text-ink-2"
                  }`}
                >
                  {accuracyLabel(accuracy)}
                </td>

                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-body-sm text-ink-2">
                  {row.revisionCount}
                </td>

                <td className="px-3 py-2.5 whitespace-nowrap text-body-sm text-ink-2">
                  {row.archived ? "Terarsip" : EMPTY_CELL}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
