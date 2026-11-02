import { describe, expect, it } from "vitest";
import { describeActivityLog } from "./logs";

describe("Ringkasan log aktivitas dari nilai tersimpan", () => {
  it("meringkas penerbitan tugas beserta tenggat dan prioritas", () => {
    const result = describeActivityLog({
      action: "task.created",
      entityType: "task",
      entityId: "HUK/2026/10/007",
      prevValue: null,
      newValue: JSON.stringify({
        taskNumber: "HUK/2026/10/007",
        title: "Rapat Pleno",
        priority: "TINGGI",
        dueAt: "2026-10-20",
        receivers: ["u1", "u2", "u3"],
      }),
    });

    expect(result.summary).toContain("3 penerima");
    expect(result.detailNote).toContain("Tenggat 2026-10-20");
    expect(result.detailNote).toContain("prioritas Tinggi");
  });

  it("meringkas perubahan tugas dan hanya bidang yang benar-benar berubah", () => {
    const result = describeActivityLog({
      action: "task.updated",
      entityType: "task",
      entityId: "task_1",
      prevValue: JSON.stringify({
        title: "Judul Lama",
        priority: "SEDANG",
        startDate: "2026-10-10",
        dueDate: "2026-10-17",
        receivers: ["u1", "u2"],
        addedReceivers: [],
        removedReceivers: [],
      }),
      newValue: JSON.stringify({
        title: "Judul Baru",
        priority: "SEDANG",
        startDate: "2026-10-10",
        dueDate: "2026-10-18",
        receivers: ["u1", "u2"],
        addedReceivers: ["u3"],
        removedReceivers: ["u2"],
      }),
    });

    expect(result.summary).toContain("Tugas diperbarui");
    expect(result.detailNote).toContain("judul");
    expect(result.detailNote).toContain("tenggat");
    expect(result.detailNote).not.toContain("prioritas");
    expect(result.detailNote).toContain("penerima: 1 ditambah, 1 dilepas.");
  });

  it("meringkas perpanjangan tenggat beserta alasannya", () => {
    const result = describeActivityLog({
      action: "due_date.extended",
      entityType: "task",
      entityId: "task_1",
      prevValue: JSON.stringify({ dueAt: "2026-10-16" }),
      newValue: JSON.stringify({ dueAt: "2026-10-17", reason: "Menunggu tanda tangan" }),
    });

    expect(result.summary).toBe("Tenggat: 2026-10-16 menjadi 2026-10-17.");
    expect(result.detailNote).toBe("Alasan: Menunggu tanda tangan.");
  });

  it("meringkas pengiriman versi dan permintaan revisi", () => {
    const submit = describeActivityLog({
      action: "task.submit",
      entityType: "assignment",
      entityId: "assign_1",
      prevValue: "SEDANG_DIKERJAKAN",
      newValue: JSON.stringify({
        status: "MENUNGGU_VERIFIKASI",
        version: 2,
        files: 3,
      }),
    });
    expect(submit.summary).toContain("Versi 2 dikirim");
    expect(submit.summary).toContain("Menunggu Verifikasi");
    expect(submit.detailNote).toContain("3");

    const revision = describeActivityLog({
      action: "task.revision",
      entityType: "assignment",
      entityId: "assign_1",
      prevValue: "MENUNGGU_VERIFIKASI",
      newValue: JSON.stringify({
        status: "SEDANG_DIKERJAKAN",
        version: 2,
        note: "Tanda tangan belum lengkap",
      }),
    });
    expect(revision.summary).toContain("minta revisi");
    expect(revision.detailNote).toContain("Tanda tangan belum lengkap");
  });

  it("memakai label status ketika nilai prev adalah teks mentah", () => {
    const result = describeActivityLog({
      action: "task.start",
      entityType: "assignment",
      entityId: "assign_1",
      prevValue: "BELUM_DIKERJAKAN",
      newValue: "SEDANG_DIKERJAKAN",
    });

    expect(result.summary).toBe("Status penugasan: Belum Dikerjakan menjadi Sedang Dikerjakan.");
  });

  it("jatuh ke nama kolom berubah untuk aksi tanpa bentuk khusus", () => {
    const result = describeActivityLog({
      action: "custom.thing",
      entityType: "master",
      entityId: "row_1",
      prevValue: JSON.stringify({ name: "lama", status: "Aktif" }),
      newValue: JSON.stringify({ name: "baru", status: "Aktif" }),
    });

    expect(result.summary).toContain("custom.thing");
    expect(result.detailNote).toBe("Bidang berubah: nama.");
  });
});
