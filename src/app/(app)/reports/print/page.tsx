import Link from "next/link";
import { getReportExport, readReportFilters } from "@/db/queries/reports";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import ReportTable from "../report-table";
import { buildBackHref } from "../report-actions";
import { PrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";

/**
 * Halaman cetak laporan.
 *
 * Dipisahkan dari halaman layar karena keduanya memuat jumlah data yang
 * berbeda: layar menampilkan satu halaman (25 baris) dengan paginasi, sedangkan
 * hasil cetak harus memuat SELURUH baris hasil filter. Mencetak halaman layar
 * lewat `window.print()` akan menghasilkan laporan yang terpotong di baris ke-25
 * tanpa satu pun peringatan kepada pengguna.
 *
 * Tidak ada kop instansi dan tidak ada blok tanda tangan: halaman ini mencetak
 * tabel apa adanya, sesuai keputusan pemilik aplikasi.
 */

/** Batas baris cetak, sama dengan batas ekspor. */
const MAX_PRINT_ROWS = 20_000;

/** Halaman yang dibuka untuk pengguna tanpa hak akses laporan. */
function Forbidden() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-h1 font-semibold text-ink">Akses Ditolak</h1>
      <p className="mt-2 text-body text-ink-2">
        Halaman cetak laporan hanya dapat dibuka oleh Admin Divisi dan Super Admin.
      </p>
      <Link href="/tasks" className="mt-6 inline-block font-semibold text-primary hover:underline">
        Kembali ke Tugas Saya
      </Link>
    </div>
  );
}

export default async function ReportPrintPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  if (scope.role === "USER") return <Forbidden />;

  const params = await props.searchParams;
  // `readReportFilters` membaca URLSearchParams. Halaman menerima objek biasa,
  // jadi disamakan dulu supaya aturan pembacaan filter tidak ditulis dua kali
  // dan tidak mungkin berbeda dari halaman layar.
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") search.set(key, value);
  }

  const filters = readReportFilters(search, scope);
  const { db } = appContext();
  const report = await getReportExport(db, scope, filters, MAX_PRINT_ROWS);
  const rows = report.rows;

  // Tautan kembali membawa filter yang sama, tanpa parameter halaman, agar
  // pengguna tidak kehilangan konteks setelah menutup halaman cetak.
  const backHref = buildBackHref(filters, {
    dateFrom: typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
  });

  return (
    // Sengaja <div>, bukan <main>: layout aplikasi sudah menyediakan <main>,
    // dan dua <main> bersarang membuat struktur dokumen tidak sah.
    <div className="mx-auto max-w-page print:max-w-none print:p-0">
      <PrintToolbar
        backHref={backHref}
        total={report.total}
        loaded={rows.length}
      />

      {/* Kepala cetak: keterangan laporan, tanpa kop dan tanpa tanda tangan. */}
      <header className="mb-4">
        <h1 className="text-h1 font-semibold text-ink">Laporan Penugasan</h1>
        <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-body-sm text-ink-2">
          <div>
            <dt className="inline font-semibold">Periode: </dt>
            <dd className="inline">{report.rangeLabel}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Acuan tanggal: </dt>
            <dd className="inline">{report.dateBasisLabel}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Divisi: </dt>
            <dd className="inline">{report.scopeLabels.division}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Status: </dt>
            <dd className="inline">{report.scopeLabels.status}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Kategori: </dt>
            <dd className="inline">{report.scopeLabels.category}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Petugas: </dt>
            <dd className="inline">{report.scopeLabels.staff}</dd>
          </div>
        </dl>
        <p className="mt-2 text-body-sm text-ink-2">
          <span className="tabular-nums">{report.summary.total}</span> penugasan
          <span aria-hidden="true"> · </span>
          selesai <span className="tabular-nums">{report.summary.completed}</span>
          <span aria-hidden="true"> · </span>
          terlambat <span className="tabular-nums">{report.summary.late}</span>
          <span aria-hidden="true"> · </span>
          belum selesai dan lewat tenggat{" "}
          <span className="tabular-nums">{report.summary.overdue}</span>
        </p>
        {report.total > MAX_PRINT_ROWS ? (
          <p className="mt-2 rounded-md bg-warning-surface px-3 py-2 text-body-sm text-warning">
            Hasil filter berisi <span className="tabular-nums">{report.total}</span> baris,
            sedangkan halaman cetak dibatasi {MAX_PRINT_ROWS} baris. Persempit filter
            atau gunakan ekspor Excel agar seluruh baris tercetak.
          </p>
        ) : null}
      </header>

      <ReportTable
        rows={rows}
        emptyMessage="Tidak ada penugasan yang cocok dengan filter ini."
      />

      <footer className="mt-3 text-body-sm text-ink-3">
        Jumlah baris tercetak: <span className="tabular-nums">{rows.length}</span>.
      </footer>
    </div>
  );
}
