"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/icons";
import type { MasterUser, MasterDivision, MasterCategory } from "@/db/queries/master";
import {
  createUser,
  deleteCategory,
  deleteDivision,
  deleteUser,
  resetPassword,
  saveCategory,
  saveDivision,
  setCategoryActive,
  setDivisionActive,
  setUserActive,
  updateUser,
  type MasterActionResult,
} from "./actions";
import {
  ResetPasswordModal,
  DeactivateUserModal,
  MasterDeleteModal,
  UserFormModal,
  DivisionFormModal,
  CategoryFormModal,
  type UserFormValues,
} from "./master-dialogs";

export type MasterTab = "pengguna" | "divisi" | "kategori";

export type MasterClientProps = {
  currentUserId: string;
  users: MasterUser[];
  divisions: MasterDivision[];
  categories: MasterCategory[];
};

export default function MasterClient({
  currentUserId,
  users,
  divisions,
  categories,
}: MasterClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MasterTab>("pengguna");

  // Filter State Pengguna
  const [userQuery, setUserQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("semua");
  const [selectedStatus, setSelectedStatus] = useState("semua");
  const [selectedDivision, setSelectedDivision] = useState("semua");

  // Filter State Divisi & Kategori
  const [divisionQuery, setDivisionQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  // State Modal Pengguna
  const [resetTargetUser, setResetTargetUser] = useState<MasterUser | null>(null);
  const [deactivateTargetUser, setDeactivateTargetUser] = useState<MasterUser | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<MasterUser | null>(null);
  const [editTargetUser, setEditTargetUser] = useState<MasterUser | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // State Modal Divisi
  const [editTargetDivision, setEditTargetDivision] = useState<MasterDivision | null>(null);
  const [deleteTargetDivision, setDeleteTargetDivision] = useState<MasterDivision | null>(null);
  const [isAddDivisionOpen, setIsAddDivisionOpen] = useState(false);

  // State Modal Kategori
  const [editTargetCategory, setEditTargetCategory] = useState<MasterCategory | null>(null);
  const [deleteTargetCategory, setDeleteTargetCategory] = useState<MasterCategory | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Spanduk Feedback Sukses
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter Pengguna
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userQuery.trim()) {
        const q = userQuery.toLowerCase();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchUsername = u.username.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        if (!matchName && !matchUsername && !matchEmail) return false;
      }
      if (selectedRole !== "semua" && u.role !== selectedRole) return false;
      if (selectedStatus !== "semua") {
        const isAktif = selectedStatus === "aktif";
        if (u.isActive !== isAktif) return false;
      }
      if (selectedDivision !== "semua" && u.divisionId !== selectedDivision) return false;
      return true;
    });
  }, [users, userQuery, selectedRole, selectedStatus, selectedDivision]);

  // Filter Divisi
  const filteredDivisions = useMemo(() => {
    return divisions.filter((d) => {
      if (divisionQuery.trim()) {
        const q = divisionQuery.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [divisions, divisionQuery]);

  // Filter Kategori
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (categoryQuery.trim()) {
        const q = categoryQuery.toLowerCase();
        return c.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categories, categoryQuery]);

  // Aksi Pengguna: setiap perubahan disimpan server, tabel menyusul lewat refresh dari server.
  const handleConfirmResetPassword = async (): Promise<MasterActionResult> => {
    if (!resetTargetUser) return { error: "Pengguna tidak ditemukan." };
    const result = await resetPassword(resetTargetUser.id);
    if (result.success) {
      showNotification(
        `Kata sandi @${resetTargetUser.username} kembali ke Bawaslu#2026 dan sesinya langsung dicabut.`,
      );
      router.refresh();
    }
    return result;
  };

  const handleConfirmDeactivateUser = async (reason: string): Promise<MasterActionResult> => {
    if (!deactivateTargetUser) return { error: "Pengguna tidak ditemukan." };
    const result = await setUserActive({ id: deactivateTargetUser.id, isActive: false, reason });
    if (result.success) {
      showNotification(`Akun @${deactivateTargetUser.username} dinonaktifkan. Alasan tercatat di log audit.`);
      router.refresh();
    }
    return result;
  };

  const handleActivateUser = async (user: MasterUser) => {
    const result = await setUserActive({ id: user.id, isActive: true });
    if (result.success) {
      showNotification(`Akun @${user.username} berhasil diaktifkan kembali.`);
      router.refresh();
    } else if (result.error) {
      showNotification(`Gagal: ${result.error}`);
    }
  };

  const handleConfirmDeleteUser = async (): Promise<MasterActionResult> => {
    if (!deleteTargetUser) return { error: "Pengguna tidak ditemukan." };
    const result = await deleteUser(deleteTargetUser.id);
    if (result.success) {
      showNotification(`Akun @${deleteTargetUser.username} dihapus permanen.`);
      router.refresh();
    }
    return result;
  };

  const handleSaveUser = async (values: UserFormValues): Promise<MasterActionResult> => {
    const result = editTargetUser
      ? await updateUser({ id: editTargetUser.id, ...values })
      : await createUser(values);
    if (result.success) {
      showNotification(
        editTargetUser
          ? `Data pengguna ${values.fullName} berhasil diperbarui.`
          : `Pengguna baru @${values.username} dibuat. Kata sandi awal: Bawaslu#2026.`,
      );
      router.refresh();
    }
    return result;
  };

  // Aksi Divisi dan Kategori
  const handleSaveDivision = async (values: { name: string; code: string }): Promise<MasterActionResult> => {
    const result = editTargetDivision
      ? await saveDivision({ id: editTargetDivision.id, ...values })
      : await saveDivision(values);
    if (result.success) {
      showNotification(
        editTargetDivision
          ? `Divisi ${values.name} berhasil diperbarui.`
          : `Divisi baru ${values.name} (${values.code.toUpperCase()}) berhasil ditambahkan.`,
      );
      router.refresh();
    }
    return result;
  };

  const handleToggleDivision = async (division: MasterDivision) => {
    const result = await setDivisionActive({ id: division.id, isActive: !division.isActive });
    if (result.success) {
      showNotification(
        `Divisi ${division.name} ${division.isActive ? "dinonaktifkan" : "diaktifkan kembali"}.`,
      );
      router.refresh();
    } else if (result.error) {
      showNotification(`Gagal: ${result.error}`);
    }
  };

  const handleConfirmDeleteDivision = async (): Promise<MasterActionResult> => {
    if (!deleteTargetDivision) return { error: "Divisi tidak ditemukan." };
    const result = await deleteDivision(deleteTargetDivision.id);
    if (result.success) {
      showNotification(`Divisi ${deleteTargetDivision.name} dihapus permanen.`);
      router.refresh();
    }
    return result;
  };

  const handleSaveCategory = async (values: { name: string }): Promise<MasterActionResult> => {
    const result = editTargetCategory
      ? await saveCategory({ id: editTargetCategory.id, ...values })
      : await saveCategory(values);
    if (result.success) {
      showNotification(
        editTargetCategory
          ? `Kategori ${values.name} berhasil diperbarui.`
          : `Kategori baru ${values.name} berhasil ditambahkan.`,
      );
      router.refresh();
    }
    return result;
  };

  const handleToggleCategory = async (category: MasterCategory) => {
    const result = await setCategoryActive({ id: category.id, isActive: !category.isActive });
    if (result.success) {
      showNotification(
        `Kategori ${category.name} ${category.isActive ? "dinonaktifkan" : "diaktifkan kembali"}.`,
      );
      router.refresh();
    } else if (result.error) {
      showNotification(`Gagal: ${result.error}`);
    }
  };

  const handleConfirmDeleteCategory = async (): Promise<MasterActionResult> => {
    if (!deleteTargetCategory) return { error: "Kategori tidak ditemukan." };
    const result = await deleteCategory(deleteTargetCategory.id);
    if (result.success) {
      showNotification(`Kategori ${deleteTargetCategory.name} dihapus permanen.`);
      router.refresh();
    }
    return result;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <h1 className="text-h1 font-semibold text-ink">Kelola Master</h1>
          <p className="mt-1 text-body text-ink-3">
            Pusat administrasi master pengguna, divisi, dan kategori dokumen instansi.
          </p>
        </div>

        {/* Tombol Tambah Dinamis Sesuai Tab */}
        <div>
          {activeTab === "pengguna" ? (
            <button
              type="button"
              onClick={() => {
                setEditTargetUser(null);
                setIsAddUserOpen(true);
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm"
            >
              <Icon name="tambah" size={15} />
              Tambah Pengguna
            </button>
          ) : activeTab === "divisi" ? (
            <button
              type="button"
              onClick={() => {
                setEditTargetDivision(null);
                setIsAddDivisionOpen(true);
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm"
            >
              <Icon name="tambah" size={15} />
              Tambah Divisi
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditTargetCategory(null);
                setIsAddCategoryOpen(true);
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark hover:bg-primary-hover active:bg-primary-active transition-colors shadow-sm"
            >
              <Icon name="tambah" size={15} />
              Tambah Kategori
            </button>
          )}
        </div>
      </div>

      {/* Spanduk Notifikasi Feedback */}
      {notification ? (
        <div
          role="status"
          className="rounded-lg border border-success/30 bg-success-surface p-4 text-body-sm font-semibold text-success flex items-center gap-2"
        >
          <Icon name="centang" size={16} />
          <span>{notification}</span>
        </div>
      ) : null}

      {/* Tab Navigasi 3 Tab Sesuai Wireframe L17 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-6 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("pengguna")}
            className={`pb-2.5 text-body font-semibold transition-colors relative ${
              activeTab === "pengguna"
                ? "text-ink"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            Pengguna
            {activeTab === "pengguna" ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("divisi")}
            className={`pb-2.5 text-body font-semibold transition-colors relative ${
              activeTab === "divisi"
                ? "text-ink"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            Divisi
            {activeTab === "divisi" ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("kategori")}
            className={`pb-2.5 text-body font-semibold transition-colors relative ${
              activeTab === "kategori"
                ? "text-ink"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            Kategori
            {activeTab === "kategori" ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            ) : null}
          </button>
        </div>

        <p className="text-body-sm text-ink-3">
          {users.length} pengguna, {divisions.length} divisi, {categories.length} kategori di database.
        </p>
      </div>

      {/* ==================================================== */}
      {/* 1. KONTEN TAB: PENGGUNA                              */}
      {/* ==================================================== */}
      {activeTab === "pengguna" ? (
        <div className="flex flex-col gap-4">
          {/* Baris Filter Pengguna */}
          <div className="card p-3 flex flex-wrap items-center gap-3 bg-surface">
            <div className="relative flex-1 min-w-[200px] tablet:max-w-[260px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
                <Icon name="cari" size={15} />
              </span>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Cari nama atau nama pengguna..."
                className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              />
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              aria-label="Filter peran"
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              <option value="semua">Peran: semua</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin Divisi</option>
              <option value="USER">Staf Pelaksana</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter status"
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              <option value="semua">Status: semua</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>

            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              aria-label="Filter divisi"
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              <option value="semua">Divisi: semua</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {(userQuery || selectedRole !== "semua" || selectedStatus !== "semua" || selectedDivision !== "semua") ? (
              <button
                type="button"
                onClick={() => {
                  setUserQuery("");
                  setSelectedRole("semua");
                  setSelectedStatus("semua");
                  setSelectedDivision("semua");
                }}
                className="ml-auto text-body-sm font-semibold text-primary hover:underline"
              >
                Hapus filter
              </button>
            ) : null}
          </div>

          {/* Tabel Pengguna */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="border-b border-border bg-neutral-surface/60 text-body-sm font-semibold text-ink-2">
                    <th scope="col" className="px-4 py-3">Nama &amp; Nama Pengguna</th>
                    <th scope="col" className="px-4 py-3">Divisi</th>
                    <th scope="col" className="px-4 py-3">Peran</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Terakhir Masuk</th>
                    <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-body-sm text-ink-3">
                        0 baris cocok dengan penyaring.
                      </td>
                    </tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-surface/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-ink text-body-sm">{u.fullName}</span>
                          <span className="font-mono text-body-sm text-ink-3">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-ink-2">{u.divisionName}</td>
                      <td className="px-4 py-3 text-body-sm text-ink">{u.roleLabel}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded bg-success-surface px-2 py-0.5 text-body-sm font-medium text-success">
                            <Icon name="centang" size={12} />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-surface px-2 py-0.5 text-body-sm font-medium text-ink-3">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-body-sm text-ink-3">{u.lastLoginFormatted}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {u.id === currentUserId ? (
                          <span className="text-[11px] text-ink-3">Akun Anda</span>
                        ) : (
                          <div className="inline-flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditTargetUser(u);
                                setIsAddUserOpen(true);
                              }}
                              className="text-body-sm font-semibold text-primary hover:underline"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => setResetTargetUser(u)}
                              className="text-body-sm font-semibold text-primary hover:underline"
                            >
                              Reset
                            </button>
                            {u.isActive ? (
                              <button
                                type="button"
                                onClick={() => setDeactivateTargetUser(u)}
                                className="text-body-sm font-semibold text-error hover:underline"
                              >
                                Nonaktifkan
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivateUser(u)}
                                className="text-body-sm font-semibold text-success hover:underline"
                              >
                                Aktifkan
                              </button>
                            )}
                            {u.role !== "SUPER_ADMIN" ? (
                              <button
                                type="button"
                                onClick={() => setDeleteTargetUser(u)}
                                className="text-body-sm font-semibold text-error hover:underline"
                              >
                                Hapus
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border p-4 text-body-sm text-ink-3">
              <span>
                Menampilkan {filteredUsers.length === 0 ? 0 : 1} sampai {filteredUsers.length} dari {users.length} pengguna
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ==================================================== */}
      {/* 2. KONTEN TAB: DIVISI                                */}
      {/* ==================================================== */}
      {activeTab === "divisi" ? (
        <div className="flex flex-col gap-4">
          <div className="card p-3 flex items-center justify-between bg-surface">
            <div className="relative w-full max-w-[280px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
                <Icon name="cari" size={15} />
              </span>
              <input
                type="text"
                value={divisionQuery}
                onChange={(e) => setDivisionQuery(e.target.value)}
                placeholder="Cari nama atau kode divisi..."
                className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="border-b border-border bg-neutral-surface/60 text-body-sm font-semibold text-ink-2">
                    <th scope="col" className="px-4 py-3">Nama Divisi</th>
                    <th scope="col" className="px-4 py-3">Kode Awalan</th>
                    <th scope="col" className="px-4 py-3">Anggota Staf</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDivisions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-body-sm text-ink-3">
                        0 divisi tampil.
                      </td>
                    </tr>
                  ) : filteredDivisions.map((d) => (
                    <tr key={d.id} className="hover:bg-neutral-surface/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ink text-body-sm">{d.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-body-sm bg-neutral-surface px-2 py-0.5 rounded border border-border">
                          {d.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-ink-2">{d.memberCount} anggota</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {d.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded bg-success-surface px-2 py-0.5 text-body-sm font-medium text-success">
                            <Icon name="centang" size={12} />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-surface px-2 py-0.5 text-body-sm font-medium text-ink-3">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTargetDivision(d);
                              setIsAddDivisionOpen(true);
                            }}
                            className="text-body-sm font-semibold text-primary hover:underline"
                          >
                            Ubah
                          </button>
                          {d.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleToggleDivision(d)}
                              className="text-body-sm font-semibold text-error hover:underline"
                            >
                              Nonaktifkan
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleDivision(d)}
                              className="text-body-sm font-semibold text-success hover:underline"
                            >
                              Aktifkan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetDivision(d)}
                            className="text-body-sm font-semibold text-error hover:underline"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* ==================================================== */}
      {/* 3. KONTEN TAB: KATEGORI                              */}
      {/* ==================================================== */}
      {activeTab === "kategori" ? (
        <div className="flex flex-col gap-4">
          <div className="card p-3 flex items-center justify-between bg-surface">
            <div className="relative w-full max-w-[280px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
                <Icon name="cari" size={15} />
              </span>
              <input
                type="text"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder="Cari nama kategori..."
                className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="border-b border-border bg-neutral-surface/60 text-body-sm font-semibold text-ink-2">
                    <th scope="col" className="px-4 py-3">Nama Kategori</th>
                    <th scope="col" className="px-4 py-3">Digunakan pada</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-body-sm text-ink-3">
                        0 kategori tampil.
                      </td>
                    </tr>
                  ) : filteredCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-surface/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-ink text-body-sm">{c.name}</td>
                      <td className="px-4 py-3 text-body-sm text-ink-2">{c.taskCount} tugas</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded bg-success-surface px-2 py-0.5 text-body-sm font-medium text-success">
                            <Icon name="centang" size={12} />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-surface px-2 py-0.5 text-body-sm font-medium text-ink-3">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTargetCategory(c);
                              setIsAddCategoryOpen(true);
                            }}
                            className="text-body-sm font-semibold text-primary hover:underline"
                          >
                            Ubah
                          </button>
                          {c.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(c)}
                              className="text-body-sm font-semibold text-error hover:underline"
                            >
                              Nonaktifkan
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(c)}
                              className="text-body-sm font-semibold text-success hover:underline"
                            >
                              Aktifkan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetCategory(c)}
                            className="text-body-sm font-semibold text-error hover:underline"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Catatan Edukasi Kearsipan Sesuai Wireframe L17 */}
      <div className="border-t border-border pt-4 text-body-sm text-ink-3 space-y-1">
        <p className="text-ink-2 font-medium">
          Data beriwayat dinonaktifkan; tombol Hapus hanya untuk master yang belum memiliki data riwayat sama sekali.
        </p>
        <p>
          Kategori nonaktif tidak dapat dipakai tugas baru, riwayat penugasan lama tetap tampil.
        </p>
      </div>

      {/* Kumpulan Dialog Modal */}
      <ResetPasswordModal
        isOpen={Boolean(resetTargetUser)}
        onClose={() => setResetTargetUser(null)}
        user={resetTargetUser}
        onConfirm={handleConfirmResetPassword}
      />

      <DeactivateUserModal
        isOpen={Boolean(deactivateTargetUser)}
        onClose={() => setDeactivateTargetUser(null)}
        user={deactivateTargetUser}
        onConfirm={handleConfirmDeactivateUser}
      />

      <MasterDeleteModal
        isOpen={Boolean(deleteTargetUser)}
        onClose={() => setDeleteTargetUser(null)}
        heading="Hapus Pengguna"
        subjectLine={
          deleteTargetUser
            ? `${deleteTargetUser.username} · ${deleteTargetUser.fullName}`
            : ""
        }
        warning="Pengguna dihapus permanen beserta sesinya. Pengguna yang masih memiliki tugas, pengumpulan, atau reviu tidak dapat dihapus; sistem akan menolak dan menyarankan nonaktif."
        onConfirm={handleConfirmDeleteUser}
      />

      <UserFormModal
        isOpen={isAddUserOpen}
        onClose={() => {
          setIsAddUserOpen(false);
          setEditTargetUser(null);
        }}
        user={editTargetUser}
        divisions={divisions}
        onSave={handleSaveUser}
      />

      <DivisionFormModal
        isOpen={isAddDivisionOpen}
        onClose={() => {
          setIsAddDivisionOpen(false);
          setEditTargetDivision(null);
        }}
        division={editTargetDivision}
        onSave={handleSaveDivision}
      />

      <MasterDeleteModal
        isOpen={Boolean(deleteTargetDivision)}
        onClose={() => setDeleteTargetDivision(null)}
        heading="Hapus Divisi"
        subjectLine={
          deleteTargetDivision
            ? `${deleteTargetDivision.name} · ${deleteTargetDivision.code}`
            : ""
        }
        warning="Divisi dihapus permanen. Divisi yang masih memiliki anggota, tugas, atau arsip dokumen tidak dapat dihapus."
        onConfirm={handleConfirmDeleteDivision}
      />

      <CategoryFormModal
        isOpen={isAddCategoryOpen}
        onClose={() => {
          setIsAddCategoryOpen(false);
          setEditTargetCategory(null);
        }}
        category={editTargetCategory}
        onSave={handleSaveCategory}
      />

      <MasterDeleteModal
        isOpen={Boolean(deleteTargetCategory)}
        onClose={() => setDeleteTargetCategory(null)}
        heading="Hapus Kategori"
        subjectLine={deleteTargetCategory?.name ?? ""}
        warning="Kategori dihapus permanen. Kategori yang masih dipakai tugas tidak dapat dihapus; sistem akan menyarankan nonaktif."
        onConfirm={handleConfirmDeleteCategory}
      />
    </div>
  );
}
