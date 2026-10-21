import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TaskTable from "./task-table";
import type { TaskListItem } from "@/db/queries/tasks";

const MOCK_TASKS: TaskListItem[] = [
  {
    assignmentId: "asg_1",
    taskId: "tsk_1",
    taskNumber: "HUK/2026/10/007",
    title: "Laporan Hasil Pengawasan Wilayah A",
    description: "Periksa kelengkapan tanda tangan saksi",
    priority: "TINGGI",
    categoryName: "Pengawasan",
    assignedUserId: "usr_staf_hukum",
    assignedUserName: "Staf Hukum & Sengketa",
    status: "SEDANG_DIKERJAKAN",
    needsRevision: true,
    revisionCount: 1,
    dueAt: new Date(Date.now() + 86400 * 1000), // besok
    startedAt: new Date(),
    submittedAt: null,
    completedAt: null,
    isArchived: false,
  },
  {
    assignmentId: "asg_2",
    taskId: "tsk_2",
    taskNumber: "HUK/2026/10/012",
    title: "Rekap BA Pleno",
    description: "Rekapitulasi berita acara rapat pleno",
    priority: "SEDANG",
    categoryName: "Persuratan",
    assignedUserId: "usr_staf_hukum",
    assignedUserName: "Staf Hukum & Sengketa",
    status: "BELUM_DIKERJAKAN",
    needsRevision: false,
    revisionCount: 0,
    dueAt: new Date(Date.now() + 4 * 86400 * 1000),
    startedAt: null,
    submittedAt: null,
    completedAt: null,
    isArchived: false,
  },
  {
    assignmentId: "asg_3",
    taskId: "tsk_3",
    taskNumber: "HUK/2026/09/021",
    title: "Dokumentasi Kegiatan",
    description: "Dokumentasi dan arsip laporan",
    priority: "RENDAH",
    categoryName: "Kearsipan",
    assignedUserId: "usr_staf_hukum",
    assignedUserName: "Staf Hukum & Sengketa",
    status: "SELESAI",
    needsRevision: false,
    revisionCount: 0,
    dueAt: new Date(Date.now() - 5 * 86400 * 1000),
    startedAt: new Date(),
    submittedAt: new Date(),
    completedAt: new Date(),
    isArchived: true,
  },
];

describe("L06 TaskTable Component (wireframe L06-tugas-saya.svg)", () => {
  it("merender baris tabel lengkap dengan nomor tugas mono, kategori, dan tenggat", () => {
    const html = renderToStaticMarkup(
      <TaskTable items={MOCK_TASKS} isUserRole={true} />,
    );

    // Judul dan nomor mono
    expect(html).toContain("Laporan Hasil Pengawasan Wilayah A");
    expect(html).toContain("HUK/2026/10/007");
    expect(html).toContain("Rekap BA Pleno");
    expect(html).toContain("HUK/2026/10/012");

    // Status chip kanonik
    expect(html).toContain("Sedang Dikerjakan");
    expect(html).toContain("Belum Dikerjakan");
    expect(html).toContain("Selesai");

    // Flag tambahan
    expect(html).toContain("Perlu Revisi");
    expect(html).toContain("Terarsip");

    // Prioritas
    expect(html).toContain("Tinggi");
    expect(html).toContain("Sedang");
    expect(html).toContain("Rendah");

    // Tombol aksi yang sesuai status
    expect(html).toContain("Kumpulkan Tugas");
    expect(html).toContain("Mulai Kerjakan");
    expect(html).toContain("Lihat Bukti Terarsip");
  });

  it("menampilkan nama staf pelaksana bila dibuka oleh peran admin/pengawas", () => {
    const html = renderToStaticMarkup(
      <TaskTable items={MOCK_TASKS} isUserRole={false} />,
    );

    expect(html).toContain("Staf Hukum &amp; Sengketa");
  });
});
