import {
  getReportRecap,
  resolveReportPeriod,
} from "@/db/queries/reports";
import { appContext } from "@/env";
import { loadActor } from "@/lib/auth/current";
import { assertRole, resolveScope } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

/**
 * Ekspor CSV rekapitulasi (UC12). Filter yang sama dengan layar laporan:
 * periode membatasi tugas yang dibuat, divisi (khusus Super Admin) menyaring
 * baris rekap. Pemisah titik koma agar Excel Indonesia membukanya langsung.
 */
export async function GET(request: Request) {
  const actor = await loadActor();
  if (!actor) {
    return new Response("Sesi tidak valid.", { status: 401 });
  }

  const scope = resolveScope(actor);
  const access = assertRole(scope, ["ADMIN", "SUPER_ADMIN"]);
  if (!access.ok) {
    return new Response(access.reason, { status: access.status });
  }

  const { db } = appContext();
  const url = new URL(request.url);
  const period = resolveReportPeriod(url.searchParams.get("periode") ?? "");
  const divisionFilter = url.searchParams.get("divisi");

  const recapRows = await getReportRecap(db, scope, period);
  const rows =
    scope.allDivisions && divisionFilter && divisionFilter !== "semua"
      ? recapRows.filter((row) => row.divisionName === divisionFilter)
      : recapRows;

  const header = "Divisi;Kode Divisi;Penugasan;Selesai;Tepat Waktu;Terlambat;Dokumen Final";
  const body = rows
    .map(
      (row) =>
        [
          row.divisionName,
          row.divisionCode,
          row.totalAssignments,
          row.completed,
          row.onTime,
          row.overdue,
          row.finalDocuments,
        ].join(";"),
    )
    .join("\r\n");
  const csv = `\uFEFF${header}\r\n${body}\r\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-penugasan-${period.key}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
