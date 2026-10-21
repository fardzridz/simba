import { eq } from "drizzle-orm";
import { archiveCount, dashboardCounts, reviewQueue } from "@/db/queries/dashboard";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import { humanizeRemaining, nowSeconds } from "@/lib/time";
import { ASSIGNMENT_STATUSES, divisions, type AssignmentStatus } from "@/db/schema";
import StatCard from "../stat-card";
import StatusChip from "../status-chip";
import { Icon } from "@/app/icons";

export const dynamic = "force-dynamic";

const STATUS_BAR_COLOR: Record<AssignmentStatus, string> = {
  BELUM_DIKERJAKAN: "bg-ink-3",
  SEDANG_DIKERJAKAN: "bg-status-sedang-text",
  MENUNGGU_VERIFIKASI: "bg-status-menunggu-text",
  SELESAI: "bg-status-selesai-text",
  DIBATALKAN: "bg-ink-3/50",
};

export default async function DashboardPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  const { db } = appContext();

  const [counts, archived] = await Promise.all([
    dashboardCounts(db, scope),
    archiveCount(db, scope),
  ]);
  const queue = scope.role === "USER" ? [] : await reviewQueue(db, scope, 10);

  const [division] = await db
    .select({ name: divisions.name, code: divisions.code })
    .from(divisions)
    .where(eq(divisions.id, actor.divisionId))
    .limit(1);

  const scopeNote =
    scope.role === "USER"
      ? "Penugasan Anda."
      : scope.allDivisions
        ? "Seluruh divisi. Data tugas hanya dapat dibaca, tidak diubah dari akun ini."
        : `${division?.name ?? actor.divisionId}. Angka dihitung server saat halaman dibuka.`;

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Banner Informasi Lingkup & Satuan Data */}
      <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface px-4 py-3 shadow-xs tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-surface text-ink-2">
            <Icon name="dashboard" size={15} />
          </span>
          <p className="label text-ink-2">
            <span className="font-semibold text-ink">{division?.name ?? "Portal"}</span> · {scopeNote}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-body-sm text-ink-3">
          <span className="inline-flex items-center rounded bg-surface-sunken px-2 py-0.5 text-body-sm font-medium text-ink-2 border border-border">
            satuan: penugasan (assignment)
          </span>
          <span className="text-body-sm text-ink-3">waktu: {todayIso} WIB</span>
        </div>
      </div>

      {/* Grid Kartu Metrik KPI (Bento Strip) */}
      <section
        aria-labelledby="kartu-utama"
        className="grid grid-cols-2 gap-3 tablet:grid-cols-4"
      >
        <h2 id="kartu-utama" className="sr-only">
          Ringkasan utama
        </h2>
        <StatCard
          label="Penugasan"
          value={counts.assignments}
          unit="tugas"
          icon="tugas"
          hint="semua status, seumur data"
        />
        <StatCard
          label="Judul tugas"
          value={counts.tasks}
          unit="judul"
          icon="dokumen"
          hint="count(task), dalam cakupan"
        />
        <StatCard
          label="Terlambat"
          value={counts.overdue}
          unit="tugas"
          icon="terlambat"
          tone={counts.overdue > 0 ? "danger" : "normal"}
          hint="melewati tenggat & belum selesai"
        />
        <StatCard
          label="Tenggat dekat"
          value={counts.dueSoon}
          unit="tugas"
          icon="jam"
          tone={counts.dueSoon > 0 ? "warning" : "normal"}
          hint="≤ 3 hari lagi"
        />
        <StatCard
          label="Menunggu verifikasi"
          value={counts.awaitingReview}
          unit="tugas"
          icon="menunggu"
          tone={counts.awaitingReview > 0 ? "warning" : "normal"}
          hint="antrean review pengumpulan"
        />
        <StatCard
          label="Perlu revisi"
          value={counts.needRevision}
          unit="tugas"
          icon="revisi"
          tone={counts.needRevision > 0 ? "warning" : "normal"}
          hint="pengumpulan dikembalikan"
        />
        <StatCard
          label="Dokumen final"
          value={archived}
          unit="arsip"
          icon="terarsip"
          hint="satu baris per penugasan disahkan"
        />
        <StatCard
          label="Selesai tepat waktu"
          value={
            counts.completedTotal === 0
              ? "-"
              : `${counts.completedOnTime}/${counts.completedTotal}`
          }
          icon="centang"
          tone={counts.completedOnTime > 0 ? "success" : "normal"}
          hint="completed_at ≤ due_at"
        />
      </section>

      {/* Grid 2 Kolom Bento: Distribusi Status & Antrean Review */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12">
        {/* Kolom Kiri: Distribusi Status */}
        <section
          aria-labelledby="distribusi"
          className={`card flex flex-col p-4 desktop:p-6 ${
            scope.role === "USER" ? "desktop:col-span-12" : "desktop:col-span-7"
          }`}
        >
          <div className="border-b border-border pb-3">
            <h2 id="distribusi" className="text-h2 font-semibold text-ink">
              Distribusi status
            </h2>
            <p className="mt-1 text-body-sm text-ink-3">
              Status bersifat tunggal per penugasan, jadi jumlahnya selalu sama dengan total penugasan.
            </p>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="label py-2 font-medium">
                    Status
                  </th>
                  <th scope="col" className="label py-2 text-right font-medium">
                    Porsi
                  </th>
                  <th scope="col" className="label py-2 text-right font-medium">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-sunken">
                {ASSIGNMENT_STATUSES.map((status) => {
                  const value = counts.byStatus[status] ?? 0;
                  const ratio = counts.assignments === 0 ? 0 : value / counts.assignments;
                  const percentString = `${(ratio * 100).toFixed(0)}%`;

                  return (
                    <tr
                      key={status}
                      className="transition-colors hover:bg-neutral-surface/40"
                    >
                      <td className="py-2.5">
                        <StatusChip status={status} />
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-2.5">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-surface tablet:w-24">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${STATUS_BAR_COLOR[status]}`}
                              style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-body-sm tabular-nums text-ink-2">
                            {percentString}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums text-ink">
                        {value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold text-ink">
                  <td className="py-2.5">Total</td>
                  <td className="py-2.5 text-right tabular-nums text-ink-2">100%</td>
                  <td className="py-2.5 text-right tabular-nums">{counts.assignments}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Kolom Kanan: Antrean Review Menunggu Verifikasi */}
        {scope.role === "USER" ? null : (
          <section
            aria-labelledby="antrean"
            className="card flex flex-col p-4 desktop:col-span-5 desktop:p-6"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 id="antrean" className="text-h2 font-semibold text-ink">
                  Antrean menunggu verifikasi
                </h2>
                <p className="mt-1 text-body-sm text-ink-3">
                  Pengumpulan dari staf yang siap ditinjau.
                </p>
              </div>
              {queue.length > 0 ? (
                <span className="rounded-full bg-status-menunggu-surface px-2.5 py-0.5 text-body-sm font-semibold text-status-menunggu-text">
                  {queue.length}
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-1 flex-col justify-center">
              {queue.length === 0 ? (
                <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-sunken p-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-surface text-ink-3">
                    <Icon name="antrean" size={20} />
                  </span>
                  <p className="mt-3 text-body font-medium text-ink">
                    Tidak ada pengumpulan yang menunggu.
                  </p>
                  <p className="mt-1 text-center text-body-sm text-ink-3">
                    Semua berkas pengumpulan telah selesai diverifikasi atau belum ada kiriman baru.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-surface-sunken text-body">
                  {queue.map((item) => (
                    <li
                      key={item.assignmentId}
                      className="flex flex-col gap-1 py-3 transition-colors hover:bg-neutral-surface/30"
                    >
                      <span className="font-medium text-ink">{item.title}</span>
                      <span className="text-body-sm text-ink-3">
                        {item.submittedAt
                          ? `dikirim ${humanizeRemaining(item.submittedAt, nowSeconds())} lalu`
                          : "belum ada pengumpulan"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>

      <p className="text-body-sm text-ink-3">
        Angka pada kartu memakai rumus §7.1 dokumen rancangan; kartu akan terhubung ke daftar terfilter pada Sprint 1.
      </p>
    </div>
  );
}
