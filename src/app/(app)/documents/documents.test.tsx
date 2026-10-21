import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DocumentsClient from "./documents-client";
import DocumentDetailPanel from "./document-detail-panel";
import { MOCK_FINAL_DOCUMENTS } from "@/lib/mock-documents";

describe("Katalog Dokumen L13", () => {
  it("merender tabel katalog dokumen dengan nomor tugas mono, judul, dan jumlah berkas", () => {
    const html = renderToStaticMarkup(
      <DocumentsClient userRole="ADMIN" userDivisionName="Hukum & Sengketa" />,
    );

    expect(html).toContain("Katalog Dokumen Final");
    expect(html).toContain("HUK/2026/10/002");
    expect(html).toContain("Rekap Berita Acara Rapat Pleno");
    expect(html).toContain("Persuratan");
    expect(html).toContain("Diarsipkan");
    expect(html).toContain("berkas");
    expect(html).toContain("Divisi: Hukum &amp; Sengketa (terkunci)");
  });

  it("merender panel samping detail dokumen dengan rincian berkas dan tombol Unduh Semua", () => {
    const doc = MOCK_FINAL_DOCUMENTS[0]!;
    const html = renderToStaticMarkup(
      <DocumentDetailPanel document={doc} onClose={() => {}} />,
    );

    expect(html).toContain("Detail Dokumen");
    expect(html).toContain("HUK/2026/10/002");
    expect(html).toContain("Rekap Berita Acara Rapat Pleno");
    expect(html).toContain("Ahmad Fauzi");
    expect(html).toContain("rekap-berita-acara-rapat.pdf");
    expect(html).toContain("2,1 MB · c13a90f7");
    expect(html).toContain("Unduh Semua");
    expect(html).toContain("Satu tugas punya satu baris arsip.");
    expect(html).toContain("Lihat tugas asal");
  });

  it("merender pemilih divisi fleksibel ketika diakses oleh Super Admin", () => {
    const html = renderToStaticMarkup(
      <DocumentsClient userRole="SUPER_ADMIN" userDivisionName="" />,
    );

    expect(html).toContain("Divisi: Semua");
    expect(html).toContain("Pengawasan");
    expect(html).toContain("Sekretariat");
  });
});
