/**
 * Data mock murni untuk fitur Kelola Master (L17).
 * 100% di sisi frontend, menjadi acuan kontrak antarmuka pengelolaan data master.
 */

export interface MasterUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  divisionName: string;
  divisionCode: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  roleLabel: string;
  isActive: boolean;
  lastLoginFormatted: string;
}

export interface MasterDivision {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  isActive: boolean;
  createdAtFormatted: string;
}

export interface MasterCategory {
  id: string;
  name: string;
  taskCount: number;
  isActive: boolean;
  createdAtFormatted: string;
}

export const MOCK_MASTER_USERS: MasterUser[] = [
  {
    id: "usr_sa",
    fullName: "Super Admin",
    username: "super.admin",
    email: "super.admin@contoh.local",
    divisionName: "Sekretariat",
    divisionCode: "SEK",
    role: "SUPER_ADMIN",
    roleLabel: "Super Admin",
    isActive: true,
    lastLoginFormatted: "17 Okt 2026 08:05",
  },
  {
    id: "usr_admin_hukum",
    fullName: "Admin Hukum & Sengketa",
    username: "admin.hukum",
    email: "admin.hukum@contoh.local",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    role: "ADMIN",
    roleLabel: "Admin Divisi",
    isActive: true,
    lastLoginFormatted: "17 Okt 2026 07:52",
  },
  {
    id: "usr_admin_pengawasan",
    fullName: "Admin Pengawasan",
    username: "admin.pengawasan",
    email: "admin.pengawasan@contoh.local",
    divisionName: "Pengawasan",
    divisionCode: "PGS",
    role: "ADMIN",
    roleLabel: "Admin Divisi",
    isActive: true,
    lastLoginFormatted: "16 Okt 2026 16:20",
  },
  {
    id: "usr_staf_hukum",
    fullName: "Staf Hukum & Sengketa",
    username: "staf.hukum",
    email: "staf.hukum@contoh.local",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    role: "USER",
    roleLabel: "Staf",
    isActive: true,
    lastLoginFormatted: "17 Okt 2026 09:05",
  },
  {
    id: "usr_staf_pengawasan",
    fullName: "Staf Pengawasan",
    username: "staf.pengawasan",
    email: "staf.pengawasan@contoh.local",
    divisionName: "Pengawasan",
    divisionCode: "PGS",
    role: "USER",
    roleLabel: "Staf",
    isActive: true,
    lastLoginFormatted: "15 Okt 2026 14:02",
  },
  {
    id: "usr_staf_lama",
    fullName: "Rendra Kusuma",
    username: "rendra.kusuma",
    email: "rendra.kusuma@contoh.local",
    divisionName: "Penindakan",
    divisionCode: "TND",
    role: "USER",
    roleLabel: "Staf",
    isActive: false,
    lastLoginFormatted: "30 Agu 2026 11:20",
  },
];

export const MOCK_MASTER_DIVISIONS: MasterDivision[] = [
  {
    id: "div_hukum",
    name: "Hukum & Sengketa",
    code: "HUK",
    memberCount: 8,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "div_pengawasan",
    name: "Pengawasan",
    code: "PGS",
    memberCount: 12,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "div_sdm",
    name: "SDM & Organisasi",
    code: "SDM",
    memberCount: 6,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "div_sekretariat",
    name: "Sekretariat",
    code: "SEK",
    memberCount: 14,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "div_penindakan",
    name: "Penindakan",
    code: "TND",
    memberCount: 8,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
];

export const MOCK_MASTER_CATEGORIES: MasterCategory[] = [
  {
    id: "cat_kegiatan_dan_laporan",
    name: "Kegiatan dan Laporan",
    taskCount: 142,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "cat_persuratan",
    name: "Persuratan",
    taskCount: 96,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "cat_kearsipan",
    name: "Kearsipan",
    taskCount: 48,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "cat_kepegawaian",
    name: "Kepegawaian",
    taskCount: 24,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "cat_keuangan",
    name: "Keuangan",
    taskCount: 36,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "cat_aset_bmn",
    name: "Aset/BMN",
    taskCount: 18,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "cat_kepatuhan",
    name: "Kepatuhan",
    taskCount: 28,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
  {
    id: "cat_sdm_dan_keamanan",
    name: "SDM dan Keamanan",
    taskCount: 9,
    isActive: true,
    createdAtFormatted: "1 Okt 2025",
  },
];
