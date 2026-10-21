"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/icons";
import StatusChip from "../../status-chip";
import { startTask } from "../actions";
import SubmitModal from "../submit-modal";
import type { TaskDetail } from "@/db/queries/task-detail";
import { createSubmissionOrchestrator } from "../submit-orchestrator";

const PRIORITY_LABEL: Record<string, string> = {
  RENDAH: "Rendah",
  SEDANG: "Sedang",
  TINGGI: "Tinggi",
  MENDESAK: "Mendesak",
};

const PRIORITY_STYLE: Record<string, string> = {
  RENDAH: "text-ink-3",
  SEDANG: "text-ink-2",
  TINGGI: "font-medium text-warning",
  MENDESAK: "font-semibold text-error",
};

export interface TaskDetailClientProps {
  initialTask: TaskDetail;
}

export default function TaskDetailClient({ initialTask }: TaskDetailClientProps) {
  const [task, setTask] = useState<TaskDetail>(initialTask);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const nextVersionNumber = task.currentVersion + 1;

  const handleStartTask = async () => {
    setIsStarting(true);
    setActionError(null);
    try {
      const result = await startTask(task.assignmentId);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setTask((prev) => ({
        ...prev,
        status: "SEDANG_DIKERJAKAN",
      }));
    } catch {
      setActionError("Tugas gagal dimulai. Coba lagi.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmissionSuccess = () => {
    // Data riwayat lengkap dimuat ulang dari server, bukan disintesis di klien.
    window.location.reload();
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
          Kembali ke Tugas Saya
        </Link>
      </div>

      {/* Kepala Tugas (Header Card) */}
      <section
        aria-labelledby="task-detail-title"
        className="card p-6 flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-body-sm font-medium text-ink-3 tracking-wide">
            {task.taskNumber}
          </span>
          <span className="text-body-sm text-ink-3">
            Divisi {task.divisionName}
          </span>
        </div>

        <h1 id="task-detail-title" className="text-h1 font-semibold text-ink">
          {task.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={task.status} />

          {task.needsRevision && task.status !== "SELESAI" ? (
            <span className="inline-flex items-center gap-1 rounded bg-error-surface px-2 py-0.5 text-body-sm font-medium text-error">
              <Icon name="revisi" size={12} />
              Perlu Revisi
            </span>
          ) : null}

          <span className={`text-body-sm ${PRIORITY_STYLE[task.priority] ?? "text-ink-2"}`}>
            Prioritas: {PRIORITY_LABEL[task.priority] ?? task.priority}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-body text-ink-2 border-t border-border pt-3">
          <span className="font-medium text-ink">Tenggat:</span>
          <span>{task.dueAtFormatted}</span>
          <span className="text-ink-3">·</span>
          <span
            className={
              task.status === "DIBATALKAN"
                ? "font-semibold text-error"
                : task.status === "SELESAI"
                  ? "font-semibold text-success"
                  : "font-semibold text-warning"
            }
          >
            {task.remainingFormatted}
          </span>
        </div>
      </section>

      {/* Konten Utama 2 Kolom (Swiss Grid Bento) */}
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12">
        {/* Kolom Kiri: Deskripsi & Riwayat Pengumpulan (8 Kolom) */}
        <div className="flex flex-col gap-6 desktop:col-span-8">
          {/* Kartu Deskripsi Instruksi */}
          {task.description ? (
            <section
              aria-labelledby="desc-heading"
              className="card p-6 flex flex-col gap-2"
            >
              <h2 id="desc-heading" className="text-h2 font-semibold text-ink">
                Instruksi Penugasan
              </h2>
              <p className="text-body text-ink-2 leading-relaxed">
                {task.description}
              </p>
            </section>
          ) : null}

          {/* Kartu Riwayat Pengumpulan Berkas */}
          <section
            aria-labelledby="history-heading"
            className="card p-6 flex flex-col gap-5"
          >
            <div className="border-b border-border pb-3">
              <h2 id="history-heading" className="text-h2 font-semibold text-ink">
                Riwayat Pengumpulan
              </h2>
              <p className="mt-0.5 text-body-sm text-ink-3">
                Seluruh riwayat revisi dan berkas tersimpan secara permanen untuk jejak audit.
              </p>
            </div>

            {task.submissionHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-surface text-ink-3">
                  <Icon name="dokumen" size={20} />
                </span>
                <p className="mt-2 text-body font-medium text-ink">
                  Belum ada berkas pengumpulan
                </p>
                <p className="mt-1 text-body-sm text-ink-3">
                  Kerjakan tugas ini lalu kirimkan berkas melalui tombol Kumpulkan Tugas.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {task.submissionHistory.map((ver) => (
                  <article
                    key={ver.version}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
                  >
                    {/* Header Versi */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-body font-semibold text-ink">
                          Versi {ver.version}
                        </span>

                        {ver.reviewStatus === "REVISION_REQUIRED" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-error-surface px-2 py-0.5 text-body-sm font-medium text-error">
                            <Icon name="revisi" size={12} />
                            {ver.reviewStatusLabel}
                          </span>
                        ) : ver.reviewStatus === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-success-surface px-2 py-0.5 text-body-sm font-medium text-success">
                            <Icon name="centang" size={12} />
                            Disetujui
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                            <Icon name="menunggu" size={12} />
                            Menunggu Verifikasi
                          </span>
                        )}
                      </div>

                      <span className="text-body-sm text-ink-3">
                        Dikirim {ver.submittedAtFormatted}
                      </span>
                    </div>

                    {/* Daftar Berkas */}
                    <div className="flex flex-col gap-2">
                      <span className="text-body-sm font-medium text-ink-2">
                        Berkas Terunggah ({ver.files.length}):
                      </span>
                      <ul className="divide-y divide-border rounded-md border border-border bg-surface-sunken">
                        {ver.files.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center justify-between p-2.5 text-body-sm gap-3"
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
                                  title="Route unduhan belum tersedia."
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

                    {/* Catatan Pelaksana */}
                    {ver.submitterNotes ? (
                      <p className="text-body-sm text-ink-2 bg-neutral-surface/60 p-2.5 rounded-md">
                        <span className="font-medium text-ink">Catatan pelaksana:</span>{" "}
                        {ver.submitterNotes}
                      </p>
                    ) : null}

                    {/* Catatan Verifikasi Admin (Bila Ada) */}
                    {ver.adminFeedback ? (
                      <div className="rounded-md border border-error/30 bg-error-surface p-3 text-body-sm flex flex-col gap-1">
                        <p className="font-medium text-error">
                          Catatan admin: {ver.adminFeedback}
                        </p>
                        {ver.reviewedByName ? (
                          <p className="text-body-sm text-ink-3">
                            Diperiksa oleh {ver.reviewedByName}
                            {ver.reviewedAtFormatted ? `, ${ver.reviewedAtFormatted}` : ""}.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}

            {/* Catatan Edukasi Kearsipan Sesuai Wireframe L07 */}
            <div className="border-t border-border pt-3 text-body-sm text-ink-3 space-y-1">
              <p>
                Setelah dikumpulkan ulang, pengumpulan berikutnya otomatis tercatat sebagai Versi {nextVersionNumber}.
              </p>
              <p>
                Berkas versi sebelumnya tetap tersimpan untuk jejak audit; unduhan belum tersedia pada versi ini.
              </p>
            </div>
          </section>
        </div>

        {/* Kolom Kanan: Kartu Aksi & Metadata Penugasan (4 Kolom) */}
        <aside className="flex flex-col gap-6 desktop:col-span-4">
          <div className="card p-6 flex flex-col gap-5 sticky top-20">
            {/* Seksi Aksi */}
            <div className="flex flex-col gap-3">
              <h2 className="text-h2 font-semibold text-ink">Aksi</h2>

              {actionError ? (
                <p role="alert" className="rounded-md border border-error/30 bg-error-surface p-2.5 text-body-sm font-medium text-error">
                  {actionError}
                </p>
              ) : null}

              {task.status === "DIBATALKAN" ? (
                <div className="rounded-md border border-error/30 bg-error-surface p-3 text-body-sm">
                  <span className="font-semibold text-error">Tugas Dibatalkan</span>
                  <p className="mt-0.5 text-body-sm text-ink-2">
                    Penugasan ini telah dihentikan oleh Admin Divisi.
                  </p>
                  {task.cancelReason ? (
                    <p className="mt-1 text-body-sm text-ink-2">
                      <span className="font-medium text-ink">Alasan:</span>{" "}
                      {task.cancelReason}
                    </p>
                  ) : null}
                </div>
              ) : task.status === "SELESAI" ? (
                <div className="rounded-md border border-success/30 bg-success-surface p-3 text-body-sm text-success">
                  <span className="font-semibold">Tugas Selesai</span>
                  <p className="mt-0.5 text-body-sm text-ink-2">
                    Hasil kerja telah disetujui dan dokumen telah diarsipkan.
                  </p>
                </div>
              ) : task.status === "MENUNGGU_VERIFIKASI" ? (
                <div className="rounded-md border border-border bg-surface-sunken p-3 text-body-sm text-ink-2">
                  <span className="font-semibold text-ink">Menunggu Verifikasi</span>
                  <p className="mt-0.5 text-body-sm text-ink-3">
                    Pengumpulan Anda sedang diperiksa oleh Admin Divisi. Anda akan menerima notifikasi jika disetujui atau memerlukan revisi.
                  </p>
                </div>
              ) : task.status === "BELUM_DIKERJAKAN" ? (
                <button
                  type="button"
                  onClick={handleStartTask}
                  disabled={isStarting}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink transition-colors hover:bg-neutral-surface active:bg-border disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStarting ? "Memulai..." : "Mulai Kerjakan"}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-body font-semibold text-on-dark shadow-sm transition-colors hover:bg-primary-hover active:bg-primary-active"
                  >
                    Kumpulkan Tugas
                  </button>
                  <p className="text-body-sm text-ink-3">
                    Mengirim ulang setelah revisi menaikkan versi pengumpulan menjadi Versi {nextVersionNumber}.
                  </p>
                </div>
              )}
            </div>

            {/* Seksi Ketentuan Berkas */}
            <div className="border-t border-border pt-4 flex flex-col gap-2">
              <h3 className="text-body font-semibold text-ink">Ketentuan Berkas</h3>
              <ul className="text-body-sm text-ink-2 space-y-1.5 list-disc list-inside">
                <li>Tipe: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</li>
                <li>Ukuran maksimal 10 MB per berkas</li>
                <li>Maksimal 5 berkas per pengumpulan</li>
                <li>Catatan opsional, maksimal 2.000 karakter</li>
              </ul>
            </div>

            {/* Seksi Informasi Metadata */}
            <div className="border-t border-border pt-4 flex flex-col gap-2 text-body-sm">
              <h3 className="text-body font-semibold text-ink">Informasi Tugas</h3>
              <div className="flex flex-col gap-1 text-ink-2">
                <div>
                  <span className="text-ink-3">Dibuat oleh:</span> {task.createdByName}
                </div>
                <div className="text-ink-3">{task.createdAtFormatted}</div>
                <div className="mt-1">
                  <span className="text-ink-3">Kategori:</span> {task.categoryName}
                </div>
                <div>
                  <span className="text-ink-3">Prioritas:</span>{" "}
                  {PRIORITY_LABEL[task.priority] ?? task.priority}
                </div>
                <div>
                  <span className="text-ink-3">Divisi:</span> {task.divisionName}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        task={{
          assignmentId: task.assignmentId,
          taskId: task.id,
          taskNumber: task.taskNumber,
          title: task.title,
          version: task.currentVersion,
        }}
        onSuccess={handleSubmissionSuccess}
        onSubmitAction={createSubmissionOrchestrator(task.assignmentId)}
      />
    </div>
  );
}
