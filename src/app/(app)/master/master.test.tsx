import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MasterClient from "./master-client";
import {
  ResetPasswordModal,
  DeactivateUserModal,
  UserFormModal,
} from "./master-dialogs";
import type {
  MasterUser,
  MasterDivision,
  MasterCategory,
} from "@/db/queries/master";

// Kelola Master memanggil router.refresh() setelah aksi server; render statis
// berjalan tanpa runtime Next, jadi penghubungnya ditiru di sini.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

const USERS: MasterUser[] = [
  {
    id: "usr_sa",
    fullName: "Super Admin",
    username: "super.admin",
    email: "super.admin@contoh.local",
    divisionId: "div_sek",
    divisionName: "Sekretariat",
    divisionCode: "SEK",
    role: "SUPER_ADMIN",
    roleLabel: "Super Admin",
    isActive: true,
    lastLoginFormatted: "2 Okt 2026 09:00 WIB",
  },
  {
    id: "usr_admin",
    fullName: "Admin Hukum",
    username: "admin.hukum",
    email: "admin.hukum@contoh.local",
    divisionId: "div_hukum",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    role: "ADMIN",
    roleLabel: "Admin Divisi",
    isActive: true,
    lastLoginFormatted: "Belum pernah",
  },
  {
    id: "usr_staf",
    fullName: "Staf Hukum",
    username: "staf.hukum",
    email: "staf.hukum@contoh.local",
    divisionId: "div_hukum",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    role: "USER",
    roleLabel: "Staf",
    isActive: false,
    lastLoginFormatted: "Belum pernah",
  },
];

const DIVISIONS: MasterDivision[] = [
  {
    id: "div_hukum",
    name: "Hukum & Sengketa",
    code: "HUK",
    isActive: true,
    memberCount: 2,
    createdAtFormatted: "1 Jan 2026",
  },
];

const CATEGORIES: MasterCategory[] = [
  {
    id: "cat_persuratan",
    name: "Persuratan",
    isActive: true,
    taskCount: 0,
    createdAtFormatted: "1 Jan 2026",
  },
];

describe("Kelola Master L17", () => {
  it("merender 3 tab dan judul Tambah Pengguna", () => {
    const html = renderToStaticMarkup(
      <MasterClient
        currentUserId="usr_sa"
        users={USERS}
        divisions={DIVISIONS}
        categories={CATEGORIES}
      />,
    );

    expect(html).toContain("Kelola Master");
    expect(html).toContain("Pengguna");
    expect(html).toContain("Divisi");
    expect(html).toContain("Kategori");
    expect(html).toContain("Tambah Pengguna");
  });

  it("menampilkan hitungan database yang jujur dari props, 0 saat kosong", () => {
    const html = renderToStaticMarkup(
      <MasterClient currentUserId="usr_sa" users={[]} divisions={[]} categories={[]} />,
    );
    expect(html).toContain("0 pengguna, 0 divisi, 0 kategori di database.");

    const filled = renderToStaticMarkup(
      <MasterClient
        currentUserId="usr_sa"
        users={USERS}
        divisions={DIVISIONS}
        categories={CATEGORIES}
      />,
    );
    expect(filled).toContain("3 pengguna, 1 divisi, 1 kategori di database.");
  });

  it("merender tabel pengguna dengan nama, username mono, divisi, peran, dan aksi", () => {
    const html = renderToStaticMarkup(
      <MasterClient
        currentUserId="usr_staf_sa_lain"
        users={USERS}
        divisions={DIVISIONS}
        categories={CATEGORIES}
      />,
    );

    expect(html).toContain("Super Admin");
    expect(html).toContain("super.admin");
    expect(html).toContain("Admin Hukum");
    expect(html).toContain("admin.hukum");
    expect(html).toContain("staf.hukum");
    expect(html).toContain("Aktif");
    expect(html).toContain("Nonaktif");
    expect(html).toContain("Ubah");
    expect(html).toContain("Reset");
    expect(html).toContain("Nonaktifkan");
    // Opsi filter divisi dibangun dari data divisi nyata
    expect(html).toContain("Hukum &amp; Sengketa");
  });

  it("menyembunyikan tombol aksi pada baris milik akun sendiri", () => {
    const html = renderToStaticMarkup(
      <MasterClient
        currentUserId="usr_sa"
        users={[USERS[0]!]}
        divisions={[]}
        categories={[]}
      />,
    );

    expect(html).toContain("Akun Anda");
    // Dialog ditutup dan tidak ada baris lain, jadi semua tombol aksi menghilang.
    expect(html).not.toContain("Nonaktifkan");
    expect(html).not.toContain("Aksi Tidak Tersedia");
  });

  it("merender dialog konfirmasi reset kata sandi dengan teks kata sandi awal", () => {
    const user = USERS[2]!; // staf.hukum
    const html = renderToStaticMarkup(
      <ResetPasswordModal
        isOpen={true}
        onClose={() => {}}
        user={user}
        onConfirm={async () => ({})}
      />,
    );

    expect(html).toContain("Reset Kata Sandi");
    expect(html).toContain("staf.hukum");
    expect(html).toContain("Bawaslu#2026");
    expect(html).toContain("langsung dicabut setelah reset");
    expect(html).toContain("Tindakan ini tercatat di log aktivitas");
    expect(html).toContain("Batal");
  });

  it("merender dialog nonaktifkan akun dengan aturan bisnis", () => {
    const user = USERS[2]!;
    const html = renderToStaticMarkup(
      <DeactivateUserModal
        isOpen={true}
        onClose={() => {}}
        user={user}
        onConfirm={async () => ({})}
      />,
    );

    expect(html).toContain("Nonaktifkan Pengguna");
    expect(html).toContain("Akun beriwayat dinonaktifkan, bukan dihapus.");
    expect(html).toContain("Alasan penonaktifan");
  });

  it("merender formulir tambah pengguna dengan divisi dari props dan keterangan kata sandi awal", () => {
    const html = renderToStaticMarkup(
      <UserFormModal
        isOpen={true}
        onClose={() => {}}
        user={null}
        divisions={DIVISIONS}
        onSave={async () => ({})}
      />,
    );

    expect(html).toContain("Tambah Pengguna Baru");
    expect(html).toContain("Nama Lengkap *");
    expect(html).toContain("Nama Pengguna *");
    expect(html).toContain("Email *");
    expect(html).toContain("Kata sandi awal akun baru otomatis");
    expect(html).toContain("Bawaslu#2026");
    expect(html).toContain("Simpan Pengguna");
  });
});
