import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TaskFormClient, {
  getDefaultDueDateString,
  getTodayDateString,
} from "./task-form-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TaskFormClient L10", () => {
  it("menghasilkan tanggal mulai dan tenggat standar format YYYY-MM-DD", () => {
    const today = getTodayDateString();
    const due = getDefaultDueDateString();

    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(due >= today).toBe(true);
  });

  it("merender struktur formulir dua kolom lengkap sesuai wireframe L10", () => {
    const html = renderToStaticMarkup(
      <TaskFormClient divisionCode="HUK" divisionName="Hukum & Sengketa" />,
    );

    expect(html).toContain("Buat Tugas");
    expect(html).toContain("Kembali ke Tugas Divisi");
    expect(html).toContain("Judul tugas");
    expect(html).toContain("Kategori");
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
    const html = renderToStaticMarkup(
      <TaskFormClient divisionCode="HUK" divisionName="Hukum & Sengketa" />,
    );

    expect(html).toContain("Ahmad Fauzi");
    expect(html).toContain("Siti Rahma");
    expect(html).toContain("Budi Santoso");
    expect(html).toContain("Staf Pelaksana");
    expect(html).toContain("3 pegawai dipilih");
  });
});
