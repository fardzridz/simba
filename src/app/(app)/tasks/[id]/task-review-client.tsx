"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/icons";
import StatusChip from "../../status-chip";
import { LoadingButton } from "../../loading-state";
import { cancelTask, reviewSubmission } from "../actions";
import { CancelTaskModal } from "./task-admin-dialogs";
import type { TaskDetail } from "@/db/queries/task-detail";

export interface TaskReviewClientProps {
  initialTask: TaskDetail;
  isSuperAdmin?: boolean;
}

export default function TaskReviewClient({
  initialTask,
  isSuperAdmin = false,
}: TaskReviewClientProps) {
  const [task, setTask] = useState<TaskDetail>(initialTask);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [pendingDecision, setPendingDecision] = useState<
    "APPROVED" | "REVISION_REQUIRED" | null
  >(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const revisionInputId = useId();

  // Pengumpulan terbaru (versi paling atas)
  const latestSubmission = task.submissionHistory[0];

  const runDecision = async (decision: "APPROVED" | "REVISION_REQUIRED") => {
    setPendingDecision(decision);
    setDecisionError(null);
    try {
      const result = await reviewSubmission({
        assignmentId: task.assignmentId,
        decision,
        note: decision === "REVISION_REQUIRED" ? revisionNote : undefined,
      });
      if (result.error) {
        setDecisionError(result.error);
        return;
      }
      setSuccessBanner(
        decision === "APPROVED"
          ? `Pengumpulan disetujui. Tugas ${task.taskNumber} selesai dan masuk katalog dokumen final.`
          : `Tugas ${task.taskNumber} dikembalikan ke pelaksana untuk revisi.`,
      );
      // Status, riwayat review, dan log dimuat ulang dari server.
      window.location.reload();
    } catch {
      setDecisionError("Aksi gagal diproses. Coba lagi.");
    } finally {
      setPendingDecision(null);
    }
  };

  const handleCancelTask = async (reason: string) => {
    const result = await cancelTask(task.id, reason);
    if (result.error) return result;

    setTask((prev) => ({
      ...prev,
      status: "DIBATALKAN",
      cancelReason: reason,
    }));
    setSuccessBanner(
      `Tugas ${task.taskNumber} resmi dibatalkan. Alasan tercatat: "${reason}".`,
    );
    return result;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Tautan Navigasi Kembali */}
      <div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <span className="text-body-sm" aria-hidden="true">
            ←
          </span>
          {isSuperAdmin ? "Kembali ke Semua Tugas" : "Kembali ke Tugas Divisi"}
        </Link>
      </div>

      {/* Spanduk Pemberitahuan Sukses */}
      {successBanner ? (
        <div
          role="status"
          className="rounded-lg border border-success/30 bg-success-surface p-4 text-body font-semibold text-success flex items-center gap-2"
        >
          <Icon name="centang" size={18} />
          <span>{successBanner}</span>
        </div>
      ) : null}

      {/* Kepala Tugas Sesuai Wireframe L11 */}
      <section
        aria-labelledby="task-review-title"
        className="card p-6 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-body-sm font-medium text-ink-3 tracking-wide">
              {task.taskNumber}
            </span>
            <h1 id="task-review-title" className="text-h1 font-semibold text-ink">
              {task.title}
            </h1>
          </div>

          {/* Tombol Aksi Admin Kepala Tugas */}
          {!isSuperAdmin && task.status !== "DIBATALKAN" && task.status !== "SELESAI" ? (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="inline-flex h-9 items-center justify-center rounded-md bg-error px-3 text-body-sm font-semibold text-on-dark hover:bg-error-hover transition-colors"
              >
                Batalkan Tugas
              </button>
            </div>
          ) : null}
        </div>

        {/* Baris Status & Flag */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={task.status} />

          {task.isOverdue && task.status !== "SELESAI" ? (
            <span className="inline-flex items-center gap-1 rounded bg-error px-2 py-0.5 text-body-sm font-medium text-on-dark">
              <Icon name="terlambat" size={12} />
              Terlambat
            </span>
          ) : null}

          {task.needsRevision && task.status !== "SELESAI" ? (
            <span className="inline-flex items-center gap-1 rounded bg-error-surface px-2 py-0.5 text-body-sm font-medium text-error">
              <Icon name="revisi" size={12} />
              Perlu Revisi
            </span>
          ) : null}
        </div>

        {/* Baris Informasi Penerima & Tenggat Sesuai Wireframe L11 */}
        <div className="mt-2 grid grid-cols-1 gap-2 border-t border-border pt-3 text-body text-ink-2 tablet:grid-cols-3">
          <div>
            <span className="text-ink-3">Penerima:</span>{" "}
            <span className="font-semibold text-ink">
              {task.assignedStaffName ?? "Staf Pelaksana"}
            </span>
          </div>
          <div>
            <span className="text-ink-3">Tenggat:</span>{" "}
            <span className="font-semibold text-ink">{task.dueAtFormatted}</span>
          </div>
          <div>
            {task.status === "MENUNGGU_VERIFIKASI" ? (
              <span className="font-semibold text-error">
                Tunggu review: {task.waitingDurationFormatted ?? "—"}
              </span>
            ) : (
              <span className="text-ink-3">Divisi {task.divisionName}</span>
            )}
          </div>
        </div>
      </section>

      {/* Konten Utama 2 Kolom (Swiss Grid Bento L11) */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12">
        {/* Kolom Kiri: Pengumpulan Terbaru & Riwayat Versi (8 Kolom) */}
        <div className="flex flex-col gap-6 desktop:col-span-8">
          <section
            aria-labelledby="recent-submission-title"
            className="card p-6 flex flex-col gap-5"
          >
            <div className="border-b border-border pb-3">
              <h2
                id="recent-submission-title"
                className="text-h2 font-semibold text-ink"
              >
                Pengumpulan Terbaru
              </h2>
              <p className="mt-0.5 text-body-sm text-ink-3">
                Dokumen dan berkas yang dikirimkan oleh staf pelaksana untuk diverifikasi.
              </p>
            </div>

            {!latestSubmission ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-body-sm text-ink-3">
                Belum ada pengumpulan berkas dari staf pelaksana.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-semibold text-ink">
                      Versi {latestSubmission.version}
                    </span>
                    <span className="rounded bg-neutral-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                      {latestSubmission.reviewStatusLabel}
                    </span>
                  </div>
                  <span className="text-body-sm text-ink-3">
                    Dikirim {latestSubmission.submittedAtFormatted}
                  </span>
                </div>

                {latestSubmission.submitterNotes ? (
                  <p className="text-body-sm text-ink-2 bg-neutral-surface/60 p-3 rounded-md">
                    <span className="font-semibold text-ink">Catatan pelaksana:</span>{" "}
                    {latestSubmission.submitterNotes}
                  </p>
                ) : null}

                {/* Daftar Berkas Pengumpulan */}
                <div className="flex flex-col gap-2">
                  <span className="text-body-sm font-medium text-ink-2">
                    Berkas Lampiran ({latestSubmission.files.length}):
                  </span>
                  <ul className="divide-y divide-border rounded-md border border-border bg-surface-sunken">
                    {latestSubmission.files.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between p-3 text-body-sm gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon name="dokumen" size={16} className="text-ink-3 shrink-0" />
                          <span className="font-medium text-ink truncate">
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-body-sm text-ink-3">
                            {file.sizeFormatted} · {file.checksum}
                          </span>
                          {file.downloadUrl ? (
                            <a
                              href={file.downloadUrl}
                              className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
                            >
                              <Icon name="unduh" size={13} />
                              Unduh
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Berkas ini belum di-commit sehingga tidak dapat diunduh."
                              className="inline-flex items-center gap-1 text-body-sm font-semibold text-ink-3 disabled:cursor-not-allowed"
                            >
                              <Icon name="unduh" size={13} />
                              Unduh
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Riwayat Versi Terdahulu */}
            <div className="border-t border-border pt-4 flex flex-col gap-2">
              <h3 className="text-body font-semibold text-ink">Riwayat Versi</h3>
              {task.submissionHistory.length <= 1 ? (
                <p className="text-body-sm text-ink-3">
                  Belum ada versi lain untuk penugasan ini.
                </p>
              ) : (
                <div className="space-y-3">
                  {task.submissionHistory.slice(1).map((hist) => (
                    <div
                      key={hist.version}
                      className="rounded-md border border-border p-3 text-body-sm flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">Versi {hist.version}</span>
                        <span className="text-ink-3">{hist.submittedAtFormatted}</span>
                      </div>
                      {hist.adminFeedback ? (
                        <p className="text-error font-medium">
                          Catatan admin: {hist.adminFeedback}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Catatan Edukasi Kearsipan Sesuai Wireframe L11 */}
            <div className="border-t border-border pt-4 text-body-sm text-ink-3 space-y-1">
              <p>
                Unduhan melewati pemeriksaan sesi dan cakupan divisi pada setiap permintaan.
              </p>
              <p>Pratinjau berkas di dalam aplikasi tidak disediakan.</p>
              <p>
                Persetujuan menulis satu baris dokumen final untuk penugasan ini, bukan untuk setiap berkas. Menyetujui ulang memperbarui baris yang sama.
              </p>
            </div>
          </section>
        </div>

        {/* Kolom Kanan: Panel Keputusan Admin (Titik Fokus) (4 Kolom) */}
        <aside className="flex flex-col gap-6 desktop:col-span-4">
          <div className="card p-6 flex flex-col gap-5 sticky top-20">
            <h2 className="text-h2 font-semibold text-ink border-b border-border pb-3">
              Keputusan
            </h2>

            {isSuperAdmin ? (
              <div className="rounded-md border border-border bg-surface-sunken p-3 text-body-sm text-ink-3">
                <span className="font-semibold text-ink block mb-1">Akses Baca-Saja</span>
                Super Admin memantau kelengkapan berkas lintas divisi dan tidak melakukan perubahan status atau verifikasi penugasan.
              </div>
            ) : task.status === "MENUNGGU_VERIFIKASI" ? (
              <div className="flex flex-col gap-5">
                {decisionError ? (
                  <div
                    role="alert"
                    className="rounded-md border border-error/30 bg-error-surface p-3 text-body-sm font-medium text-error"
                  >
                    {decisionError}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <LoadingButton
                    type="button"
                    variant="primary"
                    loading={pendingDecision === "APPROVED"}
                    disabled={pendingDecision !== null}
                    onClick={() => runDecision("APPROVED")}
                    className="h-10 w-full text-body shadow-sm"
                  >
                    Setujui &amp; Arsipkan
                  </LoadingButton>
                  <p className="text-body-sm text-ink-3">
                    Menyetujui akan mengubah status menjadi Selesai dan menambah dokumen final di katalog kearsipan.
                  </p>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink mx-3 text-body-sm text-ink-3">atau</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={revisionInputId}
                      className="text-body-sm font-medium text-ink"
                    >
                      Catatan revisi <span className="text-error">*wajib</span>
                    </label>
                    <textarea
                      id={revisionInputId}
                      rows={3}
                      value={revisionNote}
                      onChange={(event) => setRevisionNote(event.target.value)}
                      maxLength={2000}
                      placeholder="Contoh: Lampiran rekap belum ditandatangani. Mohon unggah ulang versi final."
                      className="w-full rounded-md border border-border bg-surface p-2.5 text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    />
                  </div>

                  <LoadingButton
                    type="button"
                    variant="secondary"
                    loading={pendingDecision === "REVISION_REQUIRED"}
                    disabled={pendingDecision !== null || revisionNote.trim().length === 0}
                    onClick={() => runDecision("REVISION_REQUIRED")}
                    className="h-10 w-full text-body"
                  >
                    Minta Revisi
                  </LoadingButton>

                  <p className="text-body-sm text-ink-3">
                    Permintaan revisi akan mengembalikan status menjadi Sedang Dikerjakan dan menambah penghitung revisi.
                  </p>
                </div>
              </div>
            ) : task.status === "SELESAI" ? (
              <div className="rounded-md border border-success/30 bg-success-surface p-4 text-left">
                <div className="flex items-center gap-2 text-success font-semibold text-body">
                  <Icon name="centang" size={18} />
                  <span>Tugas Selesai &amp; Terarsip</span>
                </div>
                <p className="mt-1 text-body-sm text-ink-2">
                  Penugasan ini telah disetujui. Berkas digital telah diindeks ke Katalog Dokumen.
                </p>
              </div>
            ) : task.status === "DIBATALKAN" ? (
              <div className="rounded-md border border-error/30 bg-error-surface p-4 text-left">
                <div className="flex items-center gap-2 text-error font-semibold text-body">
                  <Icon name="dibatalkan" size={18} />
                  <span>Tugas Dibatalkan</span>
                </div>
                <p className="mt-1 text-body-sm text-ink-2">
                  Penugasan ini telah dihentikan secara resmi.
                </p>
                {task.cancelReason ? (
                  <p className="mt-1 text-body-sm text-ink-2">
                    <span className="font-medium text-ink">Alasan:</span>{" "}
                    {task.cancelReason}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-surface-sunken p-4 text-left">
                <span className="font-semibold text-ink block mb-1">
                  Sedang Berjalan
                </span>
                <p className="text-body-sm text-ink-3">
                  Staf pelaksana sedang mengerjakan tugas ini. Keputusan verifikasi dapat diberikan setelah staf mengumpulkan berkas hasil kerja.
                </p>
              </div>
            )}

            {/* Informasi Ringkas Tugas */}
            <div className="border-t border-border pt-4 flex flex-col gap-2 text-body-sm">
              <h3 className="font-semibold text-ink">Informasi Penugasan</h3>
              <div className="text-ink-2 flex flex-col gap-1">
                <div>
                  <span className="text-ink-3">Dibuat oleh:</span> {task.createdByName}
                </div>
                <div className="text-ink-3">{task.createdAtFormatted}</div>
                <div className="mt-1">
                  <span className="text-ink-3">Kategori:</span> {task.categoryName}
                </div>
                <div>
                  <span className="text-ink-3">Prioritas:</span> {task.priority}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Dialog Batalkan Tugas */}
      <CancelTaskModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        taskNumber={task.taskNumber}
        taskTitle={task.title}
        onCancelTask={handleCancelTask}
      />
    </div>
  );
}
