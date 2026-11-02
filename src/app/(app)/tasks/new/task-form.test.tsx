import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TaskFormClient, {
  getDefaultDueDateString,
  getTodayDateString,
} from "./task-form-client";
import type {
  CategoryOption,
  DivisionMemberOption,
} from "@/db/queries/form-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const FIXTURE_MEMBERS: DivisionMemberOption[] = [
  { id: "usr_a", name: "Ahmad Fauzi", roleLabel: "Staf Pelaksana", initials: "AF" },
  { id: "usr_b", name: "Siti Rahma", roleLabel: "Staf Pelaksana", initials: "SR" },
  { id: "usr_c", name: "Budi Santoso", roleLabel: "Staf Pelaksana", initials: "BS" },
];

const FIXTURE_CATEGORIES: CategoryOption[] = [
  { id: "cat_kegiatan", name: "Kegiatan dan Laporan" },
  { id: "cat_pgs", name: "Pengawasan Lapangan" },
];

function renderForm(propsOverrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    <TaskFormClient
      divisionCode="HUK"
      divisionName="Hukum & Sengketa"
      members={FIXTURE_MEMBERS}
      categories={FIXTURE_CATEGORIES}
      defaultCategoryId={null}
      defaultCategoryName={null}
      defaultCategoryInactive={null}
      defaultPriority="SEDANG"
      {...propsOverrides}
    />,
  );
}

describe("TaskFormClient L10", () => {
  it("menghasilkan tanggal mulai dan tenggat standar format YYYY-MM-DD", () => {
    const today = getTodayDateString();
    const due = getDefaultDueDateString();

    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(due >= today).toBe(true);
  });

  it("merender struktur formulir dua kolom lengkap sesuai wireframe L10", () => {
    const html = renderForm();

    expect(html).toContain("Buat Tugas");
    expect(html).toContain("Kembali ke Tugas Divisi");
    expect(html).toContain("Judul tugas");
    expect(html).toContain("Kategori");
    expect(html).toContain("Pilih kategori");
    expect(html).toContain("Prioritas");
    expect(html).toContain("Tanggal mulai");
    expect(html).toContain("Tenggat");
    expect(html).toContain("Tenggat diperlakukan sebagai 23:59:59 WIB.");
    expect(html).toContain("Penerima");
    expect(html).toContain("Nomor tugas (pratinjau)");
    expect(html).toContain("HUK/");
    expect(html).toContain("Batal");
    expect(html).toContain("Simpan &amp; Tugaskan");
  });

  it("menampilkan daftar anggota staf divisi dengan inisial dan peran", () => {
    const html = renderForm();

    expect(html).toContain("Ahmad Fauzi");
    expect(html).toContain("Siti Rahma");
    expect(html).toContain("Budi Santoso");
    expect(html).toContain("Staf Pelaksana");
    expect(html).toContain("0 pegawai dipilih");
    expect(html).toContain("Menampilkan 3 dari 3 anggota divisi.");
    expect(html).toContain("Pilih semua");
  });

  it("terbuka kosong ketika divisi tidak punya kategori default", () => {
    const html = renderForm();

    expect(html).toContain("Pilih kategori");
    expect(html).toContain('value="cat_kegiatan"');
  });

  it("memakai kategori default divisi saat kategori tersebut aktif", () => {
    const html = renderForm({
      defaultCategoryId: "cat_kegiatan",
      defaultCategoryName: "Kegiatan dan Laporan",
      defaultCategoryInactive: false,
    });

    expect(html).toContain("selected");
    expect(html).toContain('value="cat_kegiatan"');
  });

  it("memperingatkan ketika kategori default divisi sudah nonaktif", () => {
    const html = renderForm({
      defaultCategoryId: "cat_bubar",
      defaultCategoryName: "Kegiatan Bubar",
      defaultCategoryInactive: true,
    });

    expect(html).toContain("Kegiatan Bubar");
    expect(html).toContain(
      "sedang nonaktif atau tidak tersedia, jadi pilihan di atas terbuka kosong.",
    );
  });

  it("menyatakan kondisi divisi tanpa staf pelaksana aktif secara jujur", () => {
    const html = renderForm({ members: [] });

    expect(html).toContain("Belum ada staf pelaksana aktif di divisi ini.");
    expect(html).toContain("Tambahkan pengguna di Kelola Pengguna");
    expect(html).not.toContain("Pilih semua");
  });

  it("menampilkan prioritas kanonik dari skema", () => {
    const html = renderForm({ defaultPriority: "MENDESAK" });

    expect(html).toContain("Rendah");
    expect(html).toContain("Mendesak");
    expect(html).toContain('value="MENDESAK"');
  });
});
