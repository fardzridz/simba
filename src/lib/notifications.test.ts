import { describe, expect, it } from "vitest";
import { notificationTone, notificationTitle } from "@/lib/notifications";
import { notificationHref } from "@/lib/notification-format";

describe("notificationTitle", () => {
  it("menurunkan judul dari tipe tanpa menyimpan judul terpisah", () => {
    expect(notificationTitle("TASK_ASSIGNED", "Dokumen C1")).toBe(
      "Tugas baru: Dokumen C1",
    );
    expect(notificationTitle("REVISION_REQUESTED", "Laporan A")).toBe(
      "Perlu revisi: Laporan A",
    );
    expect(notificationTitle("SUBMISSION_RECEIVED", "Berkas B")).toBe(
      "Pengumpulan masuk: Berkas B",
    );
    expect(notificationTitle("TASK_CANCELLED", "Surat C")).toBe(
      "Tugas dibatalkan: Surat C",
    );
    expect(notificationTitle("DUE_SOON", "Dokumen D")).toBe(
      "Tenggat dekat: Dokumen D",
    );
  });
});

describe("notificationTone", () => {
  it("memberi warna hanya pada tipe yang butuh perhatian", () => {
    expect(notificationTone("REVISION_REQUESTED")).toBe("error");
    expect(notificationTone("DUE_SOON")).toBe("warning");
    expect(notificationTone("SUBMISSION_RECEIVED")).toBe("warning");
    expect(notificationTone("TASK_CANCELLED")).toBe("neutral");
    expect(notificationTone("TASK_ASSIGNED")).toBeNull();
  });
});

describe("notificationHref", () => {
  it("mengarah ke detail tugas dan meng-encode ID", () => {
    expect(notificationHref({ entityType: "task", taskId: "tsk_abc" })).toBe(
      "/tasks/tsk_abc",
    );
    expect(notificationHref({ entityType: "task", taskId: "a/b" })).toBe(
      "/tasks/a%2Fb",
    );
  });

  it("membawa assignment pada tautan penugasan", () => {
    expect(
      notificationHref({
        entityType: "assignment",
        taskId: "tsk_1",
        assignmentId: "asg_1",
      }),
    ).toBe("/tasks/tsk_1?assignment=asg_1");
  });

  it("kembali ke daftar tugas bila tugas tidak diketahui", () => {
    expect(notificationHref({ entityType: "task", taskId: null })).toBe(
      "/tasks",
    );
  });
});
