"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "@/app/icons";
import { MOCK_MASTER_CATEGORIES } from "@/lib/mock-master";
import { MOCK_PRIORITIES } from "@/lib/mock-division-members";
import {
  CANONICAL_FILE_TYPES,
  DEFAULT_APP_SETTINGS,
  MOCK_DIVISION_SETTINGS,
  type AppSettings,
  type DivisionSettings,
} from "@/lib/mock-settings";
import type { Role } from "@/db/schema";

interface SettingsClientProps {
  role: Role;
  userDivisionId?: string;
  initialTab?: SettingsTab;
}

export type SettingsTab = "divisi" | "sistem";

export default function SettingsClient({
  role,
  userDivisionId = "div_hukum",
  initialTab = "divisi",
}: SettingsClientProps) {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSuperAdmin && initialTab === "sistem" ? "sistem" : "divisi",
  );
  // State untuk Tab Divisi
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(
    isSuperAdmin ? "div_hukum" : userDivisionId,
  );
  const [divisionsData, setDivisionsData] = useState<Record<string, DivisionSettings>>(
    MOCK_DIVISION_SETTINGS,
  );

  // Form state Divisi yang sedang aktif diedit
  const currentDivision = divisionsData[selectedDivisionId] || MOCK_DIVISION_SETTINGS["div_hukum"]!;
  const [contactEmail, setContactEmail] = useState(currentDivision.contactEmail);
  const [defaultCategory, setDefaultCategory] = useState(currentDivision.defaultCategoryId);
  const [defaultPriority, setDefaultPriority] = useState(currentDivision.defaultPriority);
  const [divisionFormErrors, setDivisionFormErrors] = useState<{ email?: string }>({});

  // State untuk Tab Sistem
  const [systemSettings, setSystemSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [maxFileMb, setMaxFileMb] = useState(systemSettings.maxFileMb);
  const [maxFiles, setMaxFiles] = useState(systemSettings.maxFilesPerSubmission);
  const [allowedTypes, setAllowedTypes] = useState<string[]>([...systemSettings.allowedTypes]);
  const [dueSoonDays, setDueSoonDays] = useState(systemSettings.dueSoonDays);
  const [systemFormErrors, setSystemFormErrors] = useState<{
    fileSize?: string;
    fileCount?: string;
    types?: string;
    dueSoon?: string;
  }>({});

  // Feedback Notifikasi
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Kategori aktif untuk pilihan form
  const activeCategories = MOCK_MASTER_CATEGORIES.filter((c) => c.isActive);

  // Pergantian divisi terpilih (khusus Super Admin)
  const handleSelectDivision = (divId: string) => {
    setSelectedDivisionId(divId);
    const target = divisionsData[divId] || MOCK_DIVISION_SETTINGS[divId];
    if (target) {
      setContactEmail(target.contactEmail);
      setDefaultCategory(target.defaultCategoryId);
      setDefaultPriority(target.defaultPriority);
      setDivisionFormErrors({});
    }
  };

  // Reset form divisi ke state tersimpan saat ini
  const handleResetDivisionForm = () => {
    setContactEmail(currentDivision.contactEmail);
    setDefaultCategory(currentDivision.defaultCategoryId);
    setDefaultPriority(currentDivision.defaultPriority);
    setDivisionFormErrors({});
  };

  // Simpan form divisi
  const handleSaveDivisionSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string } = {};

    if (contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail.trim())) {
        errors.email = "Format alamat surel kontak divisi tidak valid.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setDivisionFormErrors(errors);
      return;
    }

    setDivisionFormErrors({});
    setDivisionsData((prev) => ({
      ...prev,
      [selectedDivisionId]: {
        ...currentDivision,
        contactEmail: contactEmail.trim(),
        defaultCategoryId: defaultCategory,
        defaultPriority,
      },
    }));

    showNotification(
      `Pengaturan divisi ${currentDivision.name} (${currentDivision.code}) berhasil disimpan dan dicatat ke log audit.`,
    );
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
    setMaxFileMb(systemSettings.maxFileMb);
    setMaxFiles(systemSettings.maxFilesPerSubmission);
    setAllowedTypes([...systemSettings.allowedTypes]);
    setDueSoonDays(systemSettings.dueSoonDays);
    setSystemFormErrors({});
  };

  // Simpan form sistem
  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      fileSize?: string;
      fileCount?: string;
      types?: string;
      dueSoon?: string;
    } = {};

    if (maxFileMb < 1 || maxFileMb > 10) {
      errors.fileSize = "Ukuran berkas hanya boleh diatur antara 1 sampai 10 MB (hanya boleh menurunkan).";
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
    const nowFormatted = "20 Okt 2026 " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    setSystemSettings({
      maxFileMb,
      maxFilesPerSubmission: maxFiles,
      allowedTypes,
      dueSoonDays,
      updatedBy: "Super Admin",
      updatedAtFormatted: nowFormatted,
    });

    showNotification("Kebijakan berkas dan ambang tenggat seluruh institusi berhasil diperbarui.");
  };

  // IDs untuk aksesibilitas form
  const contactEmailId = useId();
  const defaultCategoryId = useId();
  const defaultPriorityId = useId();
  const divisionSelectId = useId();
  const maxFileMbId = useId();
  const maxFilesId = useId();
  const dueSoonDaysId = useId();

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

      {/* Spanduk Notifikasi Sukses */}
      {notification ? (
        <div
          role="status"
          className="rounded-lg border border-success/30 bg-success-surface p-4 text-body-sm font-semibold text-success flex items-center gap-2"
        >
          <Icon name="centang" size={16} />
          <span>{notification}</span>
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
                      {Object.values(divisionsData).map((d) => (
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
                  value={currentDivision.name}
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
                  value={currentDivision.code}
                  className="rounded-md border border-border bg-neutral-surface px-3 py-2 text-body font-mono text-ink-2"
                />
                <p className="text-body-sm text-ink-3">
                  3 huruf kapital, dipakai pada nomor tugas.
                </p>
              </div>

              {/* Kepala Divisi (Read-Only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-body-sm font-medium text-ink-2">Kepala divisi</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentDivision.head}
                  className="rounded-md border border-border bg-neutral-surface px-3 py-2 text-body text-ink-2"
                />
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
                <label htmlFor={defaultCategoryId} className="text-body-sm font-medium text-ink">
                  Kategori default
                </label>
                <select
                  id={defaultCategoryId}
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  className="rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                >
                  {activeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
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
                  onChange={(e) =>
                    setDefaultPriority(e.target.value as DivisionSettings["defaultPriority"])
                  }
                  className="rounded-md border border-border-strong bg-surface px-3 py-2 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                >
                  {MOCK_PRIORITIES.map((p) => (
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
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              >
                Simpan Pengaturan
              </button>
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
                  {CANONICAL_FILE_TYPES.map((type) => {
                    const isSelected = allowedTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        role="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleFileType(type)}
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
                        {type}
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
                    Wajib Aktif
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
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                    <Icon name="centang" size={12} className="text-success" />
                    Terhubung
                  </span>
                </div>
                <p className="text-body-sm text-ink-3">
                  Gateway pesan WhatsApp. Pengiriman diproses Worker dengan backoff 5 percobaan.
                </p>
              </div>

              {/* Kanal 3: Email Gateway */}
              <div className="rounded-lg border border-border bg-neutral-surface p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-body font-semibold text-ink">Surel (Email Gateway)</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-body-sm font-medium text-ink-2">
                    <Icon name="centang" size={12} className="text-success" />
                    Terkonfigurasi
                  </span>
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
              Perubahan berlaku untuk seluruh divisi setelah disimpan.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetSystemForm}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-body-sm font-semibold text-ink-2 hover:bg-neutral-surface active:bg-neutral-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              >
                Simpan Pengaturan
              </button>
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
