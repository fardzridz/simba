import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DocumentsClient from "./documents-client";
import DocumentDetailPanel from "./document-detail-panel";
import type { FinalDocument } from "@/db/queries/documents";

const FIXTURE_DOCUMENTS: FinalDocument[] = [
  {
    id: "doc_huk_4",
    taskId: "tsk_huk_4",
    taskNumber: "HUK/2026/10/004",
    title: "Rekap Berita Acara Rapat Koordinasi",
    categoryName: "Kearsipan",
    divisionName: "Hukum & Sengketa",
    recipientName: "Staf Hukum & Sengketa",
    archivedDateFormatted: "17 Okt 2026",
    archivedDateTimeFormatted: "17 Okt 2026 14:20 WIB",
    archivedDaysAgo: 14,
    submissionVersion: 1,
    files: [
      {
        id: "att_huk_4_1",
        name: "berita-acara-rapat-koordinasi.pdf",
        sizeFormatted: "1,8 KB",
        checksum: "a1b2c3d4",
        downloadUrl: "/api/attachments/att_huk_4_1/download",
      },
      {
        id: "att_huk_4_2",
        name: "rekap-data-saksi.csv",
        sizeFormatted: "312 B",
        checksum: "b2c3d4e5",
        downloadUrl: "/api/attachments/att_huk_4_2/download",
      },
    ],
  },
];

describe("Katalog Dokumen L13", () => {
  it("merender tabel katalog dokumen dengan nomor tugas mono, judul, dan jumlah berkas", () => {
    const html = renderToStaticMarkup(
      <DocumentsClient
        userRole="ADMIN"
        userDivisionName="Hukum & Sengketa"
        documents={FIXTURE_DOCUMENTS}
        categoryNames={["Kearsipan", "Persuratan"]}
      />,
    );

    expect(html).toContain("Katalog Dokumen Final");
    expect(html).toContain("HUK/2026/10/004");
    expect(html).toContain("Rekap Berita Acara Rapat Koordinasi");
    expect(html).toContain("Kearsipan");
    expect(html).toContain("Diarsipkan");
    expect(html).toContain("berkas");
    expect(html).toContain("Divisi: Hukum &amp; Sengketa (terkunci)");
  });

  it("merender panel samping detail dokumen dengan tautan unduhan per berkas", () => {
    const doc = FIXTURE_DOCUMENTS[0]!;
    const html = renderToStaticMarkup(
      <DocumentDetailPanel document={doc} onClose={() => {}} />,
    );

    expect(html).toContain("Detail Dokumen");
    expect(html).toContain("HUK/2026/10/004");
    expect(html).toContain("Rekap Berita Acara Rapat Koordinasi");
    expect(html).toContain("Staf Hukum &amp; Sengketa");
    expect(html).toContain("berita-acara-rapat-koordinasi.pdf");
    expect(html).toContain("1,8 KB · a1b2c3d4");
    // Unduhan nyata lewat route server, bukan tombol simulasi.
    expect(html).toContain('href="/api/attachments/att_huk_4_1/download"');
    expect(html).not.toContain("Unduh Semua");
    expect(html).toContain("Satu tugas punya satu baris arsip.");
    expect(html).toContain("Lihat tugas asal");
  });

  it("merender pemilih divisi fleksibel ketika diakses oleh Super Admin", () => {
    const html = renderToStaticMarkup(
      <DocumentsClient
        userRole="SUPER_ADMIN"
        userDivisionName=""
        documents={FIXTURE_DOCUMENTS}
        categoryNames={["Kearsipan"]}
      />,
    );

    expect(html).toContain("Divisi: Semua");
  });
});
