import { describe, expect, it } from "vitest";
import {
  DEFAULT_DATE_BASIS,
  DEFAULT_PERIOD,
  buildBackHref,
  buildExportHref,
  buildPrintHref,
  buildReportsUrl,
  describeScope,
  pageItems,
  type ReportsFilterState,
  type ReportsPaging,
} from "./report-actions";

/**
 * Regresi untuk janji inti halaman laporan:
 * filter yang tampil di layar dan filter yang dipakai berkas ekspor berasal
 * dari keadaan yang sama, dan ekspor tidak pernah terpotong oleh paginasi.
 */

function filters(overrides: Partial<ReportsFilterState> = {}): ReportsFilterState {
  return {
    period: DEFAULT_PERIOD,
    divisionId: null,
    status: "",
    categoryId: "",
    userId: "",
    dateBasis: DEFAULT_DATE_BASIS,
    dateFrom: "",
    dateTo: "",
    ...overrides,
  };
}

const PAGING: ReportsPaging = { page: 1, pageSize: 25 };

describe("buildReportsUrl: URL layar", () => {
  it("tidak mengirim nilai default, sehingga URL tetap bersih", () => {
    expect(buildReportsUrl(filters(), PAGING, false)).toBe("/reports");
  });

  it("mengirim setiap filter yang aktif", () => {
    const url = buildReportsUrl(
      filters({
        period: "bulan_lalu",
        divisionId: "div_hukum",
        status: "SELESAI",
        categoryId: "cat_persuratan",
        userId: "usr_1",
        dateBasis: "tenggat",
        dateFrom: "2026-10-01",
        dateTo: "2026-10-31",
      }),
      PAGING,
      false,
    );

    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("period")).toBe("bulan_lalu");
    expect(params.get("divisi")).toBe("div_hukum");
    expect(params.get("status")).toBe("SELESAI");
    expect(params.get("kategori")).toBe("cat_persuratan");
    expect(params.get("petugas")).toBe("usr_1");
    expect(params.get("acuan")).toBe("tenggat");
    expect(params.get("dateFrom")).toBe("2026-10-01");
    expect(params.get("dateTo")).toBe("2026-10-31");
  });

  it("membawa nomor halaman dan ukuran halaman hanya bila bukan bawaan", () => {
    expect(buildReportsUrl(filters(), { page: 3, pageSize: 50 }, false)).toBe(
      "/reports?page=3&perPage=50",
    );
    // Halaman 1 ukuran 25 adalah bawaan: tidak perlu ditulis.
    expect(buildReportsUrl(filters(), { page: 1, pageSize: 25 }, false)).toBe("/reports");
  });
});

describe("buildReportsUrl: tanpa parameter halaman saat menuju berkas", () => {
  it("TIDAK membawa nomor halaman: ekspor selalu memuat seluruh hasil filter", () => {
    // Tanpa ini, pengguna yang mengekspor dari halaman 3 akan mendapat berkas
    // berisi 25 baris dan mengira laporannya terpotong.
    const url = buildReportsUrl(filters(), { page: 3, pageSize: 50 }, true);
    const params = new URLSearchParams(url.split("?")[1]);

    expect(params.get("page")).toBeNull();
    expect(params.get("perPage")).toBeNull();
  });

  it("selalu menyebut periode dan acuan tanggal secara eksplisit", () => {
    // Berkas unduhan tidak boleh bergantung pada nilai default yang bisa
    // berubah di kemudian hari.
    const url = buildReportsUrl(filters(), PAGING, true);
    const params = new URLSearchParams(url.split("?")[1]);

    expect(params.get("period")).toBe(DEFAULT_PERIOD);
    expect(params.get("acuan")).toBe(DEFAULT_DATE_BASIS);
  });

  it("membawa seluruh filter yang aktif", () => {
    const url = buildReportsUrl(
      filters({ status: "DIBATALKAN", userId: "usr_9", dateFrom: "2026-10-01", dateTo: "2026-10-05" }),
      PAGING,
      true,
    );
    const params = new URLSearchParams(url.split("?")[1]);

    expect(params.get("status")).toBe("DIBATALKAN");
    expect(params.get("petugas")).toBe("usr_9");
    expect(params.get("dateFrom")).toBe("2026-10-01");
    expect(params.get("dateTo")).toBe("2026-10-05");
  });
});

describe("buildExportHref: format berkas", () => {
  it("menunjuk rute ekspor, bukan halaman layar", () => {
    expect(buildExportHref(filters(), PAGING, "csv")).toMatch(/^\/reports\/export/);
  });

  it("CSV memakai URL bersih tanpa parameter format", () => {
    const href = buildExportHref(filters(), PAGING, "csv");
    expect(href).not.toContain("format=");
    // Filternya harus tetap sama dengan yang dipakai layar.
    expect(href).toBe(`/reports/export${buildReportsUrl(filters(), PAGING, true).slice("/reports".length)}`);
  });

  it("Excel menambahkan format=xlsx tanpa merusak filter yang sudah ada", () => {
    const href = buildExportHref(filters({ status: "SELESAI" }), PAGING, "xlsx");
    const params = new URLSearchParams(href.split("?")[1]);

    expect(href).toContain("format=xlsx");
    expect(params.get("status")).toBe("SELESAI");
    expect(params.get("period")).toBe(DEFAULT_PERIOD);
  });
});

describe("buildPrintHref: halaman cetak", () => {
  it("menunjuk rute cetak tersendiri, bukan halaman layar", () => {
    // Cetak tidak boleh memakai `window.print()` di halaman layar: halaman itu
    // hanya memuat 25 baris, sehingga hasil cetaknya terpotong tanpa peringatan.
    expect(buildPrintHref(filters(), PAGING)).toMatch(/^\/reports\/print/);
  });

  it("tidak membawa nomor halaman, sama seperti ekspor", () => {
    const params = new URLSearchParams(
      buildPrintHref(filters(), { page: 4, pageSize: 50 }).split("?")[1],
    );

    expect(params.get("page")).toBeNull();
    expect(params.get("perPage")).toBeNull();
  });

  it("membawa filter yang sama persis dengan ekspor", () => {
    const state = filters({
      period: "bulan_lalu",
      status: "SELESAI",
      userId: "usr_2",
      dateBasis: "tenggat",
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
    });

    const printParams = new URLSearchParams(buildPrintHref(state, PAGING).split("?")[1]);
    const exportParams = new URLSearchParams(buildExportHref(state, PAGING, "csv").split("?")[1]);

    for (const [key, value] of exportParams) {
      expect(printParams.get(key), `parameter ${key} hilang di URL cetak`).toBe(value);
    }
  });
});

describe("buildBackHref: kembali dari halaman cetak", () => {
  const state = {
    period: "bulan_lalu" as const,
    divisionId: "div_hukum",
    status: "SELESAI",
    categoryId: "cat_persuratan",
    userId: "usr_2",
    dateBasis: "tenggat" as const,
  };

  it("kembali ke halaman layar, bukan rute berkas", () => {
    const href = buildBackHref(state, {});
    expect(href).toMatch(/^\/reports\?/);
    expect(href).not.toContain("/reports/export");
    expect(href).not.toContain("/reports/print");
  });

  it("membawa seluruh filter yang aktif", () => {
    const params = new URLSearchParams(buildBackHref(state, {}).split("?")[1]);

    expect(params.get("period")).toBe("bulan_lalu");
    expect(params.get("acuan")).toBe("tenggat");
    expect(params.get("divisi")).toBe("div_hukum");
    expect(params.get("status")).toBe("SELESAI");
    expect(params.get("kategori")).toBe("cat_persuratan");
    expect(params.get("petugas")).toBe("usr_2");
  });

  it("memakai tanggal mentah dari URL, bukan hasil konversi epoch", () => {
    // Konversi epoch -> YYYY-MM-DD bisa menggeser tanggal satu hari. Nilai yang
    // diketik pengguna harus dikembalikan apa adanya.
    const params = new URLSearchParams(
      buildBackHref(state, { dateFrom: "2026-09-01", dateTo: "2026-09-30" }).split("?")[1],
    );

    expect(params.get("dateFrom")).toBe("2026-09-01");
    expect(params.get("dateTo")).toBe("2026-09-30");
  });

  it("tidak membawa parameter halaman", () => {
    const href = buildBackHref(state, {});
    expect(href).not.toContain("page=");
    expect(href).not.toContain("perPage=");
  });
});

describe("describeScope", () => {
  it("hanya menyebut filter yang benar-benar dipersempit", () => {
    const text = describeScope({
      rangeLabel: "1 Okt 2026 sampai 31 Okt 2026",
      divisionName: "Hukum & Sengketa",
      statusLabel: "Semua status",
      categoryLabel: "Semua kategori",
      staffLabel: "Semua petugas",
    });

    expect(text).toBe("1 Okt 2026 sampai 31 Okt 2026 · Hukum & Sengketa");
    expect(text).not.toContain("Semua status");
  });

  it("menyebut filter yang aktif", () => {
    const text = describeScope({
      rangeLabel: "1 Okt 2026 sampai 31 Okt 2026",
      divisionName: "Semua divisi",
      statusLabel: "Selesai",
      categoryLabel: "Persuratan",
      staffLabel: "Ahmad Fauzi",
    });

    expect(text).toContain("Selesai");
    expect(text).toContain("Persuratan");
    expect(text).toContain("Ahmad Fauzi");
  });
});

describe("pageItems", () => {
  it("menampilkan semua halaman bila jumlahnya sedikit", () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("meringkas halaman jauh dengan elipsis, tetapi selalu menyertakan ujung", () => {
    const items = pageItems(10, 20);

    expect(items[0]).toBe(1);
    expect(items[items.length - 1]).toBe(20);
    expect(items).toContain("gap");
    expect(items).toContain(10);
    // Halaman yang jauh dari posisi sekarang tidak perlu ditampilkan.
    expect(items).not.toContain(5);
  });

  it("tidak menyisipkan elipsis tepat di samping halaman pertama atau terakhir", () => {
    expect(pageItems(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageItems(20, 20)).toEqual([1, "gap", 19, 20]);
  });
});
