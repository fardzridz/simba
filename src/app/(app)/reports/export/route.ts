import {
  getReport,
  readReportFilters,
} from "@/db/queries/reports";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

/** Seluruh CSV memakai tanda koma; nilai berisi koma dikelilingi kutip ganda. */
function csvField(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

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
  const report = await getReport(db, scope, filters);

  const lines: string[] = [
    "LAPORAN REKAPITULASI PENUGASAN",
    `Periode,${report.periodLabel} (${report.rangeLabel})`,
    `Divisi,${report.scopeLabels.division}`,
    `Status,${report.scopeLabels.status}`,
    `Kategori,${report.scopeLabels.category}`,
    "",
    "Ringkasan periode (satuan: penugasan)",
    "Metrik,Nilai",
    `Total penugasan,${report.summary.totalAssignments}`,
    `Selesai,${report.summary.completed}`,
    `Tepat waktu,${report.summary.onTime}`,
    `Terlambat,${report.summary.overdue}`,
    `Dibatalkan,${report.summary.cancelled}`,
    `Dokumen final,${report.summary.finalDocuments}`,
    "",
    "Rekapitulasi per divisi",
    "Divisi,Kode,Penugasan,Selesai,Terlambat,Dokumen final",
  ];

  for (const row of report.rows) {
    lines.push(
      [
        row.divisionName,
        row.divisionCode,
        row.totalAssignments,
        row.completed,
        row.overdue,
        row.finalDocuments,
      ]
        .map(csvField)
        .join(","),
    );
  }

  const csv = `\uFEFF${lines.join("\r\n")}\r\n`;
  const filename = `laporan-penugasan-${report.period}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
