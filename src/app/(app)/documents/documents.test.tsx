import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DocumentsClient from "./documents-client";
import DocumentDetailPanel from "./document-detail-panel";
import type { CatalogFile, CatalogItem } from "@/db/queries/documents";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/documents",
  useSearchParams: () => new URLSearchParams("q=pleno"),
}));

function fileFixture(overrides: Partial<CatalogFile>): CatalogFile {
  return {
    id: "att_1",
    name: "rekap-berita-acara-rapat.pdf",
    sizeFormatted: "2,1 MB",
    checksum: "c13a90f7",
    downloadUrl: "/api/attachments/att_1/download",
    ...overrides,
  };
}

function docFixture(overrides: Partial<CatalogItem>): CatalogItem {
  return {
    id: "arc_1",
    taskId: "task_1",
    taskNumber: "HUK/2026/10/002",
    title: "Rekap Berita Acara Rapat Pleno",
    categoryName: "Persuratan",
    divisionId: "div_hukum",
    divisionName: "Hukum & Sengketa",
    divisionCode: "HUK",
    recipientName: "Ahmad Fauzi",
    archivedDateFormatted: "17 Okt 2026",
    archivedDateTimeFormatted: "17 Okt 2026 14:20 WIB",
    archivedDaysAgo: 1,
    submissionVersion: 2,
    files: [fileFixture({})],
    ...overrides,
  };
}

const BASE_PROPS = {
  filters: { q: "", categoryId: "", umur: "", divisionId: "" },
  page: 1,
  pageSize: 25,
  totalPages: 1,
  categoryOptions: [
    { id: "cat_1", name: "Persuratan" },
    { id: "cat_2", name: "Kearsipan" },
  ],
  divisionOptions: [] as { id: string; name: string }[],
  userDivisionName: "Hukum & Sengketa",
};

describe("Katalog Dokumen L13", () => {
  it("merender baris dari data server: nomor tugas mono, judul, penerima, dan jumlah berkas", () => {
    const items = [
      docFixture({}),
      docFixture({
        id: "arc_2",
        taskId: "task_2",
        taskNumber: "HUK/2026/09/021",
        title: "Dokumentasi Kegiatan Pengawasan",
        categoryName: "Kegiatan dan Laporan",
        recipientName: "Budi Santoso",
        files: [],
      }),
    ];

    const html = renderToStaticMarkup(
      <DocumentsClient role="ADMIN" items={items} total={2} {...BASE_PROPS} />,
    );

    expect(html).toContain("Katalog Dokumen Final");
    expect(html).toContain("HUK/2026/10/002");
    expect(html).toContain("Rekap Berita Acara Rapat Pleno");
    expect(html).toContain("Persuratan");
    expect(html).toContain("Budi Santoso");
    expect(html).toContain("Diarsipkan");
    expect(html).toContain("Divisi: Hukum &amp; Sengketa (terkunci)");
    expect(html).toContain("Menampilkan 1 sampai 2 dari 2 dokumen");
  });

  it("menampilkan keadaan tanpa berkas secara jujur, bukan tautan mati", () => {
    const html = renderToStaticMarkup(
      <DocumentsClient
        role="ADMIN"
        items={[docFixture({ files: [] })]}
        total={2}
        {...BASE_PROPS}
      />,
    );

    expect(html).toContain("0 berkas");
    expect(html).toContain("tidak ada berkas");
    expect(html).not.toContain("href=\"#\"");
  });

  it("merender pemilih divisi nyata untuk Super Admin", () => {
    const html = renderToStaticMarkup(
      <DocumentsClient
        role="SUPER_ADMIN"
        items={[]}
        total={0}
        {...BASE_PROPS}
        divisionOptions={[
          { id: "div_hukum", name: "Hukum & Sengketa" },
          { id: "div_pgs", name: "Pengawasan" },
        ]}
      />,
    );

    expect(html).toContain("Divisi: Semua");
    expect(html).toContain("Pengawasan");
    expect(html).not.toContain("(terkunci)");
  });

  it("menampilkan keadaan kosong tanpa filter dan karena filter untuk total 0", () => {
    const htmlBelumAda = renderToStaticMarkup(
      <DocumentsClient role="ADMIN" items={[]} {...BASE_PROPS} total={0} />,
    );
    expect(htmlBelumAda).toContain("Belum ada dokumen final terarsip");

    const htmlTerfilter = renderToStaticMarkup(
      <DocumentsClient
        role="ADMIN"
        items={[]}
        {...BASE_PROPS}
        total={0}
        filters={{ q: "pleno", categoryId: "cat_1", umur: "30", divisionId: "" }}
      />,
    );
    expect(htmlTerfilter).toContain("Belum ada dokumen final pada filter ini");
    expect(htmlTerfilter).toContain("Hapus filter");
  });
});

describe("Panel Detail Dokumen L13", () => {
  it("merender metadata kearsipan dan tautan unduh nyata per berkas", () => {
    const html = renderToStaticMarkup(
      <DocumentDetailPanel document={docFixture({})} onClose={() => {}} />,
    );

    expect(html).toContain("Detail Dokumen");
    expect(html).toContain("HUK/2026/10/002");
    expect(html).toContain("Rekap Berita Acara Rapat Pleno");
    expect(html).toContain("Ahmad Fauzi");
    expect(html).toContain("Versi 2");
    expect(html).toContain("rekap-berita-acara-rapat.pdf");
    expect(html).toContain("2,1 MB · c13a90f7");
    expect(html).toContain('href="/api/attachments/att_1/download"');
    expect(html).toContain("Lihat tugas asal");
    // Simulasi unduh gabungan dihapus; unduhan per berkas nyata.
    expect(html).not.toContain("Unduh Semua");
    expect(html).not.toContain("alert");
  });

  it("merender keadaan belum memilih dokumen", () => {
    const html = renderToStaticMarkup(
      <DocumentDetailPanel document={null} onClose={() => {}} />,
    );

    expect(html).toContain("Pilih salah satu dokumen");
  });
});
