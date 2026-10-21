import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MasterClient from "./master-client";
import {
  ResetPasswordModal,
  DeactivateUserModal,
  UserFormModal,
} from "./master-dialogs";
import { MOCK_MASTER_USERS } from "@/lib/mock-master";

describe("Kelola Master L17", () => {
  it("merender halaman kelola master dengan 3 tab dan tombol Tambah Pengguna", () => {
    const html = renderToStaticMarkup(<MasterClient />);

    expect(html).toContain("Kelola Master");
    expect(html).toContain("Pengguna");
    expect(html).toContain("Divisi");
    expect(html).toContain("Kategori");
    expect(html).toContain("Tambah Pengguna");
    expect(html).toContain("48 pengguna, 5 divisi, 8 kategori pada data contoh.");
  });

  it("merender tabel master pengguna dengan nama, username mono, divisi, peran, dan aksi", () => {
    const html = renderToStaticMarkup(<MasterClient />);

    expect(html).toContain("Super Admin");
    expect(html).toContain("super.admin");
    expect(html).toContain("Admin Hukum &amp; Sengketa");
    expect(html).toContain("admin.hukum");
    expect(html).toContain("staf.hukum");
    expect(html).toContain("Aktif");
    expect(html).toContain("Ubah");
    expect(html).toContain("Reset");
    expect(html).toContain("Nonaktifkan");
  });

  it("merender dialog konfirmasi reset kata sandi sesuai wireframe L17", () => {
    const user = MOCK_MASTER_USERS[3]!; // staf.hukum
    const html = renderToStaticMarkup(
      <ResetPasswordModal
        isOpen={true}
        onClose={() => {}}
        user={user}
        onConfirm={() => {}}
      />,
    );

    expect(html).toContain("Reset Kata Sandi");
    expect(html).toContain("staf.hukum");
    expect(html).toContain("Sesi pengguna akan diakhiri setelah kata sandi direset.");
    expect(html).toContain("Tindakan ini tercatat di log aktivitas");
    expect(html).toContain("Batal");
  });

  it("merender dialog nonaktifkan akun dengan aturan bisnis", () => {
    const user = MOCK_MASTER_USERS[3]!;
    const html = renderToStaticMarkup(
      <DeactivateUserModal
        isOpen={true}
        onClose={() => {}}
        user={user}
        onConfirm={() => {}}
      />,
    );

    expect(html).toContain("Nonaktifkan Pengguna");
    expect(html).toContain("Akun beriwayat dinonaktifkan, bukan dihapus.");
    expect(html).toContain("Alasan penonaktifan");
  });

  it("merender formulir tambah pengguna baru", () => {
    const html = renderToStaticMarkup(
      <UserFormModal
        isOpen={true}
        onClose={() => {}}
        user={null}
        onSave={() => {}}
      />,
    );

    expect(html).toContain("Tambah Pengguna Baru");
    expect(html).toContain("Nama Lengkap *");
    expect(html).toContain("Nama Pengguna *");
    expect(html).toContain("Email *");
    expect(html).toContain("Simpan Pengguna");
  });
});
