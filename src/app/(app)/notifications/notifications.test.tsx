import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { NotificationListItem } from "@/db/queries/notifications";
import NotificationsClient from "./notifications-client";

const STAFF_NOTIFICATIONS: NotificationListItem[] = [
  {
    id: "ntf_1",
    type: "TASK_ASSIGNED",
    title: "Tugas baru: Dokumen C1 Pleno",
    message: "Dari Admin Hukum & Sengketa. Tenggat 17 Okt 2026 23:59 WIB.",
    tone: null,
    targetUrl: "/tasks/tsk_huk_3",
    isRead: false,
    createdAtLabel: "17 Okt 2026 08:31 WIB",
  },
  {
    id: "ntf_2",
    type: "REVISION_REQUESTED",
    title: "Perlu revisi: Laporan Hasil Pengawasan Wilayah A",
    message:
      "Tugas dikembalikan oleh Admin Divisi. Catatan admin: tanda tangan saksi belum lengkap pada berita acara.",
    tone: "error",
    targetUrl: "/tasks/tsk_huk_1",
    isRead: false,
    createdAtLabel: "16 Okt 2026 15:05 WIB",
  },
  {
    id: "ntf_3",
    type: "DUE_SOON",
    title: "Tenggat dekat: Dokumen C1 Pleno",
    message: "Tenggat hari ini 17:00 WIB, sisa 4 jam.",
    tone: "warning",
    targetUrl: "/tasks/tsk_huk_3",
    isRead: true,
    createdAtLabel: "17 Okt 2026 06:00 WIB",
  },
];

const ADMIN_NOTIFICATIONS: NotificationListItem[] = [
  {
    id: "ntf_admin_1",
    type: "SUBMISSION_RECEIVED",
    title: "Pengumpulan baru: Dokumen C1 Pleno",
    message:
      "Siti Rahma telah mengumpulkan berkas hasil kerja Versi 1. Menunggu verifikasi Anda di panel reviu penugasan.",
    tone: "warning",
    targetUrl: "/tasks/tsk_huk_3",
    isRead: false,
    createdAtLabel: "17 Okt 2026 09:05 WIB",
  },
];

describe("Notifikasi In-App L16", () => {
  it("merender halaman notifikasi dengan judul, kelompok BARU, dan SUDAH DIBACA", () => {
    const html = renderToStaticMarkup(
      <NotificationsClient
        initialNotifications={STAFF_NOTIFICATIONS}
        initialUnreadCount={2}
      />,
    );

    expect(html).toContain("Notifikasi");
    expect(html).toContain("Pemberitahuan tugas, review, dan tenggat untuk akunmu.");
    expect(html).toContain("BARU");
    expect(html).toContain("Belum Dibaca: 2");
    expect(html).toContain("SUDAH DIBACA");
    expect(html).toContain("Tandai Semua Dibaca");
  });

  it("merender rincian notifikasi staf (tugas baru, revisi, tenggat)", () => {
    const html = renderToStaticMarkup(
      <NotificationsClient
        initialNotifications={STAFF_NOTIFICATIONS}
        initialUnreadCount={2}
      />,
    );

    expect(html).toContain("Tugas baru: Dokumen C1 Pleno");
    expect(html).toContain("Perlu revisi: Laporan Hasil Pengawasan Wilayah A");
    expect(html).toContain("Catatan admin: tanda tangan saksi belum lengkap");
    expect(html).toContain("Tenggat dekat: Dokumen C1 Pleno");
    expect(html).toContain("Buka tugas →");
  });

  it("merender notifikasi admin divisi (pengumpulan baru masuk dari staf)", () => {
    const html = renderToStaticMarkup(
      <NotificationsClient
        initialNotifications={ADMIN_NOTIFICATIONS}
        initialUnreadCount={1}
      />,
    );

    expect(html).toContain("Pengumpulan baru: Dokumen C1 Pleno");
    expect(html).toContain("Siti Rahma telah mengumpulkan berkas hasil kerja");
  });

  it("menampilkan keadaan kosong bila akun belum punya notifikasi", () => {
    const html = renderToStaticMarkup(
      <NotificationsClient initialNotifications={[]} initialUnreadCount={0} />,
    );

    expect(html).toContain("Belum ada notifikasi");
  });
});
