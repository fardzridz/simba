import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReportTable from "./report-table";
import type { ReportRow } from "@/db/queries/reports";

// Tautan judul memakai `next/link`; render statis berjalan tanpa runtime Next.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

/**
 * Tabel dipakai bersama oleh halaman layar dan halaman cetak. Tes ini mengunci
 * dua hal yang mudah berbeda tanpa terlihat: urutan kolom, dan penomoran baris
 * yang harus melanjutkan halaman sebelumnya.
 */

function row(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    assignmentId: "asg_1",
    taskId: "tsk_1",
    taskNumber: "HUK/2026/10/007",
    title: "Laporan Hasil Pengawasan Wilayah A",
    categoryName: "Kegiatan dan Laporan",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    staffName: "Ahmad Fauzi",
    staffNip: "198705122010011001",
    staffPosition: "Staf Pelaksana",
    priority: "MENDESAK",
    status: "SELESAI",
    revisionCount: 0,
    dueAt: Date.UTC(2026, 9, 18, 16, 59) / 1000,
    completedAt: Date.UTC(2026, 9, 17, 16, 59) / 1000,
    archived: true,
    ...overrides,
  };
}

describe("ReportTable: kepala tabel", () => {
  it("menampilkan 11 kolom dalam urutan yang sama dengan format ekspor", () => {
    const html = renderToStaticMarkup(
      <ReportTable rows={[row()]} emptyMessage="kosong" />,
    );

    const headers = [
      "No",
      "Nomor Tugas",
      "Judul &amp; Kategori",
      "Petugas &amp; Divisi",
      "Prioritas",
      "Status",
      "Tenggat",
      "Selesai",
      "Ketepatan Waktu",
      "Revisi",
      "Dokumen",
    ];

    let previous = -1;
    for (const header of headers) {
      const position = html.indexOf(header);
      expect(position, `kolom ${header} tidak ditemukan`).toBeGreaterThan(-1);
      expect(position, `kolom ${header} keluar urutan`).toBeGreaterThan(previous);
      previous = position;
    }
  });
});

describe("ReportTable: isi baris", () => {
  it("memuat seluruh bidang, termasuk jabatan dan NIP di dalam sel Petugas", () => {
    const html = renderToStaticMarkup(
      <ReportTable rows={[row()]} emptyMessage="kosong" />,
    );

    expect(html).toContain("HUK/2026/10/007");
    expect(html).toContain("Laporan Hasil Pengawasan Wilayah A");
    expect(html).toContain("Kegiatan dan Laporan");
    expect(html).toContain("Ahmad Fauzi");
    expect(html).toContain("Staf Pelaksana");
    expect(html).toContain("NIP 198705122010011001");
    expect(html).toContain("Mendesak");
    expect(html).toContain("Selesai");
    expect(html).toContain("18 Okt 2026");
    expect(html).toContain("Tepat waktu");
    expect(html).toContain("Terarsip");
  });

  it("melanjutkan penomoran dari halaman sebelumnya", () => {
    // Halaman 2 dengan 25 baris per halaman harus mulai dari nomor 26, bukan 1.
    const html = renderToStaticMarkup(
      <ReportTable rows={[row()]} startNumber={26} emptyMessage="kosong" />,
    );

    expect(html).toContain(">26<");
    expect(html).not.toContain(">1<");
  });

  it("tidak menautkan judul pada hasil cetak", () => {
    // Di kertas, tautan tidak berguna dan hanya menambah garis bawah biru.
    const html = renderToStaticMarkup(
      <ReportTable rows={[row()]} emptyMessage="kosong" />,
    );

    expect(html).not.toContain("/tasks/tsk_1");
  });

  it("menautkan judul di halaman layar bila diminta", () => {
    const html = renderToStaticMarkup(
      <ReportTable rows={[row()]} emptyMessage="kosong" linked />,
    );

    expect(html).toContain("/tasks/tsk_1?assignment=asg_1");
  });

  it("menulis tanda kosong, bukan NaN atau undefined, saat data belum ada", () => {
    const html = renderToStaticMarkup(
      <ReportTable
        rows={[
          row({
            status: "BELUM_DIKERJAKAN",
            completedAt: null,
            staffNip: null,
            staffPosition: null,
            archived: false,
          }),
        ]}
        emptyMessage="kosong"
      />,
    );

    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });
});

describe("ReportTable: keadaan kosong", () => {
  it("menyebut sebab tabel kosong, bukan tabel tanpa penjelasan", () => {
    const html = renderToStaticMarkup(<ReportTable rows={[]} emptyMessage="Tidak ada data." />);

    expect(html).toContain("Tidak ada data.");
  });

  it("menampilkan aksi tambahan di dalam sel kosong bila diberikan", () => {
    const html = renderToStaticMarkup(
      <ReportTable
        rows={[]}
        emptyMessage="Tidak ada data."
        emptyAction={<button type="button">Hapus filter</button>}
      />,
    );

    expect(html).toContain("Hapus filter");
  });
});
