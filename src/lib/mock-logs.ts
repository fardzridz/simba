/**
 * Data mock murni untuk Log Aktivitas / Audit Trail (L15).
 * 100% di sisi frontend, menjadi acuan kontrak antarmuka audit log.
 */

export interface MockActivityLog {
  id: string;
  timestampFormatted: string;
  daysAgo: number;
  actorName: string;
  actorRole: string;
  actionCode: string;
  entityType: string;
  entityId: string;
  summary: string;
  detailNote?: string;
  divisionName: string;
}

export const MOCK_ACTIVITY_LOGS: MockActivityLog[] = [
  {
    id: "log_1",
    timestampFormatted: "17 Okt 2026 09:05",
    daysAgo: 0,
    actorName: "Siti Rahma",
    actorRole: "Staf, Hukum & Sengketa",
    actionCode: "submission.created",
    entityType: "Penugasan",
    entityId: "HUK/2026/10/009",
    summary: "Versi 1 dikirim, status menjadi Menunggu Verifikasi.",
    divisionName: "Hukum & Sengketa",
  },
  {
    id: "log_2",
    timestampFormatted: "17 Okt 2026 08:30",
    daysAgo: 0,
    actorName: "Admin Hukum & Sengketa",
    actorRole: "Admin Divisi",
    actionCode: "due_date.extended",
    entityType: "Tugas",
    entityId: "HUK/2026/10/009",
    summary: "due_at: 16 Okt 2026 menjadi 17 Okt 2026.",
    detailNote: "Alasan: menunggu tanda tangan saksi.",
    divisionName: "Hukum & Sengketa",
  },
  {
    id: "log_3",
    timestampFormatted: "16 Okt 2026 15:05",
    daysAgo: 1,
    actorName: "Admin Hukum & Sengketa",
    actorRole: "Admin Divisi",
    actionCode: "assignment.reviewed",
    entityType: "Penugasan",
    entityId: "HUK/2026/10/007",
    summary: "Keputusan REVISION_REQUIRED, revisi ke-1.",
    detailNote: "Catatan: tanda tangan saksi belum lengkap.",
    divisionName: "Hukum & Sengketa",
  },
  {
    id: "log_4",
    timestampFormatted: "16 Okt 2026 14:40",
    daysAgo: 1,
    actorName: "Ahmad Fauzi",
    actorRole: "Staf, Hukum & Sengketa",
    actionCode: "submission.created",
    entityType: "Penugasan",
    entityId: "HUK/2026/10/007",
    summary: "Versi 1 dikirim, 2 berkas.",
    divisionName: "Hukum & Sengketa",
  },
  {
    id: "log_5",
    timestampFormatted: "15 Okt 2026 10:12",
    daysAgo: 2,
    actorName: "Super Admin",
    actorRole: "Super Admin",
    actionCode: "user.division_changed",
    entityType: "Pengguna",
    entityId: "staf.hukum",
    summary: "division_id: Sekretariat menjadi Hukum & Sengketa.",
    divisionName: "Sekretariat",
  },
  {
    id: "log_6",
    timestampFormatted: "14 Okt 2026 11:20",
    daysAgo: 3,
    actorName: "Admin Hukum & Sengketa",
    actorRole: "Admin Divisi",
    actionCode: "task.cancelled",
    entityType: "Tugas",
    entityId: "HUK/2026/10/017",
    summary: "Penugasan resmi dibatalkan.",
    detailNote: "Alasan: penerima pindah unit kerja dinas luar.",
    divisionName: "Hukum & Sengketa",
  },
  {
    id: "log_7",
    timestampFormatted: "13 Okt 2026 09:00",
    daysAgo: 4,
    actorName: "Admin Hukum & Sengketa",
    actorRole: "Admin Divisi",
    actionCode: "task.created",
    entityType: "Tugas",
    entityId: "HUK/2026/10/007",
    summary: "Surat perintah tugas diterbitkan kepada 3 staf.",
    divisionName: "Hukum & Sengketa",
  },
  {
    id: "log_8",
    timestampFormatted: "12 Okt 2026 08:00",
    daysAgo: 5,
    actorName: "admin.hukum",
    actorRole: "Admin Divisi",
    actionCode: "session.login",
    entityType: "Sesi",
    entityId: "usr_admin_hukum",
    summary: "Berhasil masuk ke portal dari peramban desktop.",
    divisionName: "Hukum & Sengketa",
  },
];
