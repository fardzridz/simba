import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TaskDetailClient from "./task-detail-client";
import {
  TASK_DETAIL_BELUM_DIMULAI,
  TASK_DETAIL_MENUNGGU_VERIFIKASI,
  TASK_DETAIL_REVISI,
} from "./task-detail.fixture";

describe("TaskDetailClient L07", () => {
  it("merender informasi kepala tugas, nomor tugas mono, dan status", () => {
    const html = renderToStaticMarkup(
      <TaskDetailClient initialTask={TASK_DETAIL_REVISI} />,
    );

    expect(html).toContain("HUK/2026/10/007");
    expect(html).toContain("Laporan Hasil Pengawasan Wilayah A");
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).toContain("Perlu Revisi");
    expect(html).toContain("Tenggat:");
  });

  it("merender riwayat pengumpulan versi 1 beserta berkas dan catatan revisi admin", () => {
    const html = renderToStaticMarkup(
      <TaskDetailClient initialTask={TASK_DETAIL_REVISI} />,
    );

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
    const html = renderToStaticMarkup(
      <TaskDetailClient initialTask={TASK_DETAIL_REVISI} />,
    );

    expect(html).toContain("Kumpulkan Tugas");
    expect(html).toContain("Ketentuan Berkas");
    expect(html).toContain("Tipe: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG");
    expect(html).toContain("Ukuran maksimal 10 MB per berkas");
    expect(html).toContain("Maksimal 5 berkas per pengumpulan");
    expect(html).toContain("Kembali ke Tugas Saya");
  });

  it("menampilkan status batal dan alasan dari data tugas, bukan kartu selesai", () => {
    const task = {
      ...TASK_DETAIL_BELUM_DIMULAI,
      status: "DIBATALKAN" as const,
      cancelReason: "Penerima pindah unit kerja.",
    };
    const html = renderToStaticMarkup(<TaskDetailClient initialTask={task} />);

    expect(html).toContain("Tugas Dibatalkan");
    expect(html).toContain("Penerima pindah unit kerja.");
    expect(html).not.toContain("Mulai Kerjakan");
  });

  it("merender kartu Draf Pengumpulan beserta tombol hapus per berkas", () => {
    const task = {
      ...TASK_DETAIL_REVISI,
      draft: {
        version: 2,
        idempotencyKey: "sub_abcd1234abcd1234",
        files: [
          {
            id: "att_draf_1",
            name: "berkas-revisi.pdf",
            sizeFormatted: "512,0 KB",
            checksum: "a91f4c0e",
          },
        ],
      },
    };
    const html = renderToStaticMarkup(<TaskDetailClient initialTask={task} />);

    expect(html).toContain("Draf Pengumpulan");
    expect(html).toContain("draf Versi 2");
    expect(html).toContain("berkas-revisi.pdf");
    expect(html).toContain('aria-label="Hapus draf berkas-revisi.pdf"');
    // Draf tidak diberi tautan unduh: route unduhan hanya melayani COMMITTED.
    expect(html).not.toContain("/api/attachments/att_draf_1/download");
    // Catatan versi mengikuti draf, bukan menaikkan nomor versi.
    expect(html).toContain("nomor versi tidak naik");
    expect(html).not.toContain("Versi 3");
  });

  it("menawarkan Batalkan Pengumpulan hanya saat status Menunggu Verifikasi", () => {
    const html = renderToStaticMarkup(
      <TaskDetailClient initialTask={TASK_DETAIL_MENUNGGU_VERIFIKASI} />,
    );

    expect(html).toContain("Batalkan Pengumpulan");
    expect(html).toContain("Pengumpulan Anda sedang diperiksa oleh Admin Divisi");

    const selesaiTask = {
      ...TASK_DETAIL_BELUM_DIMULAI,
      status: "SEDANG_DIKERJAKAN" as const,
    };
    const selesaiHtml = renderToStaticMarkup(
      <TaskDetailClient initialTask={selesaiTask} />,
    );
    expect(selesaiHtml).not.toContain("Batalkan Pengumpulan");
  });

  it("menampilkan keadaan kosong yang jujur saat tugas belum pernah dikumpulkan", () => {
    // Menggantikan tes lama "data fallback untuk id tugas acak": perilaku itu
    // milik modul mock yang sudah dihapus, bukan milik komponen. Yang perlu
    // dikunci di sini adalah keadaan nyata yang mungkin terjadi: tugas tanpa
    // pengumpulan menampilkan kartu kosong yang menjelaskan keadaannya, bukan
    // kartu yang hilang tanpa penjelasan.
    const html = renderToStaticMarkup(
      <TaskDetailClient initialTask={TASK_DETAIL_BELUM_DIMULAI} />,
    );

    expect(html).toContain("Penyusunan Berita Acara Pleno Rekapitulasi");
    expect(html).toContain("Riwayat Pengumpulan");
    expect(html).toContain("Belum ada berkas pengumpulan");
  });
});
