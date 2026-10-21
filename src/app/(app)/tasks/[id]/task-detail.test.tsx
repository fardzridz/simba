import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TaskDetailClient from "./task-detail-client";
import { getMockTaskDetail } from "@/lib/mock-task-detail";

describe("TaskDetailClient L07", () => {
  it("merender informasi kepala tugas, nomor tugas mono, dan status", () => {
    const task = getMockTaskDetail("tsk_huk_1");
    const html = renderToStaticMarkup(<TaskDetailClient initialTask={task} />);

    expect(html).toContain("HUK/2026/10/007");
    expect(html).toContain("Laporan Hasil Pengawasan Wilayah A");
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).toContain("Perlu Revisi");
    expect(html).toContain("Tenggat:");
  });

  it("merender riwayat pengumpulan versi 1 beserta berkas dan catatan revisi admin", () => {
    const task = getMockTaskDetail("tsk_huk_1");
    const html = renderToStaticMarkup(<TaskDetailClient initialTask={task} />);

    expect(html).toContain("Riwayat Pengumpulan");
    expect(html).toContain("Versi 1");
    expect(html).toContain("laporan-pengawasan-wilayah-a.pdf");
    expect(html).toContain("1,8 MB · a91f4c0e");
    expect(html).toContain("Catatan pelaksana:");
    expect(html).toContain("Catatan admin:");
    expect(html).toContain("Tanda tangan saksi belum lengkap");
    expect(html).toContain("Diperiksa oleh Admin Hukum &amp; Sengketa");
  });

  it("merender kartu aksi dengan tombol Kumpulkan Tugas dan ketentuan berkas", () => {
    const task = getMockTaskDetail("tsk_huk_1");
    const html = renderToStaticMarkup(<TaskDetailClient initialTask={task} />);

    expect(html).toContain("Kumpulkan Tugas");
    expect(html).toContain("Ketentuan Berkas");
    expect(html).toContain("Tipe: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG");
    expect(html).toContain("Ukuran maksimal 10 MB per berkas");
    expect(html).toContain("Maksimal 5 berkas per pengumpulan");
    expect(html).toContain("Kembali ke Tugas Saya");
  });


  it("menampilkan status batal dan alasan dari data tugas, bukan kartu selesai", () => {
    const task = {
      ...getMockTaskDetail("tsk_huk_2"),
      status: "DIBATALKAN" as const,
      cancelReason: "Penerima pindah unit kerja.",
    };
    const html = renderToStaticMarkup(<TaskDetailClient initialTask={task} />);

    expect(html).toContain("Tugas Dibatalkan");
    expect(html).toContain("Penerima pindah unit kerja.");
    expect(html).not.toContain("Mulai Kerjakan");
  });

  it("menghasilkan data fallback yang aman untuk id tugas acak", () => {
    const task = getMockTaskDetail("tsk_acak_999");
    expect(task.id).toBe("tsk_acak_999");
    expect(task.taskNumber).toContain("HUK/2026/10/999");
    expect(task.title).toBeDefined();
  });
});
