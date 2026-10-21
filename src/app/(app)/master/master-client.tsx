"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/app/icons";
import {
  MOCK_MASTER_USERS,
  MOCK_MASTER_DIVISIONS,
  MOCK_MASTER_CATEGORIES,
  type MasterUser,
  type MasterDivision,
  type MasterCategory,
} from "@/lib/mock-master";
import {
  ResetPasswordModal,
  DeactivateUserModal,
  UserFormModal,
  DivisionFormModal,
  CategoryFormModal,
} from "./master-dialogs";

export type MasterTab = "pengguna" | "divisi" | "kategori";

export default function MasterClient() {
  const [activeTab, setActiveTab] = useState<MasterTab>("pengguna");

  // State Data Master (Murni di frontend)
  const [users, setUsers] = useState<MasterUser[]>(MOCK_MASTER_USERS);
  const [divisions, setDivisions] = useState<MasterDivision[]>(MOCK_MASTER_DIVISIONS);
  const [categories, setCategories] = useState<MasterCategory[]>(MOCK_MASTER_CATEGORIES);

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
  const [editTargetUser, setEditTargetUser] = useState<MasterUser | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // State Modal Divisi
  const [editTargetDivision, setEditTargetDivision] = useState<MasterDivision | null>(null);
  const [isAddDivisionOpen, setIsAddDivisionOpen] = useState(false);

  // State Modal Kategori
  const [editTargetCategory, setEditTargetCategory] = useState<MasterCategory | null>(null);
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
      if (selectedDivision !== "semua" && u.divisionName !== selectedDivision) return false;
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

  // Aksi Penanganan Pengguna
  const handleSaveUser = (userData: Partial<MasterUser>) => {
    if (editTargetUser) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editTargetUser.id ? ({ ...u, ...userData } as MasterUser) : u)),
      );
      showNotification(`Data pengguna ${userData.fullName} berhasil diperbarui.`);
    } else {
      setUsers((prev) => [userData as MasterUser, ...prev]);
      showNotification(`Pengguna baru ${userData.fullName} (@${userData.username}) berhasil ditambahkan.`);
    }
  };

  const handleConfirmResetPassword = (username: string) => {
    showNotification(`Kata sandi akun @${username} berhasil direset dan sesi aktif diakhiri.`);
  };

  const handleConfirmDeactivateUser = (userId: string, reason: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u)),
    );
    showNotification(`Akun berhasil dinonaktifkan. Alasan tercatat di log audit: "${reason}".`);
  };

  const handleActivateUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u)),
    );
    showNotification("Akun pengguna berhasil diaktifkan kembali.");
  };

  // Aksi Penanganan Divisi
  const handleSaveDivision = (divData: Partial<MasterDivision>) => {
    if (editTargetDivision) {
      setDivisions((prev) =>
        prev.map((d) => (d.id === editTargetDivision.id ? ({ ...d, ...divData } as MasterDivision) : d)),
      );
      showNotification(`Divisi ${divData.name} berhasil diperbarui.`);
    } else {
      setDivisions((prev) => [...prev, divData as MasterDivision]);
      showNotification(`Divisi baru ${divData.name} (${divData.code}) berhasil ditambahkan.`);
    }
  };

  // Aksi Penanganan Kategori
  const handleSaveCategory = (catData: Partial<MasterCategory>) => {
    if (editTargetCategory) {
      setCategories((prev) =>
        prev.map((c) => (c.id === editTargetCategory.id ? ({ ...c, ...catData } as MasterCategory) : c)),
      );
      showNotification(`Kategori ${catData.name} berhasil diperbarui.`);
    } else {
      setCategories((prev) => [...prev, catData as MasterCategory]);
      showNotification(`Kategori baru ${catData.name} berhasil ditambahkan.`);
    }
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
          48 pengguna, 5 divisi, 8 kategori pada data contoh. Tabel menampilkan akun seed pengembangan.
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
              <option value="Hukum & Sengketa">Hukum &amp; Sengketa</option>
              <option value="Pengawasan">Pengawasan</option>
              <option value="SDM & Organisasi">SDM &amp; Organisasi</option>
              <option value="Sekretariat">Sekretariat</option>
              <option value="Penindakan">Penindakan</option>
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
                  {filteredUsers.map((u) => (
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
                              onClick={() => handleActivateUser(u.id)}
                              className="text-body-sm font-semibold text-success hover:underline"
                            >
                              Aktifkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border p-4 text-body-sm text-ink-3">
              <span>Menampilkan 1 sampai {filteredUsers.length} dari {users.length} pengguna</span>
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
                  {filteredDivisions.map((d) => (
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
                  {filteredCategories.map((c) => (
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
          Akun beriwayat dinonaktifkan, bukan dihapus. Divisi dan kategori memakai pola tab dan tabel yang sama.
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

      <UserFormModal
        isOpen={isAddUserOpen}
        onClose={() => {
          setIsAddUserOpen(false);
          setEditTargetUser(null);
        }}
        user={editTargetUser}
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

      <CategoryFormModal
        isOpen={isAddCategoryOpen}
        onClose={() => {
          setIsAddCategoryOpen(false);
          setEditTargetCategory(null);
        }}
        category={editTargetCategory}
        onSave={handleSaveCategory}
      />
    </div>
  );
}
