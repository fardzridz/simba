import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TaskTable from "./task-table";
import TaskEditClient from "./[id]/edit/task-edit-client";
import type { TaskListItem } from "@/db/queries/tasks";
import type { TaskEditData } from "@/db/queries/form-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const MOCK_ITEMS: TaskListItem[] = [
  {
    assignmentId: "asg_1",
    taskId: "tsk_1",
    taskNumber: "HUK/2026/10/001",
    title: "Tugas Belum Dikerjakan",
    description: null,
    assignedUserId: "usr_1",
    categoryName: "Persuratan",
    priority: "SEDANG",
    status: "BELUM_DIKERJAKAN",
    dueAt: new Date(Date.now() + 86400000 * 3),
    completedAt: null,
    needsRevision: false,
    revisionCount: 0,
    startedAt: null,
    submittedAt: null,
    isArchived: false,
    assignedUserName: "Ahmad Fauzi",
  },
  {
    assignmentId: "asg_2",
    taskId: "tsk_2",
    taskNumber: "HUK/2026/10/002",
    title: "Tugas Sedang Dikerjakan",
    description: null,
    assignedUserId: "usr_2",
    categoryName: "Kearsipan",
    priority: "MENDESAK",
    status: "SEDANG_DIKERJAKAN",
    dueAt: new Date(Date.now() + 86400000),
    completedAt: null,
    needsRevision: false,
    revisionCount: 0,
    startedAt: new Date(),
    submittedAt: null,
    isArchived: false,
    assignedUserName: "Siti Rahma",
  },
  {
    assignmentId: "asg_3",
    taskId: "tsk_3",
    taskNumber: "HUK/2026/10/003",
    title: "Tugas Menunggu Verifikasi",
    description: null,
    assignedUserId: "usr_3",
    categoryName: "Kegiatan dan Laporan",
    priority: "TINGGI",
    status: "MENUNGGU_VERIFIKASI",
    dueAt: new Date(Date.now() + 86400000 * 2),
    completedAt: null,
    needsRevision: false,
    revisionCount: 0,
    startedAt: new Date(),
    submittedAt: new Date(),
    isArchived: false,
    assignedUserName: "Budi Santoso",
  },
  {
    assignmentId: "asg_4",
    taskId: "tsk_4",
    taskNumber: "HUK/2026/10/004",
    title: "Tugas Selesai",
    description: null,
    assignedUserId: "usr_4",
    categoryName: "Persuratan",
    priority: "RENDAH",
    status: "SELESAI",
    dueAt: new Date(Date.now() - 86400000 * 2),
    completedAt: new Date(Date.now() - 86400000 * 2),
    needsRevision: false,
    revisionCount: 0,
    startedAt: new Date(),
    submittedAt: new Date(),
    isArchived: true,
    assignedUserName: "Dewi Lestari",
  },
];

describe("Pemisahan Hak Akses dan Aksi Tabel Tugas per Role", () => {
  it("USER: hanya menampilkan aksi pelaksana (Mulai Kerjakan, Kumpulkan Tugas, Lihat Berkas, Unduh Bukti)", () => {
    const html = renderToStaticMarkup(<TaskTable items={MOCK_ITEMS} role="USER" />);

    expect(html).toContain("Mulai Kerjakan");
    expect(html).toContain("Kumpulkan Tugas");
    expect(html).toContain("Lihat Berkas");
    expect(html).toContain("Lihat Bukti Terarsip");

    // Pastikan tidak ada tombol aksi admin
    expect(html).not.toContain("Tinjau");
    expect(html).not.toContain("Ubah");
    expect(html).not.toContain("Batalkan");
  });

  it("ADMIN: menampilkan aksi pengelolaan (Tinjau, Ubah, Batalkan, Lihat)", () => {
    const html = renderToStaticMarkup(<TaskTable items={MOCK_ITEMS} role="ADMIN" />);

    expect(html).toContain("Tinjau");
    expect(html).toContain("Ubah");
    expect(html).toContain("Batalkan");
    expect(html).toContain("Lihat");

    // Pastikan tidak ada tombol aksi pelaksana
    expect(html).not.toContain("Mulai Kerjakan");
    expect(html).not.toContain("Kumpulkan Tugas");
    expect(html).not.toContain("Lihat Bukti Terarsip");
  });

  it("SUPER_ADMIN: akses baca-saja penuh, hanya menampilkan 'Lihat' di setiap baris", () => {
    const html = renderToStaticMarkup(<TaskTable items={MOCK_ITEMS} role="SUPER_ADMIN" />);

    expect(html).toContain("Lihat");

    // Dilarang keras ada aksi modifikasi untuk Super Admin sesuai L12
    expect(html).not.toContain("Tinjau");
    expect(html).not.toContain("Ubah");
    expect(html).not.toContain("Batalkan");
    expect(html).not.toContain("Mulai Kerjakan");
    expect(html).not.toContain("Kumpulkan Tugas");
  });
});

describe("Halaman Ubah Tugas Admin L10", () => {
  it("merender formulir ubah tugas dengan data awal terisi dan tombol Simpan Perubahan", () => {
    const task: TaskEditData = {
      id: "tsk_huk_1",
      taskNumber: "HUK/2026/10/001",
      divisionId: "div_hukum",
      divisionName: "Hukum & Sengketa",
      title: "Pengunggahan Dokumen C1 Pleno",
      description: "Unggah dokumen hasil rapat pleno ke portal.",
      categoryId: "cat_kegiatan",
      priority: "SEDANG",
      startDateInput: "2026-10-24",
      dueDateInput: "2026-10-30",
      assignees: [
        {
          userId: "usr_staf_hukum",
          name: "Ahmad Fauzi",
          status: "SEDANG_DIKERJAKAN",
          removable: false,
        },
        {
          userId: "usr_staf_hukum_2",
          name: "Siti Rahma",
          status: "BELUM_DIKERJAKAN",
          removable: true,
        },
      ],
      editable: true,
      lockedReason: null,
    };
    const html = renderToStaticMarkup(
      <TaskEditClient task={task} members={[]} categories={[]} />,
    );

    expect(html).toContain("Ubah Tugas");
    expect(html).toContain("Kembali ke Tugas Divisi");
    expect(html).toContain(task.title);
    expect(html).toContain(task.taskNumber);
    expect(html).toContain("Simpan Perubahan");
    expect(html).toContain("Batal");
    // Penerima terkunci tampil beserta statusnya dan tidak bisa dilepas.
    expect(html).toContain("Sudah dimulai");
    expect(html).toContain("Belum dikerjakan");
    expect(html).toContain('disabled=""');
  });
});
