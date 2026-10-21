/**
 * Data mock anggota divisi dan kategori dokumen untuk formulir penugasan (L10).
 * Murni di sisi frontend untuk kemudahan pengembangan tampilan,
 * menjadi acuan bentuk payload bagi rekan backend nantinya.
 */

export interface DivisionMember {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export const MOCK_DIVISION_MEMBERS: DivisionMember[] = [
  { id: "usr_staf_hukum", name: "Ahmad Fauzi", role: "Staf Pelaksana", initials: "AF" },
  { id: "usr_staf_hukum_2", name: "Siti Rahma", role: "Staf Pelaksana", initials: "SR" },
  { id: "usr_staf_hukum_3", name: "Budi Santoso", role: "Staf Pelaksana", initials: "BS" },
  { id: "usr_staf_hukum_4", name: "Dewi Lestari", role: "Staf Pelaksana", initials: "DL" },
  { id: "usr_staf_hukum_5", name: "Hendra Pratama", role: "Staf Pelaksana", initials: "HP" },
  { id: "usr_staf_hukum_6", name: "Rina Wulandari", role: "Staf Pelaksana", initials: "RW" },
  { id: "usr_staf_hukum_7", name: "Eko Prasetyo", role: "Staf Pelaksana", initials: "EP" },
  { id: "usr_staf_hukum_8", name: "Nur Aini", role: "Staf Pelaksana", initials: "NA" },
];

export const MOCK_CATEGORIES = [
  "Kegiatan dan Laporan",
  "Persuratan",
  "Kearsipan",
  "Kepegawaian",
  "Keuangan",
  "Aset/BMN",
  "Kepatuhan",
  "SDM dan Keamanan",
];

export const MOCK_PRIORITIES = [
  { value: "RENDAH", label: "Rendah" },
  { value: "SEDANG", label: "Sedang" },
  { value: "TINGGI", label: "Tinggi" },
  { value: "MENDESAK", label: "Mendesak" },
] as const;
