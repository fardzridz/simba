import { describe, expect, it } from "vitest";
import { buildXlsx, columnLetter, crc32, safeSheetName, xmlEscape } from "./xlsx-writer";

/**
 * Penulis .xlsx diuji dengan membongkar kembali berkas yang dihasilkan.
 *
 * Alasannya: berkas yang strukturnya salah tidak menghasilkan galat di server.
 * Excel hanya akan menampilkan "berkas rusak" kepada pengguna, tanpa petunjuk
 * apa pun. Karena itu tes ini membaca ZIP-nya sendiri dan memeriksa XML di
 * dalamnya, bukan sekadar memastikan "tidak melempar galat".
 */

/** Membaca daftar berkas di dalam ZIP tanpa kompresi, memakai direktori pusat. */
function readZip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();

  // Cari tanda tangan akhir direktori pusat (0x06054b50) dari belakang.
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP tidak memiliki akhir direktori pusat");

  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const files = new Map<string, string>();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("Entri direktori pusat tidak sah");
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (method !== 0) throw new Error(`Metode kompresi tak terduga untuk ${name}`);

    // Header lokal punya panjang nama dan field tambahan sendiri.
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const content = decoder.decode(bytes.subarray(dataStart, dataStart + compressedSize));
    files.set(name, content);

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

const HEADERS = ["No", "Nomor Tugas", "Petugas"];

describe("crc32", () => {
  it("menghasilkan nilai yang dikenal untuk masukan baku", () => {
    // Nilai acuan CRC32 untuk "123456789" adalah 0xCBF43926.
    const bytes = new TextEncoder().encode("123456789");
    expect(crc32(bytes)).toBe(0xcbf43926);
  });

  it("memberi nilai berbeda untuk isi berbeda", () => {
    const a = crc32(new TextEncoder().encode("laporan"));
    const b = crc32(new TextEncoder().encode("laporan "));
    expect(a).not.toBe(b);
  });
});

describe("columnLetter", () => {
  it("memetakan indeks kolom ke huruf Excel", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
    expect(columnLetter(51)).toBe("AZ");
    expect(columnLetter(52)).toBe("BA");
  });
});

describe("xmlEscape", () => {
  it("meng-escape karakter yang merusak XML", () => {
    expect(xmlEscape(`Hukum & Sengketa <A> "kutip" 'tunggal'`)).toBe(
      "Hukum &amp; Sengketa &lt;A&gt; &quot;kutip&quot; &apos;tunggal&apos;",
    );
  });

  it("tidak mengubah teks biasa", () => {
    expect(xmlEscape("Laporan Hasil Pengawasan")).toBe("Laporan Hasil Pengawasan");
  });
});

describe("buildXlsx: struktur berkas", () => {
  it("memuat seluruh bagian yang diwajibkan format .xlsx", () => {
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [HEADERS, ["1", "HUK/2026/10/007", "Ahmad Fauzi"]],
        headerRows: 1,
      }),
    );

    for (const required of [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]) {
      expect(files.has(required), `${required} tidak ada di dalam berkas`).toBe(true);
    }
  });

  it("menulis isi sel ke lembar kerja", () => {
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [HEADERS, ["1", "HUK/2026/10/007", "Ahmad Fauzi"]],
        headerRows: 1,
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain("HUK/2026/10/007");
    expect(sheet).toContain("Ahmad Fauzi");
    expect(sheet).toContain("Nomor Tugas");
    // Sel pertama berada di A1 dan sel terakhir baris pertama di C1.
    expect(sheet).toContain('r="A1"');
    expect(sheet).toContain('r="C1"');
  });

  it("meng-escape karakter khusus agar XML tetap sah", () => {
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [["Hukum & Sengketa"]],
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain("Hukum &amp; Sengketa");
    // "&" mentah akan membuat XML tidak sah.
    expect(sheet).not.toMatch(/Hukum & Sengketa/);
  });

  it("menulis angka sebagai angka, bukan teks", () => {
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [["Total", 128]],
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    // Angka memakai <v>, teks memakai inlineStr.
    expect(sheet).toContain("<v>128</v>");
    expect(sheet).not.toContain('t="inlineStr"><is><t xml:space="preserve">128');
  });

  it("mempertahankan nol di depan dan garis miring pada nomor tugas", () => {
    // Nomor tugas harus tetap teks: bila diperlakukan sebagai angka atau
    // tanggal, Excel akan mengubahnya menjadi rumus atau serial tanggal.
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [["HUK/2026/10/007", "0012"]],
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain("HUK/2026/10/007");
    expect(sheet).toContain(">0012<");
  });

  it("menulis lebar kolom bila diminta", () => {
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [HEADERS],
        columnWidths: [6, 20, 26],
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain('width="6"');
    expect(sheet).toContain('width="20"');
    expect(sheet).toContain('customWidth="1"');
  });

  it("menghasilkan ZIP yang dapat dibaca kembali tanpa sisa byte", () => {
    // Direktori pusat harus menunjuk offset yang benar. Bila offset salah,
    // pembaca ZIP lain akan gagal meski tes sebelumnya lolos.
    const bytes = buildXlsx({ sheetName: "Laporan", rows: [HEADERS] });
    const files = readZip(bytes);

    expect(files.size).toBe(6);
    for (const [, content] of files) {
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("mendeklarasikan gaya bawaan bernama Normal", () => {
    // Tanpa `<cellStyles>` + `cellStyle name="Normal"`, pembaca .xlsx seperti
    // openpyxl memperingatkan "Workbook contains no default style". Excel masih
    // membukanya, tetapi berkas laporan resmi tidak boleh memicu peringatan.
    const files = readZip(buildXlsx({ sheetName: "Laporan", rows: [HEADERS] }));
    const styles = files.get("xl/styles.xml")!;

    expect(styles).toContain("<cellStyles count=\"1\">");
    expect(styles).toContain('name="Normal"');
    expect(styles).toContain('builtinId="0"');
  });

  it("memakai nama lembar yang diminta, bukan nama tetap", () => {
    // Cacat lama: parameter `sheetName` diterima tetapi diabaikan, sehingga
    // semua berkas selalu bernama "Laporan". Pemanggil yang memberi nama lain
    // tidak akan pernah tahu namanya tidak dipakai.
    const files = readZip(buildXlsx({ sheetName: "Rekap Oktober", rows: [HEADERS] }));
    const workbook = files.get("xl/workbook.xml")!;

    expect(workbook).toContain('name="Rekap Oktober"');
    expect(workbook).not.toContain('name="Laporan"');
  });

  it("membersihkan nama lembar yang tidak sah menurut Excel", () => {
    // Karakter : \ / ? * [ ] membuat Excel menolak seluruh berkas, bukan hanya
    // mengabaikan namanya. Nama panjang juga harus dipotong 31 karakter.
    expect(safeSheetName("Laporan/Bulan:Oktober")).toBe("Laporan Bulan Oktober");
    expect(safeSheetName("")).toBe("Sheet1");
    expect(safeSheetName("   ")).toBe("Sheet1");
    expect(safeSheetName("x".repeat(40))).toHaveLength(31);
  });

  it("memberi garis hanya pada tabel, bukan pada baris pembuka", () => {
    // Baris pembuka (judul, periode, ringkasan) adalah keterangan, bukan tabel.
    // Memberinya garis membuat berkas terlihat seperti satu tabel raksasa.
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [["LAPORAN PENUGASAN"], [], HEADERS, ["1", "HUK/1", "Ahmad"]],
        headerRows: 1,
        tableHeaderRow: 2,
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    // Baris 1 memakai gaya tebal tanpa garis (s=1), kepala tabel dan badan
    // memakai gaya bergaris (s=4 dan s=3).
    expect(sheet).toContain('r="A1" s="1"');
    expect(sheet).toContain('r="A3" s="4"');
    expect(sheet).toContain('r="A4" s="3"');
  });

  it("menambahkan filter otomatis dan membekukan kepala tabel", () => {
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [HEADERS, ["1", "HUK/1", "Ahmad"], ["2", "HUK/2", "Siti"]],
        tableHeaderRow: 0,
        freezeRows: 1,
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    // Filter otomatis menutup seluruh kolom tabel (A sampai C) dan seluruh baris.
    expect(sheet).toContain('<autoFilter ref="A1:C3"/>');
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('ySplit="1"');
  });

  it("menaruh elemen worksheet sesuai urutan skema OOXML", () => {
    // Urutan wajib: sheetViews, cols, sheetData, autoFilter, mergeCells.
    // Menukarnya membuat Excel menolak berkas meski isinya benar.
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [HEADERS, ["1", "HUK/1", "Ahmad"]],
        tableHeaderRow: 0,
        freezeRows: 1,
        columnWidths: [6, 20, 26],
        mergeRowIndices: [1],
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    const order = ["<dimension", "<sheetViews>", "<cols>", "<sheetData>", "<autoFilter", "<mergeCells"].map(
      (tag) => sheet.indexOf(tag),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("menggabung baris judul selebar tabel", () => {
    // Cacat yang dilaporkan pengguna: berkas terlihat "hanya 2 kolom" karena
    // judul dan keterangan hanya menempati kolom A, dan tabel 11 kolom baru
    // muncul jauh di bawah. Judul yang digabung membuat lebar tabel terlihat
    // sejak baris pertama.
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [["LAPORAN PENUGASAN"], HEADERS, ["1", "HUK/1", "Ahmad"]],
        headerRows: 1,
        tableHeaderRow: 1,
        mergeRowIndices: [0],
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain('<mergeCells count="1">');
    expect(sheet).toContain('<mergeCell ref="A1:C1"/>');
  });

  it("mengabaikan indeks penggabungan yang di luar jangkauan", () => {
    // Indeks salah tidak boleh menghasilkan referensi sel yang tidak ada:
    // Excel menolak seluruh berkas kalau `<mergeCell>` menunjuk baris kosong.
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [HEADERS],
        mergeRowIndices: [0, 5, -1],
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    expect(sheet).toContain('<mergeCells count="1">');
    expect(sheet).not.toContain("A6");
  });

  it("memberi garis pada blok ringkasan tanpa tombol filter di atasnya", () => {
    // Ringkasan di atas tabel data harus bergaris supaya terbaca sebagai tabel
    // kecil, tetapi tidak boleh punya tombol filter.
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [
          ["LAPORAN PENUGASAN"],
          ["Total", "Selesai"],
          [76, 30],
          [],
          HEADERS,
          ["1", "HUK/1", "Ahmad"],
        ],
        headerRows: 1,
        summaryHeaderRow: 1,
        summaryRows: 2,
        tableHeaderRow: 4,
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    // Baris 2 dan 3 (ringkasan) bergaris: s=4 untuk kepala, s=3 untuk isinya.
    expect(sheet).toContain('r="A2" s="4"');
    expect(sheet).toContain('r="A3" s="3"');
    // Baris 1 (judul) tetap tebal tanpa garis.
    expect(sheet).toContain('r="A1" s="1"');
    // Filter hanya menutup tabel data (A5:C6), bukan ringkasan.
    expect(sheet).toContain('<autoFilter ref="A5:C6"/>');
  });

  it("bisa mematikan filter otomatis", () => {
    const files = readZip(
      buildXlsx({
        sheetName: "Laporan",
        rows: [HEADERS, ["1", "HUK/1", "Ahmad"]],
        tableHeaderRow: 0,
        autoFilter: false,
      }),
    );
    const sheet = files.get("xl/worksheets/sheet1.xml")!;

    expect(sheet).not.toContain("<autoFilter");
  });
});
