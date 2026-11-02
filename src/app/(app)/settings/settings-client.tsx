"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../loading-state";
import { PRIORITY_OPTIONS } from "@/lib/task-options";
import { saveAppSettings, saveDivisionSettings } from "./actions";
import type { AppSettingsView, DivisionSettingsView } from "@/db/queries/settings";
import type { CategoryOption } from "@/db/queries/form-data";
import type { Priority, Role } from "@/db/schema";

/**
 * Chip tipe berkas: nilai mengikuti nilai kanonik yang diterima server
 * (CANONICAL_TYPES di lib/storage/settings, huruf kecil), label tampil kapital.
 */
const TYPE_CHIPS: Array<{ value: string; label: string }> = [
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "DOC" },
  { value: "docx", label: "DOCX" },
  { value: "xls", label: "XLS" },
  { value: "xlsx", label: "XLSX" },
  { value: "jpg", label: "JPG" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

interface SettingsClientProps {
  role: Role;
  userDivisionId?: string;
  appSettings: AppSettingsView;
  divisions: DivisionSettingsView[];
  categories: CategoryOption[];
  externalChannelsEnabled: boolean;
  initialTab?: SettingsTab;
}

export type SettingsTab = "divisi" | "sistem";

type Feedback = { tone: "success" | "error"; text: string } | null;

export default function SettingsClient({
  role,
  userDivisionId = "",
  appSettings,
  divisions,
  categories,
  externalChannelsEnabled,
  initialTab = "divisi",
}: SettingsClientProps) {
  const router = useRouter();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSuperAdmin && initialTab === "sistem" ? "sistem" : "divisi",
  );

  // Pemilih divisi Super Admin memakai divisi akun sebagai titik awal bila tersedia.
  const initialDivisionId =
    divisions.find((d) => d.id === userDivisionId)?.id ?? divisions[0]?.id ?? "";

  // State untuk Tab Divisi
  const [selectedDivisionId, setSelectedDivisionId] = useState(initialDivisionId);
  const [contactEmail, setContactEmail] = useState(
    divisions.find((d) => d.id === initialDivisionId)?.contactEmail ?? "",
  );
  const [defaultCategoryId, setDefaultCategoryId] = useState(
    divisions.find((d) => d.id === initialDivisionId)?.defaultCategoryActive
      ? divisions.find((d) => d.id === initialDivisionId)?.defaultCategoryId ?? ""
      : "",
  );
  const [defaultPriority, setDefaultPriority] = useState<Priority>(
    divisions.find((d) => d.id === initialDivisionId)?.defaultPriority ?? "SEDANG",
  );
  const [divisionFormErrors, setDivisionFormErrors] = useState<{ email?: string }>({});
  const [divisionFeedback, setDivisionFeedback] = useState<Feedback>(null);
  const [savingDivision, setSavingDivision] = useState(false);

  const currentDivision =
    divisions.find((d) => d.id === selectedDivisionId) ?? divisions[0];

  // State untuk Tab Sistem
  const [maxFileMb, setMaxFileMb] = useState(appSettings.maxFileMb);
  const [maxFiles, setMaxFiles] = useState(appSettings.maxFilesPerSubmission);
  const [allowedTypes, setAllowedTypes] = useState<string[]>([
    ...appSettings.allowedTypes,
  ]);
  const [dueSoonDays, setDueSoonDays] = useState(appSettings.dueSoonDays);
  const [systemFormErrors, setSystemFormErrors] = useState<{
    fileSize?: string;
    fileCount?: string;
    types?: string;
    dueSoon?: string;
  }>({});
  const [systemFeedback, setSystemFeedback] = useState<Feedback>(null);
  const [savingSystem, setSavingSystem] = useState(false);

  // Pergantian divisi terpilih (khusus Super Admin)
  const handleSelectDivision = (divId: string) => {
    setSelectedDivisionId(divId);
    const target = divisions.find((d) => d.id === divId);
    if (target) {
      setContactEmail(target.contactEmail ?? "");
      setDefaultCategoryId(
        target.defaultCategoryActive ? (target.defaultCategoryId ?? "") : "",
      );
      setDefaultPriority(target.defaultPriority);
      setDivisionFormErrors({});
      setDivisionFeedback(null);
    }
  };

  // Reset form divisi ke state tersimpan saat ini
  const handleResetDivisionForm = () => {
    if (!currentDivision) return;
    setContactEmail(currentDivision.contactEmail ?? "");
    setDefaultCategoryId(
      currentDivision.defaultCategoryActive
        ? (currentDivision.defaultCategoryId ?? "")
        : "",
    );
    setDefaultPriority(currentDivision.defaultPriority);
    setDivisionFormErrors({});
    setDivisionFeedback(null);
  };

  // Simpan form divisi
  const handleSaveDivisionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDivision) return;

    const email = contactEmail.trim();
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setDivisionFormErrors({
          email: "Format alamat surel kontak divisi tidak valid.",
        });
        return;
      }
    }

    setDivisionFormErrors({});
    setSavingDivision(true);
    setDivisionFeedback(null);

    try {
      const result = await saveDivisionSettings({
        divisionId: isSuperAdmin ? currentDivision.id : undefined,
        contactEmail: email,
        defaultCategoryId,
        defaultPriority,
      });

      if (result.error) {
        setDivisionFeedback({ tone: "error", text: result.error });
        return;
      }

      setDivisionFeedback({
        tone: "success",
        text: `Pengaturan divisi ${currentDivision.name} (${currentDivision.code}) tersimpan dan tercatat di log nilai lama dan baru.`,
      });
      router.refresh();
    } catch {
      setDivisionFeedback({
        tone: "error",
        text: "Penyimpanan gagal diproses. Coba beberapa saat lagi.",
      });
    } finally {
      setSavingDivision(false);
    }
  };

  // Toggle tipe berkas yang diterima pada tab Sistem
  const handleToggleFileType = (type: string) => {
    setAllowedTypes((prev) => {
      const exists = prev.includes(type);
      if (exists) {
        if (prev.length <= 1) {
          setSystemFormErrors((errs) => ({
            ...errs,
            types: "Minimal satu tipe berkas harus tetap aktif.",
          }));
          return prev;
        }
        setSystemFormErrors((errs) => ({ ...errs, types: undefined }));
        return prev.filter((t) => t !== type);
      }
      setSystemFormErrors((errs) => ({ ...errs, types: undefined }));
      return [...prev, type];
    });
  };

  // Reset form sistem ke state tersimpan saat ini
  const handleResetSystemForm = () => {
    setMaxFileMb(appSettings.maxFileMb);
    setMaxFiles(appSettings.maxFilesPerSubmission);
    setAllowedTypes([...appSettings.allowedTypes]);
    setDueSoonDays(appSettings.dueSoonDays);
    setSystemFormErrors({});
    setSystemFeedback(null);
  };

  // Simpan form sistem
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: typeof systemFormErrors = {};

    if (maxFileMb < 1 || maxFileMb > 10) {
      errors.fileSize =
        "Ukuran berkas hanya boleh diatur antara 1 sampai 10 MB (hanya boleh menurunkan).";
    }

    if (maxFiles < 1 || maxFiles > 5) {
      errors.fileCount = "Jumlah berkas per pengumpulan harus antara 1 sampai 5 berkas.";
    }

    if (allowedTypes.length === 0) {
      errors.types = "Pilih minimal satu tipe berkas yang diizinkan.";
    }

    if (dueSoonDays < 1 || dueSoonDays > 30) {
      errors.dueSoon = "Ambang tenggat dekat harus antara 1 sampai 30 hari.";
    }

    if (Object.keys(errors).length > 0) {
      setSystemFormErrors(errors);
      return;
    }

    setSystemFormErrors({});
    setSavingSystem(true);
    setSystemFeedback(null);

    try {
      const result = await saveAppSettings({
        maxFileMb,
        maxFilesPerSubmission: maxFiles,
        allowedTypes,
        dueSoonDays,
      });

      if (result.error) {
        setSystemFeedback({ tone: "error", text: result.error });
        return;
      }

      setSystemFeedback({
        tone: "success",
        text: "Kebijakan berkas dan ambang tenggat tersimpan dan tercatat di log nilai lama dan baru.",
      });
      router.refresh();
    } catch {
      setSystemFeedback({
        tone: "error",
        text: "Penyimpanan gagal diproses. Coba beberapa saat lagi.",
      });
    } finally {
      setSavingSystem(false);
    }
  };

  // IDs untuk aksesibilitas form
  const contactEmailId = useId();
  const defaultCatSelectId = useId();
  const defaultPriorityId = useId();
  const divisionSelectId = useId();
  const maxFileMbId = useId();
  const maxFilesId = useId();
  const dueSoonDaysId = useId();

  // Kategori default tersimpan nonaktif tidak ikut daftar; tampilkan penjelasannya saja.
  const storedDefaultInactive = Boolean(
    currentDivision?.defaultCategoryName && !currentDivision.defaultCategoryActive,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-h1 font-semibold text-ink">Pengaturan</h1>
        <p className="mt-1 text-body text-ink-3">
          {activeTab === "divisi"
            ? "Kontak divisi dan nilai awal form tugas."
            : "Kebijakan berkas dan ambang tenggat untuk seluruh institusi."}
        </p>
      </div>

      {/* Spanduk Notifikasi Form Divisi */}
      {divisionFeedback ? (
        <div
          role={divisionFeedback.tone === "error" ? "alert" : "status"}
          className={`rounded-lg border p-4 text-body-sm font-semibold flex items-center gap-2 ${
            divisionFeedback.tone === "error"
              ? "border-error/30 bg-error-surface text-error"
              : "border-success/30 bg-success-surface text-success"
          }`}
        >
          <Icon name={divisionFeedback.tone === "error" ? "tutup" : "centang"} size={16} />
          <span>{divisionFeedback.text}</span>
        </div>
      ) : null}

      {/* Spanduk Notifikasi Form Sistem */}
      {systemFeedback ? (
        <div
          role={systemFeedback.tone === "error" ? "alert" : "status"}
          className={`rounded-lg border p-4 text-body-sm font-semibold flex items-center gap-2 ${
            systemFeedback.tone === "error"
              ? "border-error/30 bg-error-surface text-error"
              : "border-success/30 bg-success-surface text-success"
          }`}
        >
          <Icon name={systemFeedback.tone === "error" ? "tutup" : "centang"} size={16} />
          <span>{systemFeedback.text}</span>
        </div>
      ) : null}

      {/* Tab Navigasi (Tab Sistem hanya terlihat untuk Super Admin) */}
      <div className="flex items-center gap-6 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("divisi")}
          className={`pb-2.5 text-body font-semibold transition-colors relative ${
            activeTab === "divisi" ? "text-ink" : "text-ink-3 hover:text-ink"
          }`}
        >
          Divisi
          {activeTab === "divisi" ? (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          ) : null}
        </button>

        {isSuperAdmin ? (
          <button
            type="button"
            onClick={() => setActiveTab("sistem")}
            className={`pb-2.5 text-body font-semibold transition-colors relative ${
              activeTab === "sistem" ? "text-ink" : "text-ink-3 hover:text-ink"
            }`}
          >
            Sistem
            {activeTab === "sistem" ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            ) : null}
          </button>
        ) : null}
      </div>

      {/* KONTEN TAB DIVISI */}
      {activeTab === "divisi" ? (
        <form onSubmit={handleSaveDivisionSettings} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
            {/* KARTU KIRI: Identitas Divisi */}
            <div className="card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-body font-semibold text-ink">Identitas divisi</h2>
                {isSuperAdmin ? (
                  <div className="flex items-center gap-2">
                    <label htmlFor={divisionSelectId} className="text-body-sm text-ink-3">
                      Pilih divisi:
                    </label>
                    <select
                      id={divisionSelectId}
                      value={selectedDivisionId}
                      onChange={(e) => handleSelectDivision(e.target.value)}
                      className="rounded-md border border-border-strong bg-surface px-2.5 py-1 text-body-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                    >
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="rounded-full bg-neutral-surface px-2.5 py-0.5 text-body-sm font-medium text-ink-3 border border-border">
                    Hanya divisi ini
                  </span>
                )}
              </div>

              {/* Nama Divisi (Read-Only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-body-sm font-medium text-ink-2">Nama divisi</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentDivision?.name ?? ""}
                  className="rounded-md border border-border bg-neutral-surface px-3 py-2 text-body text-ink-2"
                />
              </div>

              {/* Kode Divisi (Read-Only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-body-sm font-medium text-ink-2">Kode divisi</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentDivision?.code ?? ""}
                  className="rounded-md border border-border bg-neutral-surface px-3 py-2 text-body font-mono text-ink-2"
                />
                <p className="text-body-sm text-ink-3">
                  3 huruf kapital, dipakai pada nomor tugas.
                </p>
              </div>

              {/* Admin Divisi (Read-Only, diturunkan dari pengguna aktif) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-body-sm font-medium text-ink-2">Admin divisi</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentDivision?.adminName ?? "Belum ada admin aktif"}
                  className="rounded-md border border-border bg-neutral-surface px-3 py-2 text-body text-ink-2"
                />
                <p className="text-body-sm text-ink-3">
                  Diambil dari pengguna Admin aktif pertama di divisi ini.
                </p>
              </div>

              {/* Kontak Divisi (Dapat Diubah) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={contactEmailId} className="text-body-sm font-medium text-ink">
                  Kontak divisi
                </label>
                <input
                  id={contactEmailId}
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="surel@bawaslu-pasuruan.go.id"
                  className="rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                />
                {divisionFormErrors.email ? (
                  <p className="text-body-sm text-error">{divisionFormErrors.email}</p>
                ) : null}
                <p className="text-body-sm text-ink-3">
                  Identitas diubah di Kelola Master; kontak menjadi Reply-To email divisi.
                </p>
              </div>
            </div>

            {/* KARTU KANAN: Nilai Awal Form Tugas */}
            <div className="card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-body font-semibold text-ink">Nilai awal form tugas</h2>
                <span className="text-body-sm text-ink-3">Per divisi</span>
              </div>

              {/* Kategori Default */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={defaultCatSelectId} className="text-body-sm font-medium text-ink">
                  Kategori default
                </label>
                <select
                  id={defaultCatSelectId}
                  value={defaultCategoryId}
                  onChange={(e) => setDefaultCategoryId(e.target.value)}
                  className="rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                >
                  <option value="">Tanpa kategori default</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {storedDefaultInactive ? (
                  <p className="text-body-sm font-medium text-warning">
                    Kategori default tersimpan &quot;{currentDivision?.defaultCategoryName}&quot; sedang nonaktif
                    dan tidak bisa dipilih; simpan kategori lain atau biarkan kosong.
                  </p>
                ) : null}
                <p className="text-body-sm text-ink-3">
                  Dipakai saat Admin membuka form tugas baru. Kategori nonaktif tidak muncul di pilihan form.
                </p>
              </div>

              {/* Prioritas Default */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={defaultPriorityId} className="text-body-sm font-medium text-ink">
                  Prioritas default
                </label>
                <select
                  id={defaultPriorityId}
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value as Priority)}
                  className="rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-body-sm text-ink-3">
                  Nilai tetap bisa diubah per tugas. Tenggat selalu disimpan sampai 23:59:59 WIB.
                </p>
              </div>
            </div>
          </div>

          {/* Info Pengaturan Notifikasi Pegawai */}
          <div className="rounded-lg border border-info/30 bg-info-surface p-3.5 text-body-sm text-info flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-2">
            <span>
              Preferensi kanal notifikasi pribadi (Email &amp; WhatsApp) dikonfigurasi mandiri oleh setiap pegawai di menu <strong>Akun Saya</strong>.
            </span>
            <Link
              href="/account"
              className="font-semibold underline hover:text-primary transition-colors shrink-0"
            >
              Buka Pengaturan Akun Saya →
            </Link>
          </div>
          {/* Tindakan Form Divisi */}
          <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between pt-2">
            <p className="text-body-sm text-ink-3">
              Perubahan berlaku setelah disimpan.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetDivisionForm}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink-2 hover:bg-neutral-surface active:bg-neutral-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              >
                Batal
              </button>
              <LoadingButton
                type="submit"
                variant="primary"
                loading={savingDivision}
                loadingText="Menyimpan..."
                className="h-9 px-4 text-body-sm"
              >
                Simpan Pengaturan
              </LoadingButton>
            </div>
          </div>

          {/* Catatan Kaki Tab Divisi Sesuai Wireframe L18 */}
          <div className="rounded-lg bg-surface-sunken border border-border p-4 flex flex-col gap-1.5 text-body-sm text-ink-3">
            <p>• Tab Sistem hanya tampil untuk Super Admin.</p>
            <p>• Nilai awal hanya mengisi form; tidak mengubah tugas yang sudah ada.</p>
            <p>• Setiap simpan menulis log berisi nilai lama dan baru.</p>
            <p>• Batas berkas dan ambang tenggat diatur Super Admin di tab Sistem.</p>
          </div>
        </form>
      ) : null}

      {/* KONTEN TAB SISTEM (HANYA SUPER ADMIN) */}
      {activeTab === "sistem" && isSuperAdmin ? (
        <form onSubmit={handleSaveSystemSettings} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
            {/* KARTU KIRI: Kebijakan Berkas */}
            <div className="card p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-body font-semibold text-ink">Kebijakan berkas</h2>
                <span className="text-body-sm text-ink-3">Seluruh institusi</span>
              </div>

              {/* Ukuran Maksimum per Berkas */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={maxFileMbId} className="text-body-sm font-medium text-ink">
                  Ukuran maksimum per berkas (MB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={maxFileMbId}
                    type="number"
                    min={1}
                    max={10}
                    value={maxFileMb}
                    onChange={(e) => setMaxFileMb(Number(e.target.value))}
                    className="w-24 rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  />
                  <span className="text-body text-ink-2 font-medium">MB</span>
                </div>
                {systemFormErrors.fileSize ? (
                  <p className="text-body-sm text-error">{systemFormErrors.fileSize}</p>
                ) : null}
                <p className="text-body-sm text-ink-3">
                  Batas atas 10 MB mengikuti batas aplikasi; setelan hanya dapat menurunkan.
                </p>
              </div>

              {/* Jumlah Berkas per Pengumpulan */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={maxFilesId} className="text-body-sm font-medium text-ink">
                  Jumlah berkas per pengumpulan
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={maxFilesId}
                    type="number"
                    min={1}
                    max={5}
                    value={maxFiles}
                    onChange={(e) => setMaxFiles(Number(e.target.value))}
                    className="w-24 rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  />
                  <span className="text-body text-ink-2 font-medium">berkas</span>
                </div>
                {systemFormErrors.fileCount ? (
                  <p className="text-body-sm text-error">{systemFormErrors.fileCount}</p>
                ) : null}
                <p className="text-body-sm text-ink-3">
                  Termasuk semua lampiran (1 sampai 5 berkas).
                </p>
              </div>

              {/* Tipe Berkas yang Diterima (Chips Toggle) */}
              <div className="flex flex-col gap-2">
                <span className="text-body-sm font-medium text-ink">
                  Tipe berkas yang diterima
                </span>
                <div className="flex flex-wrap gap-2">
                  {TYPE_CHIPS.map((chip) => {
                    const isSelected = allowedTypes.includes(chip.value);
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleFileType(chip.value)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light ${
                          isSelected
                            ? "bg-neutral-surface border border-border-strong text-ink shadow-xs"
                            : "bg-surface border border-border text-ink-3 opacity-60 line-through"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 flex items-center justify-center">
                          {isSelected ? (
                            <Icon name="centang" size={13} />
                          ) : (
                            <Icon name="tutup" size={11} />
                          )}
                        </span>
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
                {systemFormErrors.types ? (
                  <p className="text-body-sm text-error">{systemFormErrors.types}</p>
                ) : null}
                <p className="text-body-sm text-ink-3">
                  Klik chip untuk menyalakan atau mematikan tipe. Chip tipe yang tersisa satu tidak dapat dimatikan, dan server tetap menolak subset kosong. Berkas di luar daftar ditolak server, bukan hanya di klien.
                </p>
              </div>
            </div>

            {/* KARTU KANAN: Ambang Tenggat Dekat */}
            <div className="card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-body font-semibold text-ink">Ambang tenggat dekat</h2>
                <span className="text-body-sm text-ink-3">Seluruh institusi</span>
              </div>

              {/* Sisa Waktu Dianggap Dekat */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={dueSoonDaysId} className="text-body-sm font-medium text-ink">
                  Sisa waktu dianggap dekat
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={dueSoonDaysId}
                    type="number"
                    min={1}
                    max={30}
                    value={dueSoonDays}
                    onChange={(e) => setDueSoonDays(Number(e.target.value))}
                    className="w-24 rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  />
                  <span className="text-body text-ink-2 font-medium">hari</span>
                </div>
                {systemFormErrors.dueSoon ? (
                  <p className="text-body-sm text-error">{systemFormErrors.dueSoon}</p>
                ) : null}
                <p className="text-body-sm text-ink-3">
                  Dipakai pada label Tugas Mendekati Tenggat dan tanda di tabel.
                </p>
                <p className="text-body-sm text-ink-3">
                  Batas 1 sampai 30 hari. Nilai di luar itu ditolak server.
                </p>
              </div>

              <div className="rounded-md border border-border bg-neutral-surface p-3.5 flex flex-col gap-1.5 text-body-sm text-ink-2">
                <p>• Pengumpulan setelah tenggat tetap diterima.</p>
                <p>• Statusnya ditandai terlambat pada tabel dan laporan.</p>
                <p>• Tenggat disimpan sampai 23:59:59 WIB.</p>
                <p>• Ambang ini tidak mengubah status tugas.</p>
              </div>
            </div>
          </div>

          {/* Status Kanal Notifikasi Sistem (Tingkat Institusi) */}
          <div className="card p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-body font-semibold text-ink">Infrastruktur Kanal Notifikasi Eksternal</h2>
                <p className="text-body-sm text-ink-3">
                  Status gateway notifikasi eksternal institusi sesuai rancangan v2.2 (§9.11).
                </p>
              </div>
              <span className="text-body-sm text-ink-3">Seluruh institusi</span>
            </div>

            <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
              {/* Kanal 1: In-App */}
              <div className="rounded-lg border border-border bg-neutral-surface p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-body font-semibold text-ink">Notifikasi In-App</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                    <Icon name="centang" size={12} className="text-success" />
                    Selalu Aktif
                  </span>
                </div>
                <p className="text-body-sm text-ink-3">
                  Sumber kebenaran utama sistem. Ditulis atomik dalam batch transaksi.
                </p>
              </div>

              {/* Kanal 2: WhatsApp Fonnte */}
              <div className="rounded-lg border border-border bg-neutral-surface p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-body font-semibold text-ink">WhatsApp (Fonnte)</span>
                  {externalChannelsEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                      <Icon name="centang" size={12} className="text-success" />
                      Dinyalakan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-body-sm font-medium text-ink-3">
                      <Icon name="tutup" size={11} />
                      Dimatikan sistem
                    </span>
                  )}
                </div>
                <p className="text-body-sm text-ink-3">
                  Gateway pesan WhatsApp. Pengiriman diproses Worker dengan backoff 5 percobaan.
                </p>
              </div>

              {/* Kanal 3: Email Gateway */}
              <div className="rounded-lg border border-border bg-neutral-surface p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-body font-semibold text-ink">Surel (Email Gateway)</span>
                  {externalChannelsEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                      <Icon name="centang" size={12} className="text-success" />
                      Dinyalakan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-body-sm font-medium text-ink-3">
                      <Icon name="tutup" size={11} />
                      Dimatikan sistem
                    </span>
                  )}
                </div>
                <p className="text-body-sm text-ink-3">
                  Domain instansi terverifikasi. Reply-To otomatis mengarah ke kontak divisi.
                </p>
              </div>
            </div>

            <div className="rounded-md border border-info/30 bg-info-surface p-3 text-body-sm text-info flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-2">
              <span>
                Pengaktifan kanal pengiriman untuk akun pribadi dikelola pegawai di menu <strong>Akun Saya</strong>.
              </span>
              <Link href="/account" className="font-semibold underline hover:text-primary transition-colors shrink-0">
                Buka Akun Saya →
              </Link>
            </div>
          </div>
          {/* Tindakan Form Sistem */}
          <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between pt-2">
            <p className="text-body-sm text-ink-3">
              {appSettings.updatedByName && appSettings.updatedAtFormatted
                ? `Terakhir disimpan oleh ${appSettings.updatedByName} pada ${appSettings.updatedAtFormatted}.`
                : "Belum pernah disimpan; nilai di kartu memakai default aplikasi."}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetSystemForm}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink-2 hover:bg-neutral-surface active:bg-neutral-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              >
                Batal
              </button>
              <LoadingButton
                type="submit"
                variant="primary"
                loading={savingSystem}
                loadingText="Menyimpan..."
                className="h-9 px-4 text-body-sm"
              >
                Simpan Pengaturan
              </LoadingButton>
            </div>
          </div>

          {/* Catatan Kaki Tab Sistem Sesuai Wireframe L18 */}
          <div className="rounded-lg bg-surface-sunken border border-border p-4 flex flex-col gap-1.5 text-body-sm text-ink-3">
            <p>• Tab ini hanya dibuka Super Admin. Admin Divisi tidak melihat tab Sistem.</p>
            <p>• Batas atas ukuran berkas 10 MB mengikuti batas aplikasi; setelan hanya dapat menurunkan.</p>
            <p>• Perubahan tidak berlaku surut untuk berkas dan tugas yang sudah ada.</p>
            <p>• Setiap simpan menulis log berisi nilai lama dan baru.</p>
          </div>
        </form>
      ) : null}
    </div>
  );
}
