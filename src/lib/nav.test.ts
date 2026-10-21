import { describe, expect, it } from "vitest";
import { initialsOf, isActive, navFor, pageTitle } from "./nav";

describe("navigasi per peran", () => {
  it("memakai label sidebar sesuai wireframe tiap peran", () => {
    expect(navFor("USER").map((item) => item.label)).toEqual([
      "Dashboard",
      "Tugas Saya",
      "Katalog Dokumen",
      "Notifikasi",
      "Akun Saya",
    ]);
    expect(navFor("ADMIN").map((item) => item.label)).toEqual([
      "Dashboard",
      "Tugas Divisi",
      "Katalog Dokumen",
      "Laporan",
      "Log Aktivitas",
      "Notifikasi",
      "Pengaturan",
      "Akun Saya",
    ]);
    expect(navFor("SUPER_ADMIN").map((item) => item.label)).toEqual([
      "Dashboard",
      "Semua Tugas",
      "Katalog Dokumen",
      "Laporan",
      "Log Aktivitas",
      "Kelola Master",
      "Notifikasi",
      "Pengaturan",
      "Akun Saya",
    ]);
  });

  it("menandai hanya halaman yang sudah dibangun sebagai tersedia", () => {
    expect(navFor("USER").filter((item) => item.available).map((item) => item.href)).toEqual([
      "/dashboard",
      "/tasks",
      "/documents",
      "/notifications",
      "/account",
    ]);
    expect(navFor("ADMIN").filter((item) => item.available).map((item) => item.href)).toEqual([
      "/dashboard",
      "/tasks",
      "/documents",
      "/reports",
      "/logs",
      "/notifications",
      "/settings",
      "/account",
    ]);
    expect(navFor("SUPER_ADMIN").filter((item) => item.available).map((item) => item.href)).toEqual([
      "/dashboard",
      "/tasks",
      "/documents",
      "/reports",
      "/logs",
      "/master",
      "/notifications",
      "/settings",
      "/account",
    ]);
  });

  it("menghitung item aktif tanpa ikut mencocokkan awalan yang mirip", () => {
    expect(isActive("/tasks/123", "/tasks")).toBe(true);
    expect(isActive("/tasks", "/tasks")).toBe(true);
    expect(isActive("/tasks-lama", "/tasks")).toBe(false);
    expect(isActive("/dashboard", "/tasks")).toBe(false);
  });

  it("memakai judul dashboard per peran dan label menu di halaman lain", () => {
    expect(pageTitle("/dashboard", "USER")).toBe("Dashboard");
    expect(pageTitle("/dashboard", "ADMIN")).toBe("Dashboard Divisi");
    expect(pageTitle("/dashboard", "SUPER_ADMIN")).toBe("Dashboard Lintas Divisi");
    expect(pageTitle("/tasks", "ADMIN")).toBe("Tugas Divisi");
    expect(pageTitle("/tasks/2026/10/007", "SUPER_ADMIN")).toBe("Semua Tugas");
    expect(pageTitle("/settings", "ADMIN")).toBe("Pengaturan");
  });

  it("mengambil inisial dua huruf dari nama", () => {
    expect(initialsOf("Siti Rahma")).toBe("SR");
    expect(initialsOf("Ahmad Fauzi Pratama")).toBe("AF");
    expect(initialsOf("  ")).toBe("?");
  });
});
