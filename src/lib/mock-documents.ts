/**
 * Data mock murni untuk Katalog Dokumen Final (L13).
 * Berkas ini 100% di sisi frontend, menjadi acuan kontrak antarmuka kearsipan.
 */

export interface FinalDocumentFile {
  id: string;
  name: string;
  sizeFormatted: string;
  checksum: string;
  downloadUrl?: string;
}

export interface FinalDocument {
  id: string;
  taskId: string;
  taskNumber: string;
  title: string;
  categoryName: string;
  divisionName: string;
  divisionCode: string;
  recipientName: string;
  archivedDateFormatted: string;
  archivedDateTimeFormatted: string;
  archivedDaysAgo: number;
  submissionVersion: number;
  files: FinalDocumentFile[];
}

export const MOCK_FINAL_DOCUMENTS: FinalDocument[] = [
  {
    id: "doc_1",
    taskId: "tsk_huk_1",
    taskNumber: "HUK/2026/10/002",
    title: "Rekap Berita Acara Rapat Pleno",
    categoryName: "Persuratan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Ahmad Fauzi",
    archivedDateFormatted: "17 Okt 2026",
    archivedDateTimeFormatted: "17 Okt 2026 14:20 WIB",
    archivedDaysAgo: 1,
    submissionVersion: 1,
    files: [
      {
        id: "f_doc_1_1",
        name: "rekap-berita-acara-rapat.pdf",
        sizeFormatted: "2,1 MB",
        checksum: "c13a90f7",
        downloadUrl: "#",
      },
      {
        id: "f_doc_1_2",
        name: "lampiran-daftar-hadir.xlsx",
        sizeFormatted: "340 KB",
        checksum: "9b41e2c8",
        downloadUrl: "#",
      },
    ],
  },
  {
    id: "doc_2",
    taskId: "tsk_huk_3",
    taskNumber: "HUK/2026/10/001",
    title: "Dokumen C1 Pleno Rekapitulasi",
    categoryName: "Kearsipan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Siti Rahma",
    archivedDateFormatted: "15 Okt 2026",
    archivedDateTimeFormatted: "15 Okt 2026 16:45 WIB",
    archivedDaysAgo: 3,
    submissionVersion: 1,
    files: [
      {
        id: "f_doc_2_1",
        name: "dokumen-c1-pleno-rekap.pdf",
        sizeFormatted: "5,4 MB",
        checksum: "e34b12aa",
        downloadUrl: "#",
      },
    ],
  },
  {
    id: "doc_3",
    taskId: "tsk_huk_2",
    taskNumber: "HUK/2026/09/021",
    title: "Dokumentasi Kegiatan Pengawasan",
    categoryName: "Kegiatan dan Laporan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Budi Santoso",
    archivedDateFormatted: "2 Okt 2026",
    archivedDateTimeFormatted: "2 Okt 2026 09:15 WIB",
    archivedDaysAgo: 16,
    submissionVersion: 2,
    files: [
      {
        id: "f_doc_3_1",
        name: "laporan-kegiatan-pengawasan.pdf",
        sizeFormatted: "3,2 MB",
        checksum: "7c02b8da",
        downloadUrl: "#",
      },
      {
        id: "f_doc_3_2",
        name: "foto-dokumentasi-lapangan.zip",
        sizeFormatted: "8,6 MB",
        checksum: "4f91b012",
        downloadUrl: "#",
      },
      {
        id: "f_doc_3_3",
        name: "daftar-hadir-peserta.pdf",
        sizeFormatted: "420 KB",
        checksum: "8a11e4f3",
        downloadUrl: "#",
      },
    ],
  },
  {
    id: "doc_4",
    taskId: "tsk_huk_4",
    taskNumber: "HUK/2026/09/014",
    title: "Rekap Berita Acara Rapat Koordinasi",
    categoryName: "Persuratan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Ahmad Fauzi",
    archivedDateFormatted: "28 Sep 2026",
    archivedDateTimeFormatted: "28 Sep 2026 11:30 WIB",
    archivedDaysAgo: 20,
    submissionVersion: 1,
    files: [
      {
        id: "f_doc_4_1",
        name: "berita-acara-rakor-kota.pdf",
        sizeFormatted: "1,8 MB",
        checksum: "d412e88a",
        downloadUrl: "#",
      },
      {
        id: "f_doc_4_2",
        name: "notula-kesepakatan-bersama.docx",
        sizeFormatted: "650 KB",
        checksum: "3e5a7b19",
        downloadUrl: "#",
      },
    ],
  },
  {
    id: "doc_5",
    taskId: "tsk_huk_5",
    taskNumber: "HUK/2026/08/009",
    title: "Laporan Bulanan Divisi Agustus",
    categoryName: "Kegiatan dan Laporan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Dewi Lestari",
    archivedDateFormatted: "4 Sep 2026",
    archivedDateTimeFormatted: "4 Sep 2026 15:00 WIB",
    archivedDaysAgo: 44,
    submissionVersion: 1,
    files: [
      {
        id: "f_doc_5_1",
        name: "laporan-bulanan-agustus.pdf",
        sizeFormatted: "2,9 MB",
        checksum: "6b18c44e",
        downloadUrl: "#",
      },
    ],
  },
  {
    id: "doc_6",
    taskId: "tsk_huk_6",
    taskNumber: "HUK/2026/08/004",
    title: "Berkas Sengketa Pemilu Kasus A",
    categoryName: "Kepatuhan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Hendra Pratama",
    archivedDateFormatted: "22 Agu 2026",
    archivedDateTimeFormatted: "22 Agu 2026 13:40 WIB",
    archivedDaysAgo: 57,
    submissionVersion: 1,
    files: [
      {
        id: "f_doc_6_1",
        name: "kronologi-permohonan-sengketa.pdf",
        sizeFormatted: "1,4 MB",
        checksum: "b1093aef",
        downloadUrl: "#",
      },
      {
        id: "f_doc_6_2",
        name: "bukti-surat-keterangan.pdf",
        sizeFormatted: "3,8 MB",
        checksum: "e8812c40",
        downloadUrl: "#",
      },
      {
        id: "f_doc_6_3",
        name: "risalah-klarifikasi-saksi.pdf",
        sizeFormatted: "2,2 MB",
        checksum: "57f901ab",
        downloadUrl: "#",
      },
      {
        id: "f_doc_6_4",
        name: "putusan-musyawarah-tertutup.pdf",
        sizeFormatted: "1,7 MB",
        checksum: "a310c921",
        downloadUrl: "#",
      },
    ],
  },
  {
    id: "doc_7",
    taskId: "tsk_huk_7",
    taskNumber: "HUK/2026/07/017",
    title: "Surat Tugas Pengawasan Kampanye",
    categoryName: "Persuratan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Rina Wulandari",
    archivedDateFormatted: "9 Agu 2026",
    archivedDateTimeFormatted: "9 Agu 2026 10:20 WIB",
    archivedDaysAgo: 70,
    submissionVersion: 1,
    files: [
      {
        id: "f_doc_7_1",
        name: "surat-tugas-pengawasan-kampanye.pdf",
        sizeFormatted: "850 KB",
        checksum: "910ae2ff",
        downloadUrl: "#",
      },
    ],
  },
  {
    id: "doc_8",
    taskId: "tsk_huk_8",
    taskNumber: "HUK/2026/06/006",
    title: "Rekap Hasil Kepatuhan Semester I",
    categoryName: "Kepatuhan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Budi Santoso",
    archivedDateFormatted: "14 Jul 2026",
    archivedDateTimeFormatted: "14 Jul 2026 16:10 WIB",
    archivedDaysAgo: 96,
    submissionVersion: 1,
    files: [
      {
        id: "f_doc_8_1",
        name: "rekap-kepatuhan-semester-1.pdf",
        sizeFormatted: "4,1 MB",
        checksum: "11e4b89c",
        downloadUrl: "#",
      },
      {
        id: "f_doc_8_2",
        name: "matriks-temuan-pengawasan.xlsx",
        sizeFormatted: "1,2 MB",
        checksum: "88a32df1",
        downloadUrl: "#",
      },
    ],
  },
];
