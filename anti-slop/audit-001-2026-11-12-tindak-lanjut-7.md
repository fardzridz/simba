# Audit 001 Tindak Lanjut Bagian 7 (perombakan halaman laporan)

Tanggal: 12 November 2026
Permintaan: perombakan halaman `/reports` sesuai permintaan instansi
Sudah selesai sebelumnya: 1 sampai 14, ditambah bagian 6 (pembersihan mock)

---

## Ringkasan

Halaman `/reports` dirombak dari **rekap per divisi** menjadi **daftar penugasan
per baris**: filter lengkap di atas, satu tabel penuh di bawah, dan ekspor yang
isinya persis sama dengan isi tabel.

Yang dibuang: lima kartu KPI besar, panel ekspor terpisah, pratinjau A4, tabel
rekap per divisi yang bisa di-expand, kop instansi, dan blok tanda tangan.

Yang baru: tabel 11 kolom tingkat penugasan, tiga tombol ekspor (CSV, Excel,
Cetak/PDF), generator `.xlsx` tanpa pustaka, dan rute cetak tersendiri.

| Ukuran | Sebelum | Sesudah |
|---|---|---|
| Satuan baris | divisi (agregat) | penugasan per petugas |
| Kolom data | 5 angka ringkasan | 13 bidang dalam 11 kolom |
| Ekspor | angka agregat per divisi | seluruh baris hasil filter |
| Pustaka baru | - | **nol** |
| Tes modul laporan | 48 | **110** |
| Tes seluruh repo | 305 | **360** |

---

## Cacat 1: halaman laporan tidak dapat menjawab "tugas siapa yang terlambat"

**Kondisi lama.** `getReport()` mengembalikan `ReportDivisionRow[]`: satu baris
per divisi, berisi `total`, `completed`, `onTime`, `late`. Tidak ada nama
petugas, nomor tugas, atau tanggal per tugas.

Akibatnya, ketika Kepala Divisi membaca "Divisi Hukum terlambat 2", ia tidak
punya cara mengetahui tugas mana yang terlambat dan siapa penanggung jawabnya
dari halaman itu. Ia harus membuka `/tasks` dan menyaring manual, padahal
halaman laporan adalah tempat pertanyaan itu seharusnya dijawab.

**Perbaikan.** Kueri ditulis ulang menjadi tingkat baris
(`src/db/queries/reports.ts`, 682 baris):

```
task_assignments
  inner join tasks            (judul, nomor, prioritas, tenggat)
  inner join users            (nama, NIP, jabatan)
  inner join divisions        (nama divisi)
  inner join categories       (kategori)
  left  join document_archive (status arsip)
```

Satu baris = satu penugasan pada satu petugas. Tugas yang dikerjakan tiga orang
menjadi tiga baris, karena status, tanggal selesai, dan ketepatan waktu memang
milik masing-masing petugas, bukan milik tugas.

---

## Cacat 2: "ekspor" mengunduh angka, bukan data

**Kondisi lama.** Tombol ekspor memanggil `getReport()` yang sama dengan layar,
sehingga berkas CSV berisi rekap per divisi. Pengguna yang ingin mengolah data
di Excel harus menyalin ulang dari tabel.

**Perbaikan.** Ekspor memakai `getReportExport()`: satu kueri, seluruh baris
hasil filter, tanpa parameter halaman. `buildExportHref()` secara sengaja tidak
pernah menulis `page`/`perPage`, sehingga pengguna yang mengekspor dari halaman 3
tetap mendapat seluruh baris.

Batas `MAX_EXPORT_ROWS = 20_000` mencegah berkas raksasa menghabiskan memori
Worker. Bila terlewati, respons menyertakan header `X-Report-Truncated` berisi
jumlah baris sebenarnya, dan halaman cetak menampilkan peringatan tertulis.
Laporan yang terpotong tanpa pemberitahuan lebih berbahaya daripada laporan yang
menolak dibuat.

---

## Cacat 3: tombol Cetak hanya mencetak 25 baris (ditemukan saat membaca ulang)

Ini cacat yang saya buat sendiri di iterasi pertama perombakan, dan saya
temukan ketika memeriksa ulang berkas sebelum melapor.

**Kondisi salah.** Tombol "Cetak / PDF" memanggil `window.print()` pada halaman
layar. Halaman layar memuat **satu halaman data** (25 baris) karena ada
paginasi. Jadi mencetak halaman itu menghasilkan laporan berisi 25 dari 128
baris, **tanpa satu pun tanda** bahwa 103 baris tidak ikut tercetak.

Lebih buruk lagi, teks tepat di bawah tombol berbunyi "Ketiga tombol memakai
filter yang sedang aktif dan memuat seluruh 128 baris hasil filter". Kalimat itu
benar untuk CSV dan Excel, tetapi **bohong untuk tombol Cetak**.

**Perbaikan.** Cetak dipindahkan ke rute tersendiri, `/reports/print`:

| | Halaman layar `/reports` | Halaman cetak `/reports/print` |
|---|---|---|
| Kueri | `getReportRows` (satu halaman) | `getReportExport` (seluruh hasil) |
| Paginasi | ada | tidak ada |
| Tombol ekspor | ada | tidak ada |
| Tabel | `ReportTable` | `ReportTable` (komponen sama) |
| Kop & tanda tangan | tidak ada | tidak ada |

Tombol Cetak sekarang berupa `<a href="/reports/print" target="_blank">`, bukan
`window.print()`.

Selain itu, halaman layar tetap bisa dicetak lewat Ctrl+P. Karena itu ditambahkan
satu paragraf yang **hanya tampil saat dicetak** (`hidden print:block`):

> Halaman ini hanya memuat 25 dari 128 penugasan. Untuk mencetak seluruh hasil
> filter, tutup dialog cetak lalu tekan tombol "Cetak / PDF".

Peringatan itu tidak muncul di layar, hanya di kertas. Membiarkan Ctrl+P tanpa
penjelasan berarti membiarkan pengguna menerima laporan terpotong tanpa tahu.

---

## Cacat 4: tabel layar dan tabel cetak disusun dua kali

Iterasi pertama saya menulis tabel yang sama dua kali: sekali di
`reports-client.tsx`, sekali di `print/page.tsx`. Keduanya punya 11 kolom yang
sama dan sel yang sama.

Ini kesalahan yang sama bentuknya dengan yang sudah diperbaiki di
`report-row-format.ts`: dua sumber untuk satu kebenaran. Menambah atau mengubah
kolom berarti dua tempat harus diubah, dan cepat atau lambat satu tertinggal.
Pada laporan resmi, tabel cetak yang kolomnya berbeda dari layar adalah cacat
yang tidak bisa dijelaskan.

**Perbaikan.** Satu komponen `src/app/(app)/reports/report-table.tsx` (161 baris)
dipakai keduanya. Komponen ini tanpa state dan tanpa efek samping, sehingga dapat
dirender di server (halaman cetak) maupun di peramban (halaman layar).
Perbedaan antar halaman disampaikan lewat prop, bukan lewat salinan kode:

| Prop | Layar | Cetak |
|---|---|---|
| `startNumber` | nomor baris pertama halaman | 1 |
| `linked` | `true` (judul menaut ke detail) | `false` (tautan tak berguna di kertas) |
| `emptyAction` | tombol "Hapus filter" | tidak ada |

---

## Cacat 5: generator Excel mengabaikan nama lembar dan tanpa garis tabel

Dua cacat di `src/lib/xlsx-writer.ts` yang tidak terlihat dari tes awal, dan
baru ketahuan saat saya memeriksa berkas hasilnya dengan `openpyxl`.

**5a. Parameter `sheetName` diterima tetapi tidak dipakai.**

```ts
// Sebelum: nama lembar selalu "Laporan", apa pun yang diminta pemanggil
const WORKBOOK_XML = `...<sheet name="Laporan" sheetId="1" r:id="rId1"/>...`;
```

Pemanggil yang memberi nama lain tidak akan pernah tahu namanya diabaikan.
Berkasnya tetap terbuka, jadi tidak ada galat yang memberi petunjuk.

Diperbaiki dengan `workbookXml(options.sheetName)` dan fungsi `safeSheetName()`
yang membersihkan karakter terlarang (`: \ / ? * [ ]`), memotong 31 karakter,
dan mengganti nama kosong menjadi `Sheet1`. Nama lembar yang tidak sah membuat
Excel menolak **seluruh berkas**, bukan hanya mengabaikan namanya.

**5b. Tabel tanpa garis, sehingga tidak terbaca setelah dicetak.**

Berkas awal hanya punya dua gaya: tebal dan terbungkus. Tidak ada garis sel sama
sekali. Di layar Excel masih terbaca karena ada garis bantu, tetapi begitu
dicetak, 11 kolom teks mengalir tanpa batas dan pembaca kehilangan kaitan antara
nilai dan judul kolomnya.

Diperbaiki dengan dua gaya baru: `STYLE_BODY_BORDERED` (garis tipis sekeliling
sel) dan `STYLE_HEADER_BORDERED` (tebal + garis). Garis hanya diberikan pada
tabel, bukan pada baris pembuka, karena judul/periode/ringkasan adalah
keterangan, bukan tabel. Memberinya garis membuat berkas terlihat seperti satu
tabel raksasa.

Sekalian ditambahkan dua hal yang membuat berkas berguna saat dipakai:
`freezeRows` (kepala laporan dan kepala tabel tetap terlihat saat menggulir
ke baris ke-500) dan `autoFilter` (pengguna bisa menyaring per kolom langsung di
Excel).

---

## Cacat 6: filter status tidak punya pilihan "Dibatalkan"

Ditemukan saat merancang filter baru. Data punya lima status, tetapi dropdown
lama hanya berisi empat. Baris berstatus `DIBATALKAN` tidak bisa difilter sama
sekali, padahal tabel ringkasan lama ikut menghitungnya.

`REPORT_STATUS_OPTIONS` sekarang diturunkan langsung dari `ASSIGNMENT_STATUSES`,
sehingga status baru di skema otomatis muncul di filter.

---

## Keputusan desain yang perlu diketahui

### Lebar kolom: 13 bidang dalam 11 kolom

Permintaan awal: 11 kolom ditambah NIP dan Jabatan. Kalau dibuat 13 kolom
terpisah, totalnya **301mm**, sedangkan A4 landscape hanya menyisakan **267mm**
bersih (297mm dikurangi margin 2x12mm). Kolom terakhir akan terpotong.

Karena itu NIP dan Jabatan ditaruh **di dalam sel Petugas** sebagai baris kecil:

```
Ahmad Fauzi            <- nama, tebal
Staf Pelaksana         <- jabatan, kecil
Hukum & Sengketa       <- divisi, kecil
NIP 198705122010011001 <- NIP, mono, kecil
```

Hasilnya 11 kolom visual, 13 bidang data, total **259mm**. Muat.

Ada tes yang mengunci angka ini dari dua arah: total harus `<= 267mm` (muat
landscape) dan `> 180mm` (tidak muat portrait, jadi landscape memang diperlukan).
Menambah kolom tanpa menyesuaikan kertas akan menggagalkan tes sebelum laporan
sempat dicetak.

### Cetak pindah ke A4 landscape

`globals.css`: `@page { size: A4 landscape; margin: 12mm }`. Ditambah
`thead { display: table-header-group }` agar kepala tabel diulang di setiap
halaman, dan `tr { break-inside: avoid }` agar satu baris tidak terbelah dua
halaman.

### Arti "tepat waktu" tetap `completedAt <= dueAt`

Tugas yang selesai tepat pada detik tenggat dihitung tepat waktu. Keterlambatan
dibulatkan **ke atas** dengan minimum "Terlambat 1 hari", karena "Terlambat 0
hari" terbaca seolah tidak terlambat.

Dua arti keterlambatan dibedakan tegas, baik di layar maupun di ekspor:

| Istilah | Arti |
|---|---|
| `late` | sudah selesai, tetapi melewati tenggat |
| `overdue` | belum selesai, dan tenggatnya sudah lewat |

Menyamakan keduanya membuat ringkasan tidak dapat dipertanggungjawabkan.

### Excel ditulis sendiri, tanpa pustaka

`.xlsx` adalah arsip ZIP berisi beberapa XML. Generator ditulis tangan
(`src/lib/xlsx-writer.ts`, 335 baris): ZIP tanpa kompresi (metode `store`),
CRC32 dihitung sendiri, teks sebagai `inlineStr`, angka sebagai `<v>`.

Alasannya bukan sekadar menghindari dependensi: `exceljs` dan sejenisnya dibuat
untuk Node (memakai `stream`/`fs`) dan menambah ratusan KB ke bundle Cloudflare
Worker. Risikonya tidak sepadan untuk satu tabel.

---

## Kendali negatif

Setiap perbaikan diuji dengan cara merusaknya lebih dulu, untuk memastikan tes
benar-benar menangkap kesalahan dan bukan lolos kebetulan.

| # | Kerusakan yang disengaja | Hasil |
|---|---|---|
| 1 | `accuracyOf`: `<=` diubah menjadi `<` | **GAGAL**: "selesai TEPAT pada detik tenggat masih tepat waktu" |
| 2 | URL ekspor ikut membawa `page` | **GAGAL**: `expected '3' to be null` |
| 3 | Tambah 2 kolom 25mm tanpa mengubah kertas | **GAGAL**: `expected 301 to be less than or equal to 273` + tes 11 kolom |
| 4 | Tombol cetak dikembalikan ke `window.print()` di halaman layar | **GAGAL**: 2 tes (`href="/reports/print"` tidak ditemukan) |
| 5 | Nama lembar dikembalikan ke nilai tetap `"Laporan"` | **GAGAL**: `to contain 'name="Rekap Oktober"'` |
| 6 | Garis tabel dihapus dari gaya sel | **GAGAL**: `to contain 'r="A3" s="4"'` |
| 7 | Halaman cetak memakai `getReportRows` (25 baris) | **GAGAL**: `not to contain 'getReportRows'` |

Semua dipulihkan setelah dijalankan, dan pemulihannya diperiksa ulang dengan
membaca kembali berkasnya.

**Catatan proses.** Kendali #5 dan #6 sempat dijalankan **paralel pada berkas
yang sama** (`xlsx-writer.ts`). Keduanya menulis berkas cadangan sendiri lalu
saling memulihkan, sehingga hasil akhirnya berkas yang salah: `workbookXml`
kembali ke nilai tetap meski tes melaporkan "dipulihkan". Ketahuan karena saya
memeriksa ulang isi berkas setelahnya. Pelajarannya: kendali negatif pada berkas
yang sama wajib berurutan, dan pemulihan harus diverifikasi dengan membaca isi
berkas, bukan dengan percaya pada pesan "dipulihkan".

---

## Validasi berkas Excel dengan pembaca independen

Tes sendiri tidak cukup untuk format berkas: ZIP yang strukturnya salah tetap
lolos kalau yang memeriksa adalah kode yang menulisnya. Karena itu berkas diuji
dengan pembaca lain.

**Lapis 1: `System.IO.Compression` (pembaca ZIP bawaan Windows).** Enam entri
terbongkar, XML sah menurut parser .NET, jumlah `<row>` sesuai.

**Lapis 2: `openpyxl 3.1.5`** (pembaca .xlsx sungguhan, tersedia di mesin).
Dijalankan dengan `warnings.simplefilter("error")` supaya peringatan apa pun
menggagalkan uji:

```
BERHASIL DIBUKA, tanpa peringatan
nama sheet   : Laporan Penugasan
dimensi      : A1:K12
freeze_panes : A11
auto_filter  : A10:K12

baris 1  (pembuka) tebal: True  border kiri: None
baris 10 (kepala)  tebal: True  border kiri: thin
baris 11 (badan)   tebal: False border kiri: thin

isi baris data pertama:
['1', 'HUK/2026/10/007', 'Laporan Hasil Pengawasan Wilayah A (Kegiatan dan Laporan)',
 'Ahmad Fauzi / Staf Pelaksana / Hukum & Sengketa / NIP 198705122010011001',
 'Mendesak', 'Selesai', '18 Okt 2026', '17 Okt 2026', 'Tepat waktu', '0', 'Terarsip']
```

Yang terbukti dari keluaran ini: nama lembar dihormati, pembekuan baris tepat di
bawah kepala tabel, filter otomatis menutup A10:K12, garis hanya di tabel, lebar
kolom terpasang, dan tidak ada satu pun peringatan.

Peringatan `Workbook contains no default style` yang muncul di iterasi
sebelumnya sudah hilang setelah `<cellStyles count="1">` dengan
`<cellStyle name="Normal" xfId="0" builtinId="0"/>` ditambahkan.

---

## Berkas

### Ditulis ulang

| Berkas | Baris | Perubahan |
|---|---|---|
| `src/db/queries/reports.ts` | 682 | rekap per divisi menjadi baris penugasan; `queryReport`, `getReportRows`, `getReportExport`, `ReportDateBasis` |
| `src/app/(app)/reports/reports-client.tsx` | 515 | 8 filter, 3 tombol, tabel bersama, paginasi |
| `src/app/(app)/reports/report-actions.ts` | 186 | `reportParams` bersama, `buildExportHref`, `buildPrintHref`, `buildBackHref` |
| `src/app/(app)/reports/export/route.ts` | 124 | CSV + xlsx, satu kueri, `MAX_EXPORT_ROWS` |
| `src/app/(app)/reports/page.tsx` | 85 | filter + paginasi + opsi filter |
| `src/app/(app)/reports/loading.tsx` | 73 | kerangka mengikuti tata letak baru |
| `src/app/globals.css` | - | A4 landscape, kepala tabel berulang, baris tak terbelah |

### Baru

| Berkas | Baris | Isi |
|---|---|---|
| `src/lib/report-row-format.ts` | 190 | satu sumber format untuk layar/cetak/CSV/Excel |
| `src/lib/xlsx-writer.ts` | 335 | generator .xlsx tanpa pustaka |
| `src/lib/report-csv.ts` | 54 | CSV ber-BOM, CRLF |
| `src/app/(app)/reports/report-table.tsx` | 161 | tabel bersama layar & cetak |
| `src/app/(app)/reports/print/page.tsx` | 141 | halaman cetak seluruh hasil filter |
| `src/app/(app)/reports/print/print-toolbar.tsx` | 57 | bilah alat cetak |

### Dihapus

| Berkas | Alasan |
|---|---|
| `src/lib/report-letterhead.ts` + tes | kop instansi tidak dipakai lagi |
| `src/app/(app)/reports/letterhead-dialog.tsx` + tes | dialog pengisian kop |
| `planReportAction` di `report-actions.ts` | gerbang "kop wajib sebelum ekspor" tidak berlaku |

### Tes

| Berkas | Tes | Mengunci |
|---|---|---|
| `report-actions.test.ts` | 24 | URL layar/ekspor/cetak, tanpa parameter halaman |
| `report-row-format.test.ts` | 16 | arti tepat waktu, lebar kolom vs kertas |
| `xlsx-writer.test.ts` | 18 | struktur ZIP, nama lembar, gaya, filter otomatis |
| `report-csv.test.ts` | 9 | BOM, CRLF, pengapitan koma |
| `reports.test.tsx` | 26 | tata letak, isi tabel, tiga tombol |
| `report-table.test.tsx` | 10 | urutan kolom, penomoran lanjut, tautan |
| `print-page.test.ts` | 6 | cetak memakai kueri ekspor, tanpa kop/TTD |
| `print-rules.test.ts` | 6 | A4 landscape, lebar kolom, kepala berulang |

---

## Delivery Gate

### Block 1: Hard Gate

| Rule | Status | Bukti |
|---|---|---|
| R-02 em dash | **PASS** | 0 di seluruh berkas yang ditulis |
| R-03 mobile | **PASS** | Filter 2 kolom di ponsel, 3 di tablet, 4 di desktop; tabel laporan boleh menggulir menurut DESIGN-SYSTEM §5 |
| R-17 angka tanpa sumber | **PASS** | Semua angka berasal dari kueri; `loading.tsx` tidak mengarang angka |
| R-18 testimoni | **PASS** | Tidak ada |
| R-23 aset | **PASS** | Tidak ada aset baru |
| R-24 navigasi mati | **PASS** | Tautan ekspor, cetak, dan judul tugas semuanya menuju rute yang ada (`next build` mendaftarkan `/reports`, `/reports/export`, `/reports/print`) |
| R-25 kontras | **PASS** | Hanya token warna yang sudah ada; tidak ada warna baru |
| R-26 kontrol mati | **PASS** | Setiap kontrol punya efek: 8 filter mengubah URL, 3 tombol membuka rute nyata, paginasi mengubah `page` |
| R-27 state | **PASS** | Hanya satu state (`statusMessage`) untuk umpan balik "Hapus filter"; tidak ada state yang menyalin data server |
| R-28 FAQ | **PASS** | Tidak ada |
| R-32 keyboard & fokus | **PASS** | Semua kontrol punya `focus-visible:outline`; filter punya `<label htmlFor>`; halaman cetak punya `<caption>` dan `scope="col"` |
| R-33 patch via skrip | **PASS** | Berkas ditulis lewat alat tulis berkas; skrip hanya untuk kendali negatif dan validasi, hasilnya diperiksa ulang |
| R-34 tema | **PASS** | Tidak ada toggle tema |
| R-35 verifikasi | **PASS** | 360 tes di 3 zona waktu, `tsc` bersih, `next build` sukses, token selaras, 7 kendali negatif, validasi `openpyxl` |
| R-36 klaim palsu | **PASS** | **Inti perombakan.** Teks "memuat seluruh N baris" kini benar untuk ketiga tombol; sebelumnya bohong untuk Cetak |
| R-37 arah desain | **PASS** | Filter di atas, tabel penuh di bawah, satu aksen merah hanya pada tombol utama |
| R-38 konten jujur | **PASS** | Keadaan kosong menyebut sebabnya; rentang tanggal tidak sah dijelaskan, bukan diabaikan; batas baris ekspor diberitahukan |
| R-39 semantik & affordance | **PASS** | Ekspor berupa `<a download>`, cetak berupa `<a target="_blank">`, filter berupa `<select>`/`<input type="date">`; tidak ada `<div onClick>` |
| R-40 performa | **PASS** | Ekspor satu kueri (bukan per halaman), ringkasan dihitung sekali, `overflow-x-auto` hanya pada tabel |

### Block 2: Purpose-Gate

| Rule | Status | Alasan tertulis |
|---|---|---|
| R-01/R-29 warna | **PASS** | Warna diambil dari token yang ada; `text-error` hanya untuk keterlambatan, `bg-warning-surface` hanya untuk peringatan yang bisa ditindaklanjuti |
| R-04 ikon | **PASS** | Hanya `unduh` dan `lihat` dari set yang sudah ada; ikon selalu berpasangan dengan teks |
| R-06 tipografi | **PASS** | Memakai skala `text-h1/h2/body/body-sm/label` yang ada; angka memakai `tabular-nums` |
| R-08 panah | **PASS** | Tidak ada |
| R-09 badge | **PASS** | Status ditampilkan sebagai teks, bukan chip berwarna, agar terbaca saat dicetak hitam-putih |
| R-14 kartu seragam | **PASS** | Hanya dua kartu (filter dan tabel); keduanya punya fungsi berbeda, bukan pengulangan |
| R-19 animasi | **PASS** | Hanya `transition-colors` pada tombol |
| R-31 alasan tertulis | **PASS** | Enam cacat dijelaskan dengan potongan kode dan keluaran tes sebenarnya |

### Block 3: Liveliness

| Item | Status |
|---|---|
| Dial eksplisit | **PASS**: ENERGY 1 / RHYTHM 2 / MOTION 1, sama seperti halaman lain |
| Satu titik fokus | **PASS**: tombol "Ekspor CSV" satu-satunya elemen berwarna penuh |
| Kontras hierarkis | **PASS**: judul h1, subjudul body-3, kepala tabel label, data body-sm |
| Whitespace sebagai struktur | **PASS**: gap 16px antar section, padding 16px dalam kartu |
| Satu aksen | **PASS**: merah hanya pada tombol utama dan halaman aktif paginasi |

### Block 4: Craftsmanship & Quality Locks

| Item | Status |
|---|---|
| C-1 intensionalitas | **PASS**: setiap bagian yang dibuang punya alasan tertulis; tidak ada yang dihapus karena "kelihatan tidak dipakai" |
| C-2 kelengkapan fungsional | **PASS**: filter, tabel, paginasi, tiga ekspor, cetak, keadaan kosong, keadaan memuat, keadaan ditolak semuanya ada |
| C-3 komposisi dari konten | **PASS**: kolom berasal dari bidang yang benar-benar ada di skema; tidak ada kolom karangan |
| C-4 ketahanan | **PASS**: `ReportTable` dipakai dua halaman; `report-row-format.ts` dipakai empat saluran; lebar kolom dijaga tes terhadap ukuran kertas |
| C-5 bukti di atas klaim | **PASS**: 7 kendali negatif, validasi `openpyxl` dengan peringatan sebagai galat, dan satu cacat yang saya temukan sendiri (Cetak 25 baris) dilaporkan terbuka |

---

## Batas yang perlu diketahui

1. **`openpyxl` bukan Excel.** Ia membaca format yang sama dan cukup untuk
   membuktikan struktur berkas sah, tetapi tidak menggantikan uji buka di Excel
   sungguhan. Uji itu perlu dilakukan sekali secara manual sebelum diserahkan ke
   instansi.
2. **Halaman cetak memakai batas 20.000 baris**, sama dengan ekspor. Di atas itu,
   pengguna diberi tahu secara tertulis dan diarahkan ke ekspor Excel.
3. **Cetak tetap bergantung pada dialog cetak peramban.** Tidak ada PDF yang
   dibuat di server, sesuai keputusan awal: peramban sudah menghasilkan PDF asli
   lewat "Simpan sebagai PDF", dan membuatnya di Worker berarti menambah
   dependensi besar tanpa manfaat.
4. **Tautan judul tugas di halaman cetak sengaja dimatikan.** Di kertas, tautan
   tidak berguna dan hanya menambah garis bawah.
5. **Definisi "tepat waktu" masih `completedAt <= dueAt`.** Sifatnya terbuka dan
   sekarang terlihat per baris di kolom Ketepatan Waktu, sehingga mudah
   diputuskan setelah instansi melihat hasilnya.
