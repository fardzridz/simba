/**
 * Penulis berkas Excel (.xlsx) tanpa pustaka tambahan.
 *
 * Latar belakang: proyek ini berjalan di Cloudflare Workers dan hanya memakai
 * `drizzle-orm`, `next`, `react`, `react-dom`, dan `zod`. Pustaka seperti
 * `exceljs` dibuat untuk Node (memakai `stream`/`fs`) dan menambah ratusan KB
 * ke bundle Worker. Berkas .xlsx pada dasarnya hanyalah arsip ZIP berisi
 * beberapa berkas XML, sehingga dapat ditulis langsung.
 *
 * Keputusan teknis yang disengaja:
 * - ZIP ditulis TANPA kompresi (metode `store`). Excel menerimanya, dan
 *   menghindari keharusan memakai `CompressionStream` yang tidak tersedia
 *   seragam di semua runtime.
 * - CRC32 dihitung sendiri karena dibutuhkan header ZIP.
 * - Semua teks masuk sebagai sel `inlineStr`, sehingga tidak perlu tabel
 *   `sharedStrings.xml`.
 * - Semua angka ditulis sebagai teks kecuali kolom yang memang angka, supaya
 *   nomor tugas seperti "HUK/2026/10/007" tidak berubah menjadi rumus atau
 *   tanggal oleh Excel.
 */

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
};

function writeUint16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

const encoder = new TextEncoder();

/**
 * Menyusun arsip ZIP dari daftar berkas. Ditaruh terpisah dari logika Excel
 * supaya dapat diuji sendiri: ZIP yang salah membuat Excel menolak berkas
 * tanpa penjelasan yang berguna.
 */
export function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const entries: ZipEntry[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const data = encoder.encode(file.content);
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    writeUint32(local, 0, 0x04034b50); // tanda tangan header lokal
    writeUint16(local, 4, 20); // versi yang dibutuhkan
    writeUint16(local, 6, 0); // flag umum
    writeUint16(local, 8, 0); // metode: store (tanpa kompresi)
    writeUint16(local, 10, 0); // waktu modifikasi
    writeUint16(local, 12, 0); // tanggal modifikasi
    writeUint32(local, 14, crc);
    writeUint32(local, 18, data.length); // ukuran terkompresi
    writeUint32(local, 22, data.length); // ukuran asli
    writeUint16(local, 26, nameBytes.length);
    writeUint16(local, 28, 0); // panjang field tambahan
    local.set(nameBytes, 30);

    entries.push({ name: file.name, data, crc, offset });
    chunks.push(local, data);
    offset += local.length + data.length;
  }

  const centralOffset = offset;
  let centralSize = 0;
  const centralChunks: Uint8Array[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32(central, 0, 0x02014b50); // tanda tangan direktori pusat
    writeUint16(central, 4, 20); // versi pembuat
    writeUint16(central, 6, 20); // versi yang dibutuhkan
    writeUint16(central, 8, 0); // flag umum
    writeUint16(central, 10, 0); // metode: store
    writeUint16(central, 12, 0); // waktu
    writeUint16(central, 14, 0); // tanggal
    writeUint32(central, 16, entry.crc);
    writeUint32(central, 20, entry.data.length);
    writeUint32(central, 24, entry.data.length);
    writeUint16(central, 28, nameBytes.length);
    writeUint16(central, 30, 0); // field tambahan
    writeUint16(central, 32, 0); // komentar
    writeUint16(central, 34, 0); // nomor disk
    writeUint16(central, 36, 0); // atribut internal
    writeUint32(central, 38, 0); // atribut eksternal
    writeUint32(central, 42, entry.offset);
    central.set(nameBytes, 46);

    centralChunks.push(central);
    centralSize += central.length;
  }

  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50); // tanda tangan akhir direktori pusat
  writeUint16(end, 4, 0); // nomor disk
  writeUint16(end, 6, 0); // disk tempat direktori pusat dimulai
  writeUint16(end, 8, entries.length);
  writeUint16(end, 10, entries.length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, centralOffset);
  writeUint16(end, 20, 0); // panjang komentar

  const all = [...chunks, ...centralChunks, end];
  const total = all.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of all) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}

/** Escape karakter yang tidak boleh muncul mentah di XML. */
export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

/** Ubah nomor kolom (0-based) menjadi huruf kolom Excel: 0 -> A, 26 -> AA. */
export function columnLetter(index: number): string {
  let result = "";
  let value = index;
  while (value >= 0) {
    result = String.fromCharCode((value % 26) + 65) + result;
    value = Math.floor(value / 26) - 1;
  }
  return result;
}

type CellValue = string | number;

function cellXml(reference: string, value: CellValue, style: number): string {
  const styleAttr = style > 0 ? ` s="${style}"` : "";
  if (typeof value === "number") {
    return `<c r="${reference}"${styleAttr}><v>${value}</v></c>`;
  }
  // inlineStr: teks disimpan langsung di sel, tanpa sharedStrings.
  return `<c r="${reference}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

export type SheetCell = CellValue;

export type SheetOptions = {
  sheetName: string;
  /** Baris-baris isi; baris pertama dianggap kepala tabel bila `headerRows` diisi. */
  rows: SheetCell[][];
  /** Jumlah baris awal yang ditebalkan sebagai kepala. */
  headerRows?: number;
  /** Lebar kolom dalam satuan karakter Excel. */
  columnWidths?: number[];
  /**
   * Indeks baris kepala TABEL (0-based). Baris ini ditebalkan bergaris, dan
   * seluruh baris sesudahnya diberi garis tipis. Tanpa ini, berkas Excel berisi
   * teks tanpa batas kolom sehingga sulit dibaca setelah dicetak.
   */
  tableHeaderRow?: number;
  /**
   * Jumlah baris awal yang dibekukan. Kepala laporan dan kepala tabel tetap
   * terlihat saat pengguna menggulir ke baris ke-500.
   */
  freezeRows?: number;
  /**
   * Indeks baris (0-based) kepala blok ringkasan. Blok ini diberi garis dan
   * tebal seperti kepala tabel, tetapi tanpa tombol filter.
   */
  summaryHeaderRow?: number;
  /** Jumlah baris blok ringkasan, dihitung dari `summaryHeaderRow`. */
  summaryRows?: number;
  /**
   * Indeks baris (0-based) yang selnya digabung selebar tabel.
   *
   * Dipakai untuk judul laporan. Tanpa penggabungan, judul hanya menempati
   * kolom A dan sisanya tampak kosong.
   */
  mergeRowIndices?: number[];
  /**
   * Matikan filter otomatis. Blok ringkasan memakai `tableHeaderRow` agar
   * bergaris, tetapi tidak boleh diberi tombol filter.
   */
  autoFilter?: boolean;
};

/** Gaya sel yang tersedia di `STYLES_XML`. */
const STYLE_PLAIN = 0;
const STYLE_BOLD = 1;
const STYLE_BODY = 2;
const STYLE_BODY_BORDERED = 3;
const STYLE_HEADER_BORDERED = 4;

/**
 * Susun satu lembar kerja.
 *
 * Kepala laporan (judul, periode, ringkasan) memakai gaya tebal tanpa garis;
 * kepala tabel dan baris data memakai garis tipis. Pemisahan ini disengaja:
 * memberi garis pada seluruh baris pembuka membuat berkas terlihat seperti satu
 * tabel raksasa, padahal bagian atasnya adalah keterangan.
 *
 * Dua kelompok baris bisa ditandai bergaris sekaligus (`tableHeaderRow` dan
 * `summaryHeaderRow`). Laporan ini punya blok ringkasan DI ATAS tabel data, dan
 * sebelumnya hanya satu blok yang bisa ditandai sehingga ringkasan tampil
 * sebagai teks lepas tanpa batas kolom.
 */
export function buildSheetXml(options: SheetOptions): string {
  const headerRows = options.headerRows ?? 0;
  const tableHeaderRow = options.tableHeaderRow;
  const summaryHeaderRow = options.summaryHeaderRow;
  const summaryRows = options.summaryRows ?? 0;
  const lastColumn = Math.max(0, ...options.rows.map((cells) => cells.length - 1));

  const cols = options.columnWidths?.length
    ? `<cols>${options.columnWidths
        .map(
          (width, index) =>
            `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
        )
        .join("")}</cols>`
    : "";

  /** Apakah baris ini bagian dari blok ringkasan (kepala + isinya). */
  const isSummaryRow = (rowIndex: number): boolean =>
    summaryHeaderRow !== undefined &&
    rowIndex >= summaryHeaderRow &&
    rowIndex < summaryHeaderRow + summaryRows;

  const rowsXml = options.rows
    .map((cells, rowIndex) => {
      let style: number;
      if (tableHeaderRow !== undefined && rowIndex >= tableHeaderRow) {
        style = rowIndex === tableHeaderRow ? STYLE_HEADER_BORDERED : STYLE_BODY_BORDERED;
      } else if (isSummaryRow(rowIndex)) {
        style = rowIndex === summaryHeaderRow ? STYLE_HEADER_BORDERED : STYLE_BODY_BORDERED;
      } else {
        style = rowIndex < headerRows ? STYLE_BOLD : STYLE_BODY;
      }
      const cellsXml = cells
        .map((value, columnIndex) =>
          cellXml(`${columnLetter(columnIndex)}${rowIndex + 1}`, value, style),
        )
        .join("");
      return `<row r="${rowIndex + 1}">${cellsXml}</row>`;
    })
    .join("");

  // Filter otomatis hanya untuk tabel DATA. Memberikannya ke blok ringkasan
  // akan menaruh tombol filter di atas angka rekap, yang membingungkan.
  const autoFilter =
    options.autoFilter !== false &&
    tableHeaderRow !== undefined &&
    options.rows.length > tableHeaderRow + 1
      ? `<autoFilter ref="A${tableHeaderRow + 1}:${columnLetter(lastColumn)}${options.rows.length}"/>`
      : "";

  // Penggabungan sel selebar tabel, untuk baris judul. Tanpa ini, judul hanya
  // menempati kolom A dan sisanya tampak kosong.
  const merges = (options.mergeRowIndices ?? []).filter(
    (rowIndex) => rowIndex >= 0 && rowIndex < options.rows.length,
  );
  const mergeCells =
    merges.length > 0
      ? `<mergeCells count="${merges.length}">${merges
          .map(
            (rowIndex) =>
              `<mergeCell ref="A${rowIndex + 1}:${columnLetter(lastColumn)}${rowIndex + 1}"/>`,
          )
          .join("")}</mergeCells>`
      : "";

  // Membekukan baris awal. `topLeftCell` wajib menunjuk sel pertama yang
  // bergulir, dan `activePane`/`state` harus konsisten dengannya.
  const freezeRows = options.freezeRows ?? 0;
  const pane =
    freezeRows > 0
      ? `<pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/>`
      : "";

  // Rentang terpakai. Excel bisa menghitungnya sendiri, tetapi setiap berkas
  // .xlsx yang dibuat Excel memuatnya, dan sebagian pembaca pihak ketiga
  // mengandalkannya untuk tahu ukuran lembar tanpa memindai seluruh baris.
  const dimension =
    options.rows.length > 0
      ? `<dimension ref="A1:${columnLetter(lastColumn)}${options.rows.length}"/>`
      : "";

  // Urutan elemen di dalam `<worksheet>` ditentukan skema OOXML: dimension,
  // sheetViews, cols, sheetData, autoFilter, lalu mergeCells. Menukarnya membuat
  // Excel menolak berkas.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${dimension}${pane ? `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>` : ""}${cols}<sheetData>${rowsXml}</sheetData>${autoFilter}${mergeCells}</worksheet>`;
}

/**
 * Gaya sel:
 * - 0 = biasa
 * - 1 = kepala: tebal
 * - 2 = badan: teks terbungkus, rata atas
 * - 3 = badan + garis tipis sekeliling sel, agar batas kolom terbaca saat
 *       laporan dicetak dari Excel
 * - 4 = kepala tabel + garis tipis + tebal
 *
 * Dua hal di sini wajib ada dan mudah terlewat:
 * - `<cellStyles>` dengan gaya bernama "Normal". Tanpa itu, pembaca .xlsx
 *   seperti openpyxl menganggap berkas tidak punya gaya bawaan dan memunculkan
 *   peringatan saat dibuka.
 * - Gaya "Normal" harus menunjuk ke `xfId` yang ada di `cellStyleXfs`. Berkas
 *   dengan `cellStyles` tetapi `cellStyleXfs` hanya satu entri membuat Excel
 *   menganggap definisi gaya tidak lengkap.
 */
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

/**
 * Nama lembar kerja yang sah menurut Excel: maksimal 31 karakter, tanpa
 * `: \ / ? * [ ]`, dan tidak boleh kosong.
 *
 * Fungsi ini ada karena nama lembar yang tidak sah membuat Excel menolak
 * seluruh berkas, bukan hanya mengabaikan namanya. Lebih baik nama panjang
 * dipotong daripada berkasnya tidak bisa dibuka.
 */
export function safeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, " ").trim();
  if (cleaned.length === 0) return "Sheet1";
  return cleaned.slice(0, 31);
}

function workbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(safeSheetName(sheetName))}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

/**
 * Susun berkas .xlsx utuh dari satu lembar kerja.
 *
 * Struktur minimal yang diterima Excel: `[Content_Types].xml`, `_rels/.rels`,
 * `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml`, dan
 * `xl/worksheets/sheet1.xml`.
 */
export function buildXlsx(options: SheetOptions): Uint8Array {
  return buildZip([
    { name: "[Content_Types].xml", content: CONTENT_TYPES },
    { name: "_rels/.rels", content: ROOT_RELS },
    { name: "xl/workbook.xml", content: workbookXml(options.sheetName) },
    { name: "xl/_rels/workbook.xml.rels", content: WORKBOOK_RELS },
    { name: "xl/styles.xml", content: STYLES_XML },
    { name: "xl/worksheets/sheet1.xml", content: buildSheetXml(options) },
  ]);
}
