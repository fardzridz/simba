import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LogsClient from "./logs-client";
import type { ActivityLogItem } from "@/db/queries/logs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/logs",
  useSearchParams: () => new URLSearchParams(),
}));

function logFixture(overrides: Partial<ActivityLogItem>): ActivityLogItem {
  return {
    id: "log_1",
    timestampFormatted: "17 Okt 2026 09:05 WIB",
    actorName: "Siti Rahma",
    actorRoleLabel: "Staf, Hukum & Sengketa",
    actionCode: "task.submit",
    entityType: "assignment",
    entityLabel: "Penugasan",
    entityId: "assign_1",
    summary: "Versi 1 dikirim, status menjadi Menunggu Verifikasi.",
    detailNote: "Berkas dilampirkan: 2.",
    ...overrides,
  };
}

const BASE_PROPS = {
  filters: { q: "", aksi: "", entitas: "", periode: "" },
  page: 1,
  pageSize: 25,
  totalPages: 1,
  actionOptions: [
    { id: "task", label: "Penugasan & pengerjaan" },
    { id: "auth", label: "Autentikasi" },
  ],
  entityOptions: [
    { id: "task", label: "Tugas" },
    { id: "assignment", label: "Penugasan" },
  ],
  userDivisionName: "Hukum & Sengketa",
};

describe("Log Aktivitas L15", () => {
  it("merender judul, spanduk immutability, dan tabel rekam jejak", () => {
    const html = renderToStaticMarkup(
      <LogsClient
        userRole="ADMIN"
        items={logFixtureListTwo()}
        total={2}
        {...BASE_PROPS}
      />,
    );

    expect(html).toContain("Log Aktivitas");
    expect(html).toContain(
      "Log tidak dapat diubah atau dihapus lewat antarmuka. Hanya Admin divisi dan Super Admin yang dapat membukanya.",
    );
    expect(html).toContain("Waktu");
    expect(html).toContain("Aktor");
    expect(html).toContain("Aksi");
    expect(html).toContain("Entitas");
    expect(html).toContain("Ringkasan perubahan");
    expect(html).toContain("Nilai sebelum dan sesudah disimpan");
  });

  it("merender kode aksi monospasi, aktor nyata, dan ringkasan dari server", () => {
    const html = renderToStaticMarkup(
      <LogsClient
        userRole="ADMIN"
        items={logFixtureListTwo()}
        total={2}
        {...BASE_PROPS}
      />,
    );

    expect(html).toContain("task.submit");
    expect(html).toContain("due_date.extended");
    expect(html).toContain("Siti Rahma");
    expect(html).toContain("Staf, Hukum &amp; Sengketa");
    expect(html).toContain("Versi 1 dikirim, status menjadi Menunggu Verifikasi.");
    expect(html).toContain("Tenggat: 16 Okt 2026 menjadi 17 Okt 2026.");
    expect(html).toContain("Menampilkan 1 sampai 2 dari 2 aktivitas");
  });

  it("merender penanda Super Admin beserta opsi filter aksi, entitas, dan periode", () => {
    const html = renderToStaticMarkup(
      <LogsClient
        userRole="SUPER_ADMIN"
        items={[]}
        total={0}
        {...BASE_PROPS}
        userDivisionName=""
      />,
    );

    expect(html).toContain("Aksi: semua");
    expect(html).toContain("Penugasan &amp; pengerjaan");
    expect(html).toContain("Entitas: semua");
    expect(html).toContain("Periode: 7 hari");
    expect(html).toContain("Belum ada aktivitas tercatat");
  });

  it("menampilkan keadaan kosong karena filter bersama tombol hapus", () => {
    const html = renderToStaticMarkup(
      <LogsClient
        userRole="ADMIN"
        items={[]}
        total={0}
        {...BASE_PROPS}
        filters={{ q: "pleno", aksi: "task", entitas: "task", periode: "30" }}
      />,
    );

    expect(html).toContain("Belum ada log aktivitas pada filter ini");
    expect(html).toContain("Hapus filter");
  });
});

function logFixtureListTwo(): ActivityLogItem[] {
  return [
    logFixture({}),
    logFixture({
      id: "log_2",
      timestampFormatted: "17 Okt 2026 08:30 WIB",
      actorName: "Admin Hukum & Sengketa",
      actorRoleLabel: "Admin Divisi",
      actionCode: "due_date.extended",
      entityType: "task",
      entityLabel: "Tugas",
      entityId: "HUK/2026/10/009",
      summary: "Tenggat: 16 Okt 2026 menjadi 17 Okt 2026.",
      detailNote: "Alasan: menunggu tanda tangan saksi.",
    }),
  ];
}
