"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../../../loading-state";
import { PRIORITY_OPTIONS } from "@/lib/task-options";
import { updateTask, type TaskFieldErrors } from "../../actions";
import type {
  CategoryOption,
  DivisionMemberOption,
  TaskEditAssignee,
  TaskEditData,
} from "@/db/queries/form-data";
import type { AssignmentStatus, Priority } from "@/db/schema";

export interface TaskEditClientProps {
  task: TaskEditData;
  members: DivisionMemberOption[];
  categories: CategoryOption[];
}

/** Penanda status penerima yang terkunci pada daftar form (§12 #2). */
const LOCKED_STATUS_LABEL: Record<AssignmentStatus, string> = {
  BELUM_DIKERJAKAN: "Belum dikerjakan",
  SEDANG_DIKERJAKAN: "Sudah dimulai",
  MENUNGGU_VERIFIKASI: "Menunggu verifikasi",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export default function TaskEditClient({
  task,
  members,
  categories,
}: TaskEditClientProps) {
  const router = useRouter();

  const lockedAssignees = task.assignees.filter((a) => !a.removable);
  const toggleableAssignees = task.assignees.filter((a) => a.removable);

  // Gabungan id penerima yang selalu ikut dikirim ke server.
  const lockedIds = useMemo(
    () => lockedAssignees.map((a) => a.userId),
    [lockedAssignees],
  );

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [category, setCategory] = useState(
    categories.some((c) => c.id === task.categoryId) ? task.categoryId : "",
  );
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [startDate, setStartDate] = useState(task.startDateInput);
  const [dueDate, setDueDate] = useState(task.dueDateInput);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(
    toggleableAssignees.map((a) => a.userId),
  );
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  const [errors, setErrors] = useState<TaskFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleInputId = useId();
  const descInputId = useId();
  const categoryInputId = useId();
  const priorityInputId = useId();
  const startInputId = useId();
  const dueInputId = useId();
  const staffSearchId = useId();

  const storedCategoryActive = categories.some((c) => c.id === task.categoryId);

  // Pencarian hanya mencakup anggota yang masih dapat dilepas di dalam form ini
  // (penerima terkunci selalu tampil dengan penjelasannya).
  const searchPool = useMemo(
    () => members.filter((m) => !task.assignees.some((a) => a.userId === m.id)),
    [members, task.assignees],
  );
  const filteredStaff = useMemo(() => {
    const q = staffSearchQuery.trim().toLowerCase();
    if (!q) return searchPool;
    return searchPool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.roleLabel.toLowerCase().includes(q),
    );
  }, [searchPool, staffSearchQuery]);

  const allToggleableIds = useMemo(
    () =>
      [
        ...toggleableAssignees.map((a) => a.userId),
        ...searchPool.map((m) => m.id),
      ].sort(),
    [toggleableAssignees, searchPool],
  );

  const handleToggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
    if (errors.staffIds) {
      setErrors((e) => ({ ...e, staffIds: undefined }));
    }
  };

  const handleSelectAllStaff = () => {
    if (
      selectedStaffIds.length === allToggleableIds.length &&
      allToggleableIds.every((id) => selectedStaffIds.includes(id))
    ) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(allToggleableIds);
    }
    if (errors.staffIds) {
      setErrors((e) => ({ ...e, staffIds: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: TaskFieldErrors = {};

    if (!title.trim()) {
      newErrors.title = "Judul tugas wajib diisi.";
    }
    if (!category) {
      newErrors.categoryId = "Kategori wajib dipilih.";
    }
    if (!dueDate) {
      newErrors.dueDate = "Tenggat waktu wajib diisi.";
    } else if (startDate && dueDate < startDate) {
      newErrors.dueDate = "Tenggat tidak boleh lebih awal daripada tanggal mulai.";
    }
    if (selectedStaffIds.length + lockedIds.length === 0) {
      newErrors.staffIds = "Pilih minimal satu penerima penugasan.";
    }

    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await updateTask({
        taskId: task.id,
        title,
        description: description.trim() || undefined,
        categoryId: category,
        priority,
        startDate: startDate || undefined,
        dueDate,
        staffIds: [...lockedIds, ...selectedStaffIds],
      });

      if (result.fields) {
        setErrors(result.fields);
        return;
      }
      if (result.error) {
        setFormError(result.error);
        return;
      }
      router.push(`/tasks/${task.id}`);
    } catch {
      setFormError("Penyimpanan perubahan gagal diproses. Coba beberapa saat lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasDueDateError = Boolean(errors.dueDate);
  const hasCategoryError = Boolean(errors.categoryId);

  const staffRowClass = (locked: boolean) =>
    `flex items-center justify-between gap-3 p-2.5 transition-colors ${
      locked ? "opacity-75 bg-neutral-surface/60" : "hover:bg-neutral-surface/60 cursor-pointer"
    }`;

  const renderAssigneeRow = (assignee: TaskEditAssignee) => {
    const locked = !assignee.removable;
    const checked = locked ? true : selectedStaffIds.includes(assignee.userId);
    return (
      <label
        key={assignee.userId}
        className={staffRowClass(locked)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <input
            type="checkbox"
            checked={checked}
            disabled={locked}
            title={
              locked
                ? "Penerima ini selalu tetap pada tugas karena statusnya sudah berjalan."
                : undefined
            }
            onChange={() => handleToggleStaff(assignee.userId)}
            className="h-4 w-4 rounded border-border-strong text-primary accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-surface border border-border text-[10px] font-semibold text-ink-2 shrink-0">
            {assignee.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("")}
          </span>
          <span className="font-medium text-body-sm text-ink truncate">
            {assignee.name}
          </span>
        </div>
        <span className="text-body-sm text-ink-3 shrink-0 ml-2 text-right">
          {LOCKED_STATUS_LABEL[assignee.status]}
        </span>
      </label>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-page">
      {/* Tautan Navigasi Kembali */}
      <div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <span className="text-body-sm" aria-hidden="true">
            ←
          </span>
          Kembali ke Tugas Divisi
        </Link>
      </div>

      {/* Header Halaman */}
      <div>
        <h1 className="text-h1 font-semibold text-ink">Ubah Tugas</h1>
        <p className="mt-1 text-body text-ink-3">
          Perbarui rincian surat perintah tugas {task.taskNumber} di Divisi {task.divisionName}.
        </p>
      </div>

      {/* Tugas sudah final: tidak ada form, hanya penjelasan yang jujur. */}
      {!task.editable ? (
        <div className="card p-6 flex flex-col gap-4">
          <div
            role="alert"
            className="rounded-md border border-warning/30 bg-warning-surface p-3 text-body-sm font-medium text-warning"
          >
            {task.lockedReason ?? "Tugas ini tidak dapat diubah lagi."}
          </div>
          <p className="text-body-sm text-ink-3">
            Data penugasan yang sudah selesai atau dibatalkan tidak diubah lewat form agar
            riwayat verifikasi tetap konsisten.
          </p>
          <div>
            <Link
              href={`/tasks/${task.id}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink hover:bg-neutral-surface transition-colors"
            >
              Buka Detail Tugas
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="card p-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-8 desktop:grid-cols-12">
              {/* Kolom Kiri: Detail Informasi Tugas (7 Kolom) */}
              <div className="flex flex-col gap-5 desktop:col-span-7">
                {/* Judul Tugas */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={titleInputId} className="text-body-sm font-medium text-ink">
                    Judul tugas <span className="text-error text-body-sm">*wajib</span>
                  </label>
                  <input
                    id={titleInputId}
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors((err) => ({ ...err, title: undefined }));
                    }}
                    className={`h-10 w-full rounded-md border bg-surface px-3 text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light ${
                      errors.title ? "border-error focus-visible:outline-error" : "border-border"
                    }`}
                  />
                  {errors.title ? (
                    <span className="text-body-sm font-medium text-error">{errors.title}</span>
                  ) : null}
                </div>

                {/* Deskripsi Instruksi */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={descInputId} className="text-body-sm font-medium text-ink">
                    Deskripsi penugasan (opsional)
                  </label>
                  <textarea
                    id={descInputId}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface p-3 text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  />
                  {errors.description ? (
                    <span className="text-body-sm font-medium text-error">{errors.description}</span>
                  ) : null}
                </div>

                {/* Baris Kategori & Prioritas */}
                <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={categoryInputId} className="text-body-sm font-medium text-ink">
                      Kategori <span className="text-error text-body-sm">*wajib</span>
                    </label>
                    <select
                      id={categoryInputId}
                      required
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        if (errors.categoryId) {
                          setErrors((err) => ({ ...err, categoryId: undefined }));
                        }
                      }}
                      className={`h-10 w-full rounded-md border bg-surface px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light ${
                        hasCategoryError ? "border-error" : "border-border"
                      }`}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId ? (
                      <span className="text-body-sm font-medium text-error">{errors.categoryId}</span>
                    ) : null}
                    {!storedCategoryActive ? (
                      <p className="text-body-sm font-medium text-warning">
                        Kategori tersimpan pada tugas ini sedang nonaktif atau tidak tersedia,
                        jadi pilih kategori aktif sebelum menyimpan.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={priorityInputId} className="text-body-sm font-medium text-ink">
                      Prioritas
                    </label>
                    <select
                      id={priorityInputId}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Baris Tanggal Mulai & Tenggat */}
                <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={startInputId} className="text-body-sm font-medium text-ink">
                      Tanggal mulai
                    </label>
                    <input
                      id={startInputId}
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (errors.startDate) {
                          setErrors((err) => ({ ...err, startDate: undefined }));
                        }
                        if (errors.dueDate && e.target.value <= dueDate) {
                          setErrors((err) => ({ ...err, dueDate: undefined }));
                        }
                      }}
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                    />
                    {errors.startDate ? (
                      <span className="text-body-sm font-medium text-error">{errors.startDate}</span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={dueInputId} className="text-body-sm font-medium text-ink">
                      Tenggat <span className="text-error text-body-sm">*wajib</span>
                    </label>
                    <input
                      id={dueInputId}
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        if (errors.dueDate && (!startDate || e.target.value >= startDate)) {
                          setErrors((err) => ({ ...err, dueDate: undefined }));
                        }
                      }}
                      className={`h-10 w-full rounded-md border bg-surface px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light ${
                        hasDueDateError ? "border-error focus-visible:outline-error" : "border-border"
                      }`}
                    />
                  </div>
                </div>

                {/* Pesan Galat & Catatan Edukasi */}
                {errors.dueDate ? (
                  <p className="text-body-sm font-medium text-error">{errors.dueDate}</p>
                ) : null}

                <div className="text-body-sm text-ink-3 space-y-1 border-t border-border pt-3">
                  <p>Tenggat diperlakukan sebagai 23:59:59 WIB.</p>
                  <p>
                    Perpanjangan tenggat pada tugas berjalan dilakukan lewat tombol Perpanjang
                    Tenggat di halaman detail, dan setiap perubahan tercatat di log aktivitas.
                  </p>
                </div>
              </div>

              {/* Kolom Kanan: Penerima Tugas & Nomor Mono (5 Kolom) */}
              <div className="flex flex-col gap-5 desktop:col-span-5 desktop:border-l desktop:border-border desktop:pl-8">
                {/* Seksi Penerima */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="font-medium text-ink">
                      Penerima <span className="text-error text-body-sm">*wajib</span>
                    </span>
                    {allToggleableIds.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleSelectAllStaff}
                        className="font-semibold text-primary hover:underline text-body-sm"
                      >
                        {allToggleableIds.length > 0 &&
                        allToggleableIds.every((id) => selectedStaffIds.includes(id))
                          ? "Batal pilih semua"
                          : "Pilih semua"}
                      </button>
                    ) : null}
                  </div>

                  <p className="text-body-sm text-ink-3">
                    Penerima yang sudah mulai atau menunggu verifikasi selalu tetap pada tugas ini;
                    hanya penerima berstatus Belum Dikerjakan yang dapat dilepas.
                  </p>

                  {/* Pencarian Anggota */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
                      <Icon name="cari" size={15} />
                    </span>
                    <input
                      id={staffSearchId}
                      type="text"
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      placeholder="Cari nama anggota divisi..."
                      className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                    />
                  </div>

                  {/* Daftar Pilihan Anggota: penerima terlibat lebih dulu */}
                  <div
                    role="group"
                    aria-label="Daftar penerima penugasan"
                    className={`max-h-[260px] overflow-y-auto rounded-md border bg-surface divide-y divide-border ${
                      errors.staffIds ? "border-error" : "border-border"
                    }`}
                  >
                    {lockedAssignees.map((assignee) => (
                      <div key={`locked-${assignee.userId}`}>
                        {renderAssigneeRow(assignee)}
                      </div>
                    ))}
                    {toggleableAssignees.map((assignee) => (
                      <div key={`current-${assignee.userId}`}>
                        {renderAssigneeRow(assignee)}
                      </div>
                    ))}
                    {lockedAssignees.length + toggleableAssignees.length > 0 &&
                    filteredStaff.length > 0 ? (
                      <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3 bg-surface-sunken">
                        Anggota lain
                      </div>
                    ) : null}
                    {filteredStaff.map((staff) => {
                      const isSelected = selectedStaffIds.includes(staff.id);
                      return (
                        <label
                          key={staff.id}
                          className="flex items-center justify-between p-2.5 hover:bg-neutral-surface/60 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStaff(staff.id)}
                              className="h-4 w-4 rounded border-border-strong text-primary accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                            />
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-surface border border-border text-[10px] font-semibold text-ink-2 shrink-0">
                              {staff.initials}
                            </span>
                            <span className="font-medium text-body-sm text-ink truncate">
                              {staff.name}
                            </span>
                          </div>
                          <span className="text-body-sm text-ink-3 shrink-0 ml-2">
                            {staff.roleLabel}
                          </span>
                        </label>
                      );
                    })}
                    {filteredStaff.length === 0 && lockedAssignees.length === 0 ? (
                      <div className="p-4 text-center text-body-sm text-ink-3">
                        Tidak ada anggota yang cocok dengan pencarian.
                      </div>
                    ) : null}
                  </div>

                  {errors.staffIds ? (
                    <span className="text-body-sm font-medium text-error">{errors.staffIds}</span>
                  ) : null}

                  <div className="flex items-center justify-between text-body-sm text-ink-3">
                    <span className="font-semibold text-ink">
                      {lockedIds.length + selectedStaffIds.length} pegawai dipilih
                    </span>
                    <span>
                      Menampilkan {filteredStaff.length} dari {searchPool.length} anggota yang dapat diubah.
                    </span>
                  </div>
                </div>

                {/* Seksi Nomor Tugas Mono */}
                <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                  <label className="text-body-sm font-medium text-ink">
                    Nomor tugas (tetap)
                  </label>
                  <div className="h-10 w-full rounded-md border border-border bg-surface-sunken px-3 flex items-center font-mono text-body text-ink">
                    {task.taskNumber}
                  </div>
                  <p className="text-body-sm text-ink-3">
                    Nomor tugas tidak berubah saat pengubahan rincian tugas.
                  </p>
                </div>
              </div>
            </div>

            {/* Pesan galat Umum Server */}
            {formError ? (
              <div
                role="alert"
                className="rounded-md border border-error/30 bg-error-surface p-3 text-body-sm font-medium text-error"
              >
                {formError}
              </div>
            ) : null}

            {/* Baris Tombol Aksi Bawah */}
            <div className="flex flex-col gap-3 border-t border-border pt-5 tablet:flex-row tablet:items-center tablet:justify-between">
              <p className="text-body-sm text-ink-3">
                Perubahan disimpan langsung ke data penugasan divisi.
              </p>

              <div className="flex items-center justify-end gap-3">
                <Link
                  href={`/tasks/${task.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body font-semibold text-ink hover:bg-neutral-surface active:bg-border transition-colors"
                >
                  Batal
                </Link>

                <LoadingButton
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  loadingText="Menyimpan..."
                  className="h-10 px-5 text-body"
                >
                  Simpan Perubahan
                </LoadingButton>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
