import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TaskReviewClient from "./task-review-client";
import { getMockTaskDetail } from "@/lib/mock-task-detail";

describe("TaskReviewClient L11", () => {
  it("merender informasi kepala tugas admin, tombol tindakan, dan durasi antrean reviu", () => {
    const task = getMockTaskDetail("tsk_huk_3");
    const html = renderToStaticMarkup(
      <TaskReviewClient initialTask={task} isSuperAdmin={false} />,
    );

    expect(html).toContain("HUK/2026/10/003");
    expect(html).toContain("Pengunggahan Dokumen C1 Pleno");
    expect(html).toContain("Batalkan Tugas");
    // Perpanjangan tenggat belum punya action server; tombol tidak ditampilkan.
    expect(html).not.toContain("Perpanjang Tenggat");
    expect(html).toContain("Penerima:");
    expect(html).toContain("Siti Rahma");
    expect(html).toContain("Tunggu review: 1 hari 3 jam");
  });

  it("merender berkas pengumpulan terbaru dan panel keputusan dengan aksi Setujui & Arsipkan", () => {
    const task = getMockTaskDetail("tsk_huk_3");
    const html = renderToStaticMarkup(
      <TaskReviewClient initialTask={task} isSuperAdmin={false} />,
    );

    expect(html).toContain("Pengumpulan Terbaru");
    expect(html).toContain("dokumen-c1-pleno-final.pdf");
    expect(html).toContain("5,4 MB · e34b12aa");
    expect(html).toContain("Keputusan");
    expect(html).toContain("Setujui &amp; Arsipkan");
    expect(html).toContain("Minta Revisi");
    expect(html).toContain("Catatan revisi");
  });

  it("merender pita baca-saja khusus ketika dibuka oleh Super Admin", () => {
    const task = getMockTaskDetail("tsk_huk_3");
    const html = renderToStaticMarkup(
      <TaskReviewClient initialTask={task} isSuperAdmin={true} />,
    );

    expect(html).toContain("Akses Baca-Saja");
    expect(html).toContain("Kembali ke Semua Tugas");
    expect(html).not.toContain("Setujui &amp; Arsipkan");
  });
});
