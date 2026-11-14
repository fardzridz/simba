import type { TaskDetail } from "@/db/queries/task-detail";

/**
 * Fixture tes untuk komponen detail dan reviu tugas (L07 dan L11).
 *
 * Berkas ini **hanya dipakai oleh tes** dan tidak pernah diimpor kode produksi.
 * Ia menggantikan `src/lib/mock-task-detail.ts` yang dihapus: berkas itu tinggal
 * di `src/lib/` bersama kode produksi, memuat data karangan, dan mudah disangka
 * sebagai sumber data sungguhan.
 *
 * Tipenya `TaskDetail` asli, bukan tipe mock terpisah. Dengan begitu fixture ini
 * ikut gagal saat tipe nyata berubah, sehingga tes tidak bisa diam-diam menguji
 * bentuk data yang sudah tidak dipakai aplikasi.
 */

/** Tugas staf yang sudah mengumpulkan dan diminta revisi. */
export const TASK_DETAIL_REVISI: TaskDetail = {
  id: "tsk_huk_1",
  assignmentId: "asg_huk_1",
  taskNumber: "HUK/2026/10/007",
  title: "Laporan Hasil Pengawasan Wilayah A",
  description:
    "Laksanakan pengawasan menyeluruh terhadap pleno rekapitulasi di wilayah A. Pastikan berita acara dan formulir Model C1 hasil pleno telah diverifikasi secara akurat dan ditandatangani oleh saksi yang sah.",
  divisionName: "Hukum & Sengketa",
  categoryName: "Kegiatan dan Laporan",
  priority: "MENDESAK",
  status: "SEDANG_DIKERJAKAN",
  needsRevision: true,
  isOverdue: false,
  assignedStaffName: "Ahmad Fauzi",
  assignedStaffInitials: "AF",
  dueAtFormatted: "18 Okt 2026 23:59 WIB",
  remainingFormatted: "Sisa 1 hari",
  createdByName: "Admin Hukum & Sengketa",
  createdAtFormatted: "12 Okt 2026 09:14 WIB",
  currentVersion: 1,
  submissionHistory: [
    {
      version: 1,
      submittedAtFormatted: "14 Okt 2026 16:40 WIB",
      reviewStatus: "REVISION_REQUIRED",
      reviewStatusLabel: "Perlu Revisi",
      submitterNotes:
        "Hasil pengawasan wilayah A, sudah ditandatangani koordinator lapangan.",
      adminFeedback:
        "Tanda tangan saksi belum lengkap pada berkas lampiran berita acara. Mohon lengkapi dan serahkan kembali hasil pemindaian terbaru.",
      reviewedByName: "Admin Hukum & Sengketa",
      reviewedAtFormatted: "15 Okt 2026 08:30 WIB",
      files: [
        {
          id: "f_1",
          name: "laporan-pengawasan-wilayah-a.pdf",
          sizeFormatted: "1,8 MB",
          checksum: "a91f4c0e",
          downloadUrl: "#",
        },
        {
          id: "f_2",
          name: "dokumentasi-lapangan.zip",
          sizeFormatted: "4,2 MB",
          checksum: "7c02b8da",
          downloadUrl: "#",
        },
      ],
    },
  ],
};

/** Tugas yang belum dikerjakan dan belum punya riwayat pengumpulan. */
export const TASK_DETAIL_BELUM_DIMULAI: TaskDetail = {
  id: "tsk_huk_2",
  assignmentId: "asg_huk_2",
  taskNumber: "HUK/2026/10/002",
  title: "Penyusunan Berita Acara Pleno Rekapitulasi",
  description:
    "Susun naskah berita acara resmi pleno rekapitulasi hasil pemilu tingkat kota berdasarkan data sah kecamatan.",
  divisionName: "Hukum & Sengketa",
  categoryName: "Persuratan",
  priority: "SEDANG",
  status: "BELUM_DIKERJAKAN",
  needsRevision: false,
  isOverdue: false,
  assignedStaffName: "Budi Santoso",
  assignedStaffInitials: "BS",
  dueAtFormatted: "21 Okt 2026 23:59 WIB",
  remainingFormatted: "Sisa 3 hari",
  createdByName: "Admin Hukum & Sengketa",
  createdAtFormatted: "13 Okt 2026 10:00 WIB",
  currentVersion: 0,
  submissionHistory: [],
};

/** Tugas yang menunggu verifikasi admin, dengan satu pengumpulan. */
export const TASK_DETAIL_MENUNGGU_VERIFIKASI: TaskDetail = {
  id: "tsk_huk_3",
  assignmentId: "asg_huk_3",
  taskNumber: "HUK/2026/10/003",
  title: "Pengunggahan Dokumen C1 Pleno",
  description:
    "Unggah berkas pindaian C1 plano yang telah ditandatangani seluruh komisioner untuk pengarsipan digital.",
  divisionName: "Hukum & Sengketa",
  categoryName: "Kearsipan",
  priority: "TINGGI",
  status: "MENUNGGU_VERIFIKASI",
  needsRevision: false,
  isOverdue: true,
  assignedStaffName: "Siti Rahma",
  assignedStaffInitials: "SR",
  waitingDurationFormatted: "1 hari 3 jam",
  dueAtFormatted: "17 Okt 2026 23:59 WIB",
  remainingFormatted: "Terlambat 1 hari",
  createdByName: "Admin Hukum & Sengketa",
  createdAtFormatted: "11 Okt 2026 14:20 WIB",
  currentVersion: 1,
  submissionHistory: [
    {
      version: 1,
      submittedAtFormatted: "16 Okt 2026 11:15 WIB",
      reviewStatus: "PENDING",
      reviewStatusLabel: "Menunggu Verifikasi",
      submitterNotes: "Pindaian dokumen C1 lengkap dari 12 TPS terpilih.",
      files: [
        {
          id: "f_c1_1",
          name: "dokumen-c1-pleno-final.pdf",
          sizeFormatted: "5,4 MB",
          checksum: "e34b12aa",
          downloadUrl: "#",
        },
      ],
    },
  ],
};
