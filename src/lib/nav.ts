import type { Role } from "@/db/schema";
import type { IconName } from "@/app/icons";

/**
 * Menu navigasi per peran. Urutan dan labelnya mengikuti sidebar pada wireframe:
 * L03 (staf), L04 (admin divisi), L05 (super admin); item Pengaturan dari L18.
 * `available: false` berarti halaman belum dibangun; item tetap tampil redup
 * dengan penanda "(menyusul)" supaya tidak ada menu tanpa layar.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  available: boolean;
};

export const ROLE_LABEL: Record<Role, string> = {
  USER: "Staf Pelaksana",
  ADMIN: "Admin Divisi",
  SUPER_ADMIN: "Super Admin",
};

const NAV_BY_ROLE: Record<Role, readonly NavItem[]> = {
  USER: [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard", available: true },
    { href: "/tasks", label: "Tugas Saya", icon: "tugas", available: true },
    { href: "/documents", label: "Katalog Dokumen", icon: "dokumen", available: true },
    { href: "/notifications", label: "Notifikasi", icon: "notifikasi", available: true },
    { href: "/account", label: "Akun Saya", icon: "akun", available: true },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard", available: true },
    { href: "/tasks", label: "Tugas Divisi", icon: "tugas", available: true },
    { href: "/documents", label: "Katalog Dokumen", icon: "dokumen", available: true },
    { href: "/reports", label: "Laporan", icon: "laporan", available: true },
    { href: "/logs", label: "Log Aktivitas", icon: "log", available: true },
    { href: "/notifications", label: "Notifikasi", icon: "notifikasi", available: true },
    { href: "/settings", label: "Pengaturan", icon: "pengaturan", available: true },
    { href: "/account", label: "Akun Saya", icon: "akun", available: true },
  ],
  SUPER_ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard", available: true },
    { href: "/tasks", label: "Semua Tugas", icon: "tugas", available: true },
    { href: "/documents", label: "Katalog Dokumen", icon: "dokumen", available: true },
    { href: "/reports", label: "Laporan", icon: "laporan", available: true },
    { href: "/logs", label: "Log Aktivitas", icon: "log", available: true },
    { href: "/master", label: "Kelola Master", icon: "pengguna", available: true },
    { href: "/notifications", label: "Notifikasi", icon: "notifikasi", available: true },
    { href: "/settings", label: "Pengaturan", icon: "pengaturan", available: true },
    { href: "/account", label: "Akun Saya", icon: "akun", available: true },
  ],
};

const DASHBOARD_TITLE: Record<Role, string> = {
  USER: "Dashboard",
  ADMIN: "Dashboard Divisi",
  SUPER_ADMIN: "Dashboard Lintas Divisi",
};

export function navFor(role: Role): readonly NavItem[] {
  return NAV_BY_ROLE[role];
}

/** Item aktif juga saat pengguna berada di halaman turunan (`/tasks/123`). */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Judul di top bar. Dashboard memakai judul per peran (L03/L04/L05). */
export function pageTitle(pathname: string, role: Role): string {
  if (pathname === "/dashboard") return DASHBOARD_TITLE[role];
  const item = navFor(role).find((candidate) => isActive(pathname, candidate.href));
  return item?.label ?? "Portal Manajemen Penugasan";
}

/** Inisial dua huruf untuk avatar (DESIGN.md §8: tidak ada foto orang). */
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0] ?? "");
  return (letters.join("") || "?").toUpperCase();
}
