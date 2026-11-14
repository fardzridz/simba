import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DashboardError from "./dashboard/error";
import DashboardLoading from "./dashboard/loading";
import DocumentsError from "./documents/error";
import DocumentsLoading from "./documents/loading";
import LogsError from "./logs/error";
import LogsLoading from "./logs/loading";
import TasksError from "./tasks/error";
import TasksLoading from "./tasks/loading";

/**
 * Berkas konvensi `loading.tsx` dan `error.tsx` untuk empat rute utama.
 *
 * Yang dijaga di sini bukan tampilan, melainkan tiga hal yang mudah hilang
 * saat menyalin berkas: pengumuman status ke pembaca layar, tidak adanya angka
 * karangan selama memuat, dan tidak bocornya detail internal pada galat.
 */
const LOADINGS = [
  { name: "Dashboard", Component: DashboardLoading, text: "Memuat ringkasan dashboard." },
  { name: "Tugas", Component: TasksLoading, text: "Memuat daftar tugas." },
  { name: "Dokumen", Component: DocumentsLoading, text: "Memuat katalog dokumen final." },
  { name: "Log", Component: LogsLoading, text: "Memuat log aktivitas." },
] as const;

const ERRORS = [
  {
    name: "Dashboard",
    Component: DashboardError,
    title: "Dashboard gagal dimuat",
    actionHref: "/tasks",
  },
  {
    name: "Tugas",
    Component: TasksError,
    title: "Daftar tugas gagal dimuat",
    actionHref: "/dashboard",
  },
  {
    name: "Dokumen",
    Component: DocumentsError,
    title: "Katalog dokumen gagal dimuat",
    actionHref: "/dashboard",
  },
  {
    name: "Log",
    Component: LogsError,
    title: "Log aktivitas gagal dibaca",
    actionHref: "/dashboard",
  },
] as const;

describe.each(LOADINGS)("Keadaan memuat $name", ({ Component, text }) => {
  const html = renderToStaticMarkup(<Component />);

  it("mengumumkan status memuat ke pembaca layar", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(text);
  });

  it("tidak menampilkan satu digit pun selama memuat", () => {
    const visibleText = html.replace(/<[^>]+>/g, " ");
    expect(visibleText).not.toMatch(/\d/);
  });

  it("menyembunyikan kerangka dari pembaca layar", () => {
    expect(html).toContain('aria-hidden="true"');
  });
});

describe.each(ERRORS)("Keadaan galat $name", ({ Component, title, actionHref }) => {
  it("menyebut modul yang gagal dan menyediakan tindakan pemulihan", () => {
    const html = renderToStaticMarkup(
      <Component error={new Error("boom")} retry={vi.fn()} />,
    );

    expect(html).toContain(title);
    expect(html).toContain("Coba muat ulang");
    expect(html).toContain('role="alert"');
    expect(html).toContain(`href="${actionHref}"`);
  });

  it("tidak membocorkan detail internal", () => {
    const html = renderToStaticMarkup(
      <Component
        error={new Error("D1_ERROR: no such table: task_assignments")}
        retry={vi.fn()}
      />,
    );

    expect(html).not.toContain("no such table");
    expect(html).not.toContain("task_assignments");
    expect(html).not.toContain("D1_ERROR");
  });

  it("tetap terender saat yang dilempar bukan Error", () => {
    const html = renderToStaticMarkup(
      <Component error={null} retry={vi.fn()} />,
    );

    expect(html).toContain(title);
  });
});
