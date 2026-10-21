import { describe, expect, it } from "vitest";
import {
  APP_SIGNATURE,
  formatNotificationBlock,
  notificationHref,
  taskLink,
} from "@/lib/notification-format";
import type { NotificationType } from "@/db/schema";

const DUE_AT = Math.floor(Date.UTC(2026, 9, 23, 7, 42) / 1000);

function block(type: NotificationType, overrides: Record<string, unknown> = {}) {
  return formatNotificationBlock({
    type,
    taskNumber: "HUK/2026/10/001",
    taskTitle: "Laporan Hasil Pengawasan Wilayah A",
    dueAt: DUE_AT,
    detail: "Catatan admin: lampiran belum ditandatangani.",
    link: "https://portal.example.com/tasks/tsk_huk_1?assignment=asg_huk_1",
    ...overrides,
  });
}

describe("formatNotificationBlock", () => {
  it("membuka dengan identitas pengirim, bukan nomor gateway", () => {
    const text = block("REVISION_REQUESTED").text;
    expect(text.startsWith(APP_SIGNATURE)).toBe(true);
    expect(text).toContain("Bawaslu Kota Pasuruan");
  });

  it("menampilkan nomor tugas tebal, judul, status, detail, tenggat, dan tautan", () => {
    const text = block("REVISION_REQUESTED").text;
    expect(text).toContain("*HUK/2026/10/001*");
    expect(text).toContain("Laporan Hasil Pengawasan Wilayah A");
    expect(text).toContain("*Perlu revisi*");
    expect(text).toContain("Catatan admin: lampiran belum ditandatangani.");
    expect(text).toContain("Tenggat 23 Okt 2026 14:42 WIB");
    expect(text).toContain(
      "Buka: https://portal.example.com/tasks/tsk_huk_1?assignment=asg_huk_1",
    );
  });

  it("memakai headline yang berbeda untuk setiap tipe", () => {
    const headlines = (
      [
        "TASK_ASSIGNED",
        "REVISION_REQUESTED",
        "SUBMISSION_RECEIVED",
        "TASK_CANCELLED",
        "DUE_SOON",
      ] as NotificationType[]
    ).map((type) => block(type).headline);
    expect(new Set(headlines).size).toBe(headlines.length);
    expect(block("SUBMISSION_RECEIVED").headline).toBe("Pengumpulan masuk");
  });

  it("melewati baris yang kosong tanpa menyisakan spasi", () => {
    const result = block("TASK_CANCELLED", {
      taskNumber: null,
      taskTitle: null,
      dueAt: null,
      detail: null,
      link: null,
    });
    expect(result.text).toBe(`${APP_SIGNATURE}\n\n*Tugas dibatalkan*`);
    expect(result.text).not.toContain("\n\n\n");
  });

  it("subject email menyebut aplikasi dan nomor tugas", () => {
    expect(block("TASK_ASSIGNED").subject).toBe(
      "[Portal Penugasan] Tugas baru · HUK/2026/10/001",
    );
  });
});

describe("taskLink", () => {
  it("menyusun URL absolut dan membawa assignment", () => {
    expect(taskLink("https://portal.example.com", "tsk_1", "asg_1")).toBe(
      "https://portal.example.com/tasks/tsk_1?assignment=asg_1",
    );
    expect(taskLink("http://localhost:3000/", "tsk_1")).toBe(
      "http://localhost:3000/tasks/tsk_1",
    );
  });

  it("meng-encode id yang tidak aman", () => {
    expect(taskLink("https://portal.example.com", "a/b", "c&d")).toBe(
      "https://portal.example.com/tasks/a%2Fb?assignment=c%26d",
    );
  });

  it("mengembalikan null bila APP_BASE_URL kosong atau tidak valid", () => {
    expect(taskLink(undefined, "tsk_1")).toBeNull();
    expect(taskLink("  ", "tsk_1")).toBeNull();
    expect(taskLink("bukan-url", "tsk_1")).toBeNull();
  });
});

describe("notificationHref", () => {
  it("membawa id penugasan pada tautan tugas", () => {
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
