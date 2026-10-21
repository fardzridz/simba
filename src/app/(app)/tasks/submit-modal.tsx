"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../loading-state";

/**
 * Batasan bisnis pengumpulan tugas sesuai RANCANGAN-SISTEM-v2.md §8 dan wireframe L08:
 * - Ukuran maksimum per berkas: 10 MB (10 * 1024 * 1024 bytes)
 * - Jumlah maksimum berkas: 5 berkas
 * - Tipe berkas yang diizinkan: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG
 * - Catatan opsional: maksimum 2.000 karakter
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_COUNT = 5;
export const MAX_NOTES_LENGTH = 2000;

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
] as const;

export type ModalPhase =
  | "idle"
  | "validating"
  | "uploading"
  | "committing"
  | "done"
  | "rolled_back";

export interface SelectedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  error?: string;
}

export interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    assignmentId: string;
    taskId: string;
    taskNumber: string;
    title: string;
    version?: number;
  } | null;
  /**
   * Callback ketika pengumpulan berhasil diselesaikan di frontend.
   * Dipanggil saat status berubah menjadi "done".
   */
  onSuccess?: (submission: {
    assignmentId: string;
    notes: string;
    files: Array<{ name: string; size: number }>;
  }) => void;
  /**
   * Handler opsional untuk menghubungkan pemanggilan API backend rekan developer.
   * Jika tidak disediakan, modal menjalankan simulasi alur unggah & commit yang mulus di sisi klien.
   */
  onSubmitAction?: (payload: {
    assignmentId: string;
    notes: string;
    files: File[];
    onProgress: (fileIndex: number, percent: number) => void;
  }) => Promise<{ success: boolean; version?: number; error?: string }>;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1).replace(".", ",");
    return `${kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
  return `${mb} MB`;
}

function isValidExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}


export default function SubmitModal({
  isOpen,
  onClose,
  task,
  onSuccess,
  onSubmitAction,
}: SubmitModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("idle");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<
    Array<{ name: string; size: number; reason: string }>
  >([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState<number>(1);

  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const taskNumberId = useId();

  // Reset form saat modal dibuka dengan tugas baru
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      setPhase("idle");
      setNotes("");
      setFiles([]);
      setRejectedFiles([]);
      setErrorMessage(null);
      setVersionNumber((task?.version ?? 0) + 1);

      // Kunci scroll latar belakang
      document.body.style.overflow = "hidden";

      // Fokuskan elemen pertama di dalam modal
      setTimeout(() => {
        const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "";
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, task]);

  // Penanganan Escape dan Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Wireframe L08: "Esc tidak menutup modal saat committing atau uploading"
        if (phase === "uploading" || phase === "committing") {
          e.preventDefault();
          return;
        }
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        if (!firstElement || !lastElement) return;
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, phase, onClose]);

  // Validasi berkas saat ditambah. Dihitung di luar updater React karena
  // StrictMode menjalankan updater dua kali di pengembangan; efek samping di
  // dalamnya akan menggandakan berkas terpilih.
  const filesRef = useRef<SelectedFileItem[]>(files);
  filesRef.current = files;

  const processFiles = useCallback((incomingFiles: File[]) => {
    const rejected: Array<{ name: string; size: number; reason: string }> = [];
    const combined = [...filesRef.current];
    const accepted: SelectedFileItem[] = [];

    for (const file of incomingFiles) {
      // Cek ekstensi
      if (!isValidExtension(file.name)) {
        rejected.push({
          name: file.name,
          size: file.size,
          reason: "Ditolak, format berkas tidak diizinkan.",
        });
        continue;
      }

      // Cek ukuran
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push({
          name: file.name,
          size: file.size,
          reason: `Ditolak, melebihi batas 10 MB (${formatFileSize(file.size)}).`,
        });
        continue;
      }

      // Cek duplikasi nama
      if (combined.some((item) => item.name === file.name)) {
        rejected.push({
          name: file.name,
          size: file.size,
          reason: "Berkas dengan nama sama sudah dipilih.",
        });
        continue;
      }

      // Cek batas total jumlah berkas
      if (combined.length + accepted.length >= MAX_FILE_COUNT) {
        rejected.push({
          name: file.name,
          size: file.size,
          reason: `Ditolak, maksimal ${MAX_FILE_COUNT} berkas per pengumpulan.`,
        });
        continue;
      }

      accepted.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
      });
    }

    const next = [...combined, ...accepted];
    filesRef.current = next;
    setRejectedFiles(rejected);
    setFiles(next);
  }, []);

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      // Reset input agar memilih berkas yang sama tetap memicu event
      e.target.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (phase !== "idle") return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (phase !== "idle") return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id: string) => {
    if (phase !== "idle") return;
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // Eksekusi pengumpulan tugas
  const handleSubmit = async () => {
    if (!task || files.length === 0 || phase !== "idle") return;

    setPhase("uploading");
    setErrorMessage(null);

    try {
      if (onSubmitAction) {
        // Jalankan action terhubung dari backend rekan
        const result = await onSubmitAction({
          assignmentId: task.assignmentId,
          notes,
          files: files.map((f) => f.file),
          onProgress: (index, percent) => {
            setFiles((prev) =>
              prev.map((item, idx) =>
                idx === index ? { ...item, progress: percent } : item,
              ),
            );
          },
        });

        if (!result.success) {
          throw new Error(result.error || "Gagal menyimpan pengumpulan.");
        }

        if (result.version) {
          setVersionNumber(result.version);
        }
      } else {
        // Simulasi alur pengunggahan bertahap yang presisi sesuai wireframe L08
        for (let i = 0; i < files.length; i++) {
          for (let p = 20; p <= 100; p += 20) {
            await delay(80);
            setFiles((prev) =>
              prev.map((item, idx) =>
                idx === i ? { ...item, progress: p } : item,
              ),
            );
          }
        }

        // Transisi ke phase #4 committing
        setPhase("committing");
        await delay(400);
      }

      // Transisi ke phase #5 done
      setPhase("done");
      if (onSuccess) {
        onSuccess({
          assignmentId: task.assignmentId,
          notes,
          files: files.map((f) => ({ name: f.name, size: f.size })),
        });
      }
    } catch (err: unknown) {
      // Transisi ke phase #6 rolled_back
      setPhase("rolled_back");
      const msg =
        err instanceof Error ? err.message : "Pengumpulan gagal disimpan.";
      setErrorMessage(msg);
    }
  };

  if (!isOpen || !task) return null;

  const isLocked = phase === "uploading" || phase === "committing";
  const canSubmit = files.length > 0 && phase === "idle";
  const uploadedCount = files.filter((f) => f.progress === 100).length;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 transition-opacity duration-150"
      onClick={(e) => {
        // Klik di backdrop menutup modal hanya jika tidak terkunci
        if (e.target === e.currentTarget && !isLocked) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={taskNumberId}
        className="w-full max-w-[560px] rounded-lg border border-border bg-surface p-6 shadow-card-hover flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 id={titleId} className="text-h2 font-semibold text-ink">
              Kumpulkan Tugas
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <span
                id={taskNumberId}
                className="font-mono text-body-sm font-medium text-ink-3 tracking-wide"
              >
                {task.taskNumber}
              </span>
              <span className="text-body-sm text-ink-3">·</span>
              <span className="text-body-sm text-ink-2 truncate max-w-[280px]">
                {task.title}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLocked}
            aria-label="Tutup dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-3 transition-colors hover:bg-neutral-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="tutup" size={16} />
          </button>
        </div>

        {/* Status Banner untuk Phase DONE (#5) */}
        {phase === "done" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-success/30 bg-success-surface p-4 text-left">
              <div className="flex items-center gap-2 text-success font-semibold text-body">
                <Icon name="centang" size={18} />
                <span>Pengumpulan tersimpan sebagai Versi {versionNumber}.</span>
              </div>
              <p className="mt-1 text-body-sm text-ink-2">
                Status tugas diperbarui menjadi{" "}
                <span className="font-semibold text-ink">Menunggu Verifikasi</span>.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-ink-2">
                Berkas yang berhasil diserahkan:
              </span>
              <ul className="divide-y divide-border rounded-md border border-border bg-surface-sunken p-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between py-2 px-2 text-body-sm"
                  >
                    <span className="font-medium text-ink truncate max-w-[320px]">
                      {file.name}
                    </span>
                    <span className="rounded bg-success/15 px-2 py-0.5 text-body-sm font-semibold text-success">
                      Tersimpan
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-body-sm text-ink-3">
                Pemberitahuan otomatis terkirim ke Admin Divisi untuk diperiksa.
              </p>
            </div>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-body font-semibold text-on-dark transition-colors hover:bg-primary-hover active:bg-primary-active"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : phase === "rolled_back" ? (
          /* Status Banner untuk Phase ROLLED_BACK (#6) */
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-error/30 bg-error-surface p-4 text-left">
              <div className="flex items-center gap-2 text-error font-semibold text-body">
                <Icon name="terlambat" size={18} />
                <span>Pengumpulan gagal disimpan.</span>
              </div>
              <p className="mt-1 text-body-sm text-ink-2">
                {errorMessage ?? "Tidak ada perubahan status pada tugas ini."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-ink-2">
                Status berkas:
              </span>
              <ul className="divide-y divide-border rounded-md border border-border bg-surface-sunken p-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between py-2 px-2 text-body-sm"
                  >
                    <span className="font-medium text-ink truncate max-w-[300px]">
                      {file.name}
                    </span>
                    <span className="text-body-sm text-ink-3">
                      Terunggah, belum tersimpan
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-body-sm text-ink-3">
                Berkas sisa dibersihkan otomatis oleh sistem dalam 24 jam.
              </p>
            </div>

            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink hover:bg-neutral-surface"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase("idle");
                  handleSubmit();
                }}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-body font-semibold text-on-dark transition-colors hover:bg-primary-hover active:bg-primary-active"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        ) : (
          /* Formulir Pengumpulan (#1 idle, #2 validating, #3 uploading, #4 committing) */
          <div className="flex flex-col gap-4">
            {/* Input Catatan (opsional) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-body-sm">
                <label
                  htmlFor="submit-notes"
                  className="font-medium text-ink-2"
                >
                  Catatan (opsional)
                </label>
                <span className="text-ink-3">
                  {notes.length}/{MAX_NOTES_LENGTH}
                </span>
              </div>
              <textarea
                id="submit-notes"
                disabled={isLocked}
                rows={3}
                maxLength={MAX_NOTES_LENGTH}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan keterangan berkas, ringkasan pekerjaan, atau catatan perbaikan..."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light disabled:cursor-not-allowed disabled:bg-surface-sunken"
              />
            </div>

            {/* Dropzone Unggah Berkas */}
            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-ink-2">
                Lampiran Berkas (Wajib)
              </span>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isLocked) fileInputRef.current?.click();
                }}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? "border-primary bg-primary-surface/40"
                    : "border-border-strong bg-neutral-surface/40 hover:bg-neutral-surface"
                } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  disabled={isLocked}
                  accept={ALLOWED_EXTENSIONS.join(",")}
                  onChange={handleFileInputChange}
                  className="sr-only"
                />

                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-surface text-ink-2">
                  <Icon name="unggah" size={20} />
                </span>

                <p className="mt-2 text-body font-medium text-ink">
                  Seret berkas ke sini atau{" "}
                  <span className="text-primary underline underline-offset-2">
                    pilih berkas
                  </span>
                </p>

                <p className="mt-1 text-body-sm text-ink-3">
                  PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Maksimal 5 berkas, 10 MB per berkas.
                </p>
              </div>
            </div>

            {/* Area Pengumuman Galat / Berkas Ditolak */}
            <div aria-live="polite">
              {rejectedFiles.length > 0 ? (
                <div className="rounded-md border border-error/30 bg-error-surface p-3 text-body-sm">
                  <span className="font-semibold text-error">
                    Beberapa berkas tidak dapat diterima:
                  </span>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-error">
                    {rejectedFiles.map((rf, idx) => (
                      <li key={idx}>
                        <span className="font-medium">{rf.name}</span>: {rf.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Daftar Berkas Terpilih & Bilah Progres */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-body-sm">
                <span className="font-medium text-ink-2">
                  Daftar Berkas Terpilih ({files.length}/{MAX_FILE_COUNT})
                </span>
                {files.length === 0 ? (
                  <span className="text-ink-3">Belum ada berkas terpilih</span>
                ) : null}
              </div>

              {files.length > 0 ? (
                <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                  {files.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-1.5 p-3 text-body-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon name="dokumen" size={16} className="text-ink-3 shrink-0" />
                          <span className="truncate font-medium text-ink">
                            {item.name}
                          </span>
                          <span className="shrink-0 text-ink-3 text-body-sm">
                            ({formatFileSize(item.size)})
                          </span>
                        </div>

                        {phase === "uploading" ? (
                          <span className="shrink-0 font-mono text-body-sm font-semibold text-primary">
                            {item.progress}%
                          </span>
                        ) : !isLocked ? (
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            aria-label={`Hapus ${item.name}`}
                            className="text-ink-3 transition-colors hover:text-error"
                          >
                            <Icon name="tutup" size={14} />
                          </button>
                        ) : null}
                      </div>

                      {/* Bar Progres Pengunggahan */}
                      {phase === "uploading" ? (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full bg-primary transition-all duration-150"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Tombol Aksi Bawah */}
            <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLocked}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink transition-colors hover:bg-neutral-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <LoadingButton
                type="button"
                variant="primary"
                disabled={!canSubmit || isLocked}
                loading={phase === "uploading" || phase === "committing"}
                loadingText={
                  phase === "uploading"
                    ? `Mengunggah ${uploadedCount} dari ${files.length}`
                    : "Menyimpan..."
                }
                onClick={handleSubmit}
                className="h-9 px-4 text-body"
              >
                Kirim Pengumpulan
              </LoadingButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
