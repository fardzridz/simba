/**
 * Data mock untuk Pengaturan Operasional (L18).
 * Menampung setelan tingkat sistem (kebijakan berkas & ambang tenggat)
 * serta nilai awal per divisi (kontak divisi, kategori default, prioritas default).
 */

export interface AppSettings {
  maxFileMb: number; // 1 - 10 MB (hanya boleh menurunkan)
  maxFilesPerSubmission: number; // 1 - 5 berkas
  allowedTypes: string[]; // subset dari 8 tipe kanonik
  dueSoonDays: number; // 1 - 30 hari
  updatedBy: string;
  updatedAtFormatted: string;
}

export interface DivisionSettings {
  id: string;
  name: string;
  code: string;
  head: string;
  contactEmail: string;
  defaultCategoryId: string;
  defaultPriority: "RENDAH" | "SEDANG" | "TINGGI" | "MENDESAK";
}

export const CANONICAL_FILE_TYPES = [
  "PDF",
  "DOC",
  "DOCX",
  "XLS",
  "XLSX",
  "JPG",
  "JPEG",
  "PNG",
] as const;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  maxFileMb: 10,
  maxFilesPerSubmission: 5,
  allowedTypes: [...CANONICAL_FILE_TYPES],
  dueSoonDays: 3,
  updatedBy: "Super Admin",
  updatedAtFormatted: "19 Okt 2026 10:00 WIB",
};

export const MOCK_DIVISION_SETTINGS: Record<string, DivisionSettings> = {
  div_hukum: {
    id: "div_hukum",
    name: "Hukum & Sengketa",
    code: "HUK",
    head: "Ahmad Fauzi",
    contactEmail: "hukum@bawaslu-pasuruan.go.id",
    defaultCategoryId: "cat_kegiatan_dan_laporan",
    defaultPriority: "SEDANG",
  },
  div_pengawasan: {
    id: "div_pengawasan",
    name: "Pengawasan",
    code: "PGS",
    head: "Siti Rahma",
    contactEmail: "pengawasan@bawaslu-pasuruan.go.id",
    defaultCategoryId: "cat_kegiatan_dan_laporan",
    defaultPriority: "SEDANG",
  },
  div_sdm: {
    id: "div_sdm",
    name: "SDM & Organisasi",
    code: "SDM",
    head: "Budi Santoso",
    contactEmail: "sdm@bawaslu-pasuruan.go.id",
    defaultCategoryId: "cat_kearsipan",
    defaultPriority: "SEDANG",
  },
  div_sekretariat: {
    id: "div_sekretariat",
    name: "Sekretariat",
    code: "SEK",
    head: "Hendra Pratama",
    contactEmail: "sekretariat@bawaslu-pasuruan.go.id",
    defaultCategoryId: "cat_persuratan",
    defaultPriority: "SEDANG",
  },
  div_penindakan: {
    id: "div_penindakan",
    name: "Penindakan",
    code: "TND",
    head: "Dewi Lestari",
    contactEmail: "penindakan@bawaslu-pasuruan.go.id",
    defaultCategoryId: "cat_kegiatan_dan_laporan",
    defaultPriority: "SEDANG",
  },
};
