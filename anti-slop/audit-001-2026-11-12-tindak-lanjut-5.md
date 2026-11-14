# Audit 001 Tindak Lanjut Bagian 5 (temuan #13 + aturan cetak A4)

Tanggal: 12 November 2026
Nomor yang dikerjakan: **13** (dan aturan cetak A4 dari DESIGN-SYSTEM.md bagian 8)
Sudah selesai sebelumnya: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14
Sisa temuan dari audit awal: **tidak ada**

---

## Ringkasan

Temuan #13 berbunyi: pratinjau cetak laporan memuat kop instansi dan nama pejabat sebagai
placeholder, dan tidak ada jalur untuk mengisinya. Saat ditelusuri, ada **empat** cacat, bukan
satu:

| Cacat | Dampak | Status |
|---|---|---|
| Kop instansi dan nama/NIP pejabat adalah teks placeholder, tanpa jalur pengisian | Laporan resmi tidak bisa dipertanggungjawabkan | Diperbaiki (localStorage) |
| Tombol ekspor berupa `<a href>`, jadi tidak ada titik henti untuk memeriksa apa pun | Ekspor berjalan tanpa syarat | Diperbaiki |
| Blok pratinjau A4 diberi `print:hidden`, sehingga kop **tidak ikut tercetak sama sekali** | Fitur cetak hanya mencetak tabel | Diperbaiki (baru ditemukan) |
| Tidak ada `@page` A4, `page-break-inside`, maupun penyembunyian sidebar saat cetak | Ukuran/margin mengikuti peramban; tanda tangan bisa terbelah | Diperbaiki (baru ditemukan) |

Cacat ketiga adalah temuan paling penting, dan tidak ada di laporan audit awal. Detailnya di
bagian "Cacat 3" di bawah.

---

## Keputusan pemilik produk

Kop disimpan di **localStorage peramban**, dan **setiap ekspor wajib mengisi kop lebih dulu
bila belum ada**. Konsekuensi pilihan ini dinyatakan terbuka di antarmuka, bukan disimpulkan
sendiri oleh pengguna:

> Data ini disimpan di peramban ini saja, tidak ikut ke akun atau perangkat lain. Bila
> berpindah peramban atau membersihkan data situs, isi ulang kop laporan.

Konsekuensi yang perlu diketahui:

- Kop terikat pada **peramban dan profil peramban**, bukan pada akun. Berganti peramban atau
  membersihkan data situs berarti mengisi ulang.
- Nilainya **tidak tersinkron antar perangkat**. Dua admin yang mencetak dari perangkat
  berbeda bisa memakai kop berbeda sampai keduanya mengisi.
- Nilainya bisa dibaca dan diubah siapa pun yang memegang peramban itu. Karena isinya hanya
  identitas instansi yang tampil pada dokumen publik, risikonya dapat diterima. **Jangan
  menambahkan data sensitif ke kop ini tanpa memindahkannya ke database.**

Bila kelak kop perlu disinkronkan antar perangkat, jalurnya adalah kolom di `appSettings` dan
`divisions` plus migrasi. Pustaka `src/lib/report-letterhead.ts` sengaja dibuat sebagai satu
titik akses, sehingga penggantian penyimpanan tidak menyentuh komponen.

---

## Cacat 1: kop placeholder tanpa jalur pengisian (inti #13)

**Kondisi lama:**

```tsx
<span className="font-mono text-[10px] text-ink-3 block">
  [KOP INSTANSI PENYELENGGARA PEMILU]
</span>
...
<span className="text-ink-3 font-mono">Nama &amp; NIP Pejabat</span>
```

Tidak ada tabel, kolom, atau formulir yang dapat mengisi kedua teks itu. Laporan yang dicetak
selalu memuat kurung siku dan tulisan "Nama & NIP Pejabat" apa adanya.

**Perbaikan.** Tiga bagian:

1. **`src/lib/report-letterhead.ts`** sebagai satu-satunya pintu akses penyimpanan.
   - `normalizeLetterhead` meruntuhkan spasi berlebih (kop dicetak satu baris, spasi ganda
     atau baris baru akan membuatnya turun baris tanpa alasan), dan memotong panjang.
   - `isLetterheadComplete` menuntut **ketiga** bagian terisi. Kop setengah jadi tidak
     dianggap lengkap: tanda tangan tanpa nama lebih buruk daripada laporan yang menolak
     dicetak.
   - `readLetterhead` memperlakukan JSON rusak, nilai bukan objek, dan localStorage yang
     diblokir sebagai "belum ada". Mode privat dan kebijakan situs membuat akses melempar
     galat, dan itu tidak boleh mematikan halaman laporan.
   - `saveLetterhead` mengembalikan nilai meski penyimpanan gagal (kuota penuh), supaya
     ekspor yang sedang berjalan tetap bisa dilanjutkan.

2. **`src/app/(app)/reports/letterhead-dialog.tsx`** sebagai dialog pengisian dengan focus
   trap, Escape, dan pengembalian fokus. Ketiga bidang ditandai `aria-required`, kesalahan
   muncul lewat `role="alert"` setelah pengguna mencoba menyimpan (bukan sebelumnya), dan teks
   konsekuensi localStorage dinyatakan di dalam dialog.

3. **`src/app/(app)/reports/reports-client.tsx`**: kop dibaca setelah komponen terpasang
   (`useEffect`), bukan saat render. Alasannya: nilai awal state tidak boleh berbeda antara
   HTML server dan peramban, karena perbedaan itu memicu hydration mismatch.

---

## Cacat 2: ekspor tidak punya titik henti

**Kondisi lama:**

```tsx
<a href={buildReportsUrl(current, true)} ...>Ekspor CSV</a>
```

Tautan langsung diikuti peramban, sehingga tidak ada kesempatan memeriksa apa pun. Aturan
"wajib isi kop dulu" tidak mungkin dipasang pada `<a href>` tanpa mengubahnya menjadi tombol.

**Perbaikan.** Kontrol diubah menjadi `<button>` dan keputusannya dipindahkan ke fungsi murni
`planReportAction` di `src/app/(app)/reports/report-actions.ts`:

```ts
export function planReportAction(input): ReportActionPlan {
  // "navigate" | "print" | "need-letterhead"
}
```

Komponen hanya menjalankan rencana. Pemisahan ini disengaja: aturan "ekspor ditahan sampai kop
diisi" adalah **aturan**, bukan tampilan. Menaruhnya di dalam komponen membuatnya hanya bisa
diperiksa dengan menekan tombol di peramban, sehingga tidak ada tes yang mengunci perilakunya.

Rencana juga menyimpan **divisi yang diminta**. Tanpa itu, pengguna yang menekan "Ekspor CSV
divisi ini" pada baris Hukum lalu mengisi kop akan mendapat ekspor seluruh divisi, karena
aksinya dijalankan ulang dari filter halaman.

---

## Cacat 3: blok cetak A4 disembunyikan saat mencetak (baru ditemukan)

Ini yang paling serius dan tidak ada di laporan audit awal.

**Kondisi lama:**

```tsx
{/* Kolom Kanan: Pratinjau Lembar Cetak A4 */}
<div className="card ... print:hidden">
  ... kop, tabel mini, kolom tanda tangan ...
</div>
```

Seluruh kartu "Tampilan Cetak A4" diberi `print:hidden`. Artinya saat pengguna menekan
**Cetak / PDF**, kop instansi dan kolom tanda tangan **tidak ikut tercetak sama sekali**. Yang
tercetak hanya tabel pratinjau di kolom kiri. Fitur cetak pada dasarnya belum pernah
menghasilkan laporan.

**Perbaikan.** Kepala laporan dan blok tanda tangan dipindahkan keluar dari kartu yang
disembunyikan, ke elemen tersendiri yang hanya tampil saat cetak:

```tsx
<div className="hidden print:block print:col-span-12">   {/* kepala laporan */}
<div className="hidden print:block print-avoid-break">   {/* tanda tangan */}
```

Kepala laporan memuat yang diwajibkan bagian 8: kop instansi, judul, periode, daftar filter
aktif, dan waktu cetak WIB. Waktu cetak diisi setelah komponen terpasang, sehingga HTML server
dan peramban tidak berbeda.

---

## Cacat 4: aturan cetak A4 tidak ada sama sekali

**Bukti sebelum perbaikan** (CSS hasil build):

```
@media print            -> ADA
@page                   -> TIDAK ADA
page-break-inside       -> TIDAK ADA
```

**Perbaikan** di `src/app/globals.css`, seluruhnya di dalam `@media print`:

```css
@media print {
  @page { size: A4 portrait; margin: 15mm; }

  .print-avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;   /* untuk mesin cetak yang lebih tua */
  }

  .print-table th,
  .print-table td {
    border: 0.5pt solid #000;
    background: transparent !important;
  }
}
```

`@page` sengaja diletakkan di dalam `@media print`, bukan di tingkat atas. Di luar blok itu,
ia akan mengubah pengaturan cetak **seluruh aplikasi**, termasuk halaman yang bukan laporan.

Selain itu, sidebar dan top bar kini `print:hidden`, dan `<main>` melepas padding serta batas
lebar saat dicetak. Sebelumnya keduanya ikut tercetak dan memakan ruang kertas A4.

---

## Cacat tambahan yang ikut diperbaiki

### Placeholder kop palsu pada jalur Ctrl+P

Tombol Cetak sudah ditahan gerbang kop, tetapi **Ctrl+P melewatinya**. Blok cetak tidak boleh
memuat nama instansi karangan pada keadaan itu:

```diff
- {letterhead?.institution ?? "KOP INSTANSI PENYELENGGARA PEMILU"}
+ {isLetterheadComplete(letterhead)
+   ? letterhead.institution
+   : "KOP INSTANSI BELUM DIISI. Lengkapi kop laporan sebelum dokumen ini dipakai ..."}
```

Hal yang sama berlaku untuk nama pejabat. Garis tanda tangan tetap ada supaya ruangnya jelas,
tetapi namanya tidak dikarang.

### Dialog selalu berbunyi "belum diisi"

Ditemukan oleh tes yang saya tulis sendiri: judul dan tombol dialog memakai teks tetap,
sehingga mode "Ubah kop" tetap menampilkan "Kop laporan belum diisi" dan "Simpan & lanjutkan
ekspor". Sekarang teksnya mengikuti `reason`.

Alasan dialog juga tidak lagi bergantung pada `pendingAction`, melainkan pada keadaan kop.
Kop kosong selalu berarti "wajib diisi", termasuk bila pengguna membuka dialog sendiri lewat
tombol "Isi kop".

### Tipografi di bawah 12px

`text-[10px]` dan `text-[11px]` masih dipakai di blok cetak dan kartu ringkasan, melanggar
batas minimum 12px (bagian 2.2). Semuanya dipetakan ke `text-body-sm` (12px).

### Angka tidak memakai `tabular-nums`

Kolom jumlah pada tabel cetak dan pratinjau kini `tabular-nums`, sesuai bagian 8.

### Warna latar status ikut tercetak

Chip status di detail baris memakai latar berwarna. Pada kertas hitam-putih latar itu menjadi
abu-abu yang menyamarkan teks, sedangkan bagian 8 meminta status ditulis sebagai teks. Kini
`print:bg-transparent print:text-ink`.

### Karakter tombol tutup dialog rusak

Karakter kali pada tombol tutup tersimpan rusak akibat encoding berkas, dan karakter rusaknya
kebetulan mengandung em dash sehingga melanggar R-02. Diganti entity `&times;` yang aman
terhadap encoding berkas.

---

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx vitest run` (TZ `Asia/Jakarta`) | **45 file, 305 tes, semua lulus** |
| `npx vitest run` (TZ `UTC`) | 45 file, 305 tes, lulus |
| `npx vitest run` (TZ `America/New_York`) | 45 file, 305 tes, lulus |
| `npx tsc --noEmit` | bersih |
| `npx next build` | sukses, `BUILD_ID` `ZCwMb5aEkcqRPI-ZtixT_` |
| `python build/build-tokens.py --check` | selaras |
| `@page` / `size:A4 portrait` / `margin:15mm` di CSS build | ada |
| `break-inside:avoid` / `page-break-inside:avoid` di CSS build | ada |
| `print:hidden`, `print:block`, `print:col-span-12`, `print:pl-0`, `print:bg-transparent` | ada semua |
| Em dash di berkas yang diubah | 0 |

### Kendali negatif: tes benar-benar menangkap perilaku lama

| Perbaikan | Assertion dijalankan pada perilaku lama | Hasil |
|---|---|---|
| Gerbang kop menahan ekspor | `plan.type === "need-letterhead"` saat kop kosong | **GAGAL** (lama menghasilkan `navigate` + URL ekspor) |
| Gerbang kop menahan cetak | idem untuk aksi cetak | **GAGAL** (lama langsung mencetak) |

### Tes baru

| Berkas | Tes | Yang dikunci |
|---|---|---|
| `src/lib/report-letterhead.test.ts` | 16 | normalisasi spasi dan panjang, validasi tiga bidang, JSON rusak, nilai bukan objek, localStorage diblokir, tanpa `window`, hapus kop |
| `src/app/(app)/reports/letterhead-dialog.test.tsx` | 9 | semantik dialog, tiga bidang wajib dan berlabel, teks konsekuensi localStorage, mode ubah, nilai awal, tidak menuduh sebelum disimpan |
| `src/app/(app)/reports/report-actions.test.ts` | 11 | ekspor dan cetak ditahan saat kop kosong atau tidak lengkap, divisi yang diminta diingat, URL ekspor memuat seluruh filter, divisi baris menang atas filter |
| `src/app/print-rules.test.ts` | 4 | A4 potret margin 15mm, `break-inside` dan `page-break-inside`, border tabel 0.5pt hitam tanpa latar, `@page` hanya di dalam `@media print` |
| `src/app/(app)/reports/reports.test.tsx` | +3 | tidak ada kop palsu saat kop kosong, ekspor di balik tombol bukan tautan, jalan "Isi kop" tersedia, jalur Ctrl+P jujur |

### Kontras pasangan yang dipakai

| Pasangan | Rasio | Status |
|---|---|---|
| `on-dark` `#FFFFFF` di `primary` `#B7091E` | 6.84:1 | PASS |
| `ink-3` `#6B7280` di `surface` `#FFFFFF` | 5.84:1 | PASS |
| `error` `#B91C1C` di `surface` `#FFFFFF` | 6.47:1 | PASS |

---

## Delivery Gate

### Block 1: Hard Gate

| Rule | Status | Bukti |
|---|---|---|
| R-02 em dash | **PASS** | 0 di 11 berkas yang diubah; satu karakter rusak ditemukan dan diganti `&times;` |
| R-03 mobile | **PASS** | Dialog `max-w-[520px]` dengan `p-4` dan `max-h-[90vh] overflow-y-auto`; tombol aksi `flex-wrap` |
| R-17 angka tanpa sumber | **PASS** | Waktu cetak berasal dari jam sebenarnya, bukan teks tetap |
| R-18 testimoni | **PASS** | Tidak ada |
| R-23 aset | **PASS** | Tidak ada aset baru |
| R-24 navigasi mati | **PASS** | Tidak ada tautan baru |
| R-25 kontras | **PASS** | Tiga pasangan diukur, terendah 5.84:1 |
| R-26 kontrol mati | **PASS** | Tombol ekspor, cetak, ekspor per divisi, isi kop, dan ubah kop semuanya menjalankan aksi nyata |
| R-27 state | **PASS** | Kesalahan bidang memakai `role="alert"`; peringatan rentang memakai `role="status"` |
| R-28 FAQ | **PASS** | Tidak ada |
| R-32 keyboard & fokus | **PASS** | Focus trap, Escape, fokus awal ke bidang pertama, fokus dikembalikan saat ditutup |
| R-33 patch via skrip | **PASS** | Tidak ada |
| R-34 tema | **PASS** | Tidak ada toggle tema |
| R-35 verifikasi | **PASS** | 305 tes di 3 zona waktu, `tsc` bersih, build sukses, kendali negatif dijalankan |
| R-36 klaim palsu | **PASS** | **Inti perbaikan.** Kop karangan dihapus; keadaan belum diisi dinyatakan sebagai belum diisi, termasuk pada jalur Ctrl+P |
| R-37 arah desain | **PASS** | Dial ENERGY 1 / RHYTHM 2 / MOTION 1 dipertahankan |
| R-38 konten jujur | **PASS** | Antarmuka menyatakan sendiri bahwa kop belum diisi dan bahwa data hanya tersimpan di peramban ini |
| R-39 semantik & affordance | **PASS** | Dialog `role="dialog"` + `aria-modal`, `aria-labelledby` + `aria-describedby`, tiga `aria-required`, label terhubung `for`/`id` |
| R-40 performa | **PASS** | Tanpa kueri tambahan; `planReportAction` hanya perhitungan objek |

### Block 2: Purpose-Gate

| Rule | Status | Alasan tertulis |
|---|---|---|
| R-01/R-29 warna | **PASS** | Memakai token `primary`, `ink-3`, `error`, `surface`; tidak ada warna baru |
| R-04 ikon | **PASS** | Hanya ikon `unduh` dan `lihat` yang sudah ada |
| R-06 tipografi | **PASS** | `text-[10px]` dan `text-[11px]` dihapus; minimum sekarang `text-body-sm` 12px |
| R-08 panah | **PASS** | Tidak ada |
| R-09 badge | **PASS** | Chip status tetap teks + warna, dan latarnya dilepas saat cetak |
| R-14 kartu seragam | **PASS** | Dialog memakai pola kartu yang sudah ada (`submit-modal`) |
| R-19 animasi | **PASS** | Tidak ada animasi ditambah |
| R-31 alasan tertulis | **PASS** | Empat cacat dijelaskan dengan bukti di dokumen ini |

### Block 3: Liveliness

| Item | Status |
|---|---|
| Dial eksplisit | **PASS**: ENERGY 1 / RHYTHM 2 / MOTION 1 |
| Satu titik fokus | **PASS**: dialog hanya muncul saat kop dibutuhkan atau diminta |
| Kontras hierarkis | **PASS**: kop `ink`, metadata `ink-3`, peringatan `error` |
| Whitespace sebagai struktur | **PASS**: kepala laporan dan tanda tangan dipisah garis, bukan kotak baru |
| Satu aksen | **PASS**: `primary` hanya pada tombol simpan dan aksi utama |

### Block 4: Craftsmanship & Quality Locks

| Item | Status |
|---|---|
| C-1 intensionalitas | **PASS**: empat cacat ditelusuri ke satu jalur cetak, bukan ditambal terpisah |
| C-2 kelengkapan fungsional | **PASS**: cetak kini benar-benar menghasilkan laporan berkop, bukan hanya tabel |
| C-3 komposisi dari konten | **PASS**: kepala laporan disusun dari filter yang benar-benar aktif |
| C-4 ketahanan | **PASS**: localStorage rusak, diblokir, kosong, dan tanpa `window` semuanya ditangani |
| C-5 bukti di atas klaim | **PASS**: kendali negatif dijalankan; klaim "blok cetak tidak pernah tercetak" dibuktikan lewat `print:hidden` di kode lama |

---

## Catatan

### Batas yang perlu diketahui

1. **Ctrl+P tidak bisa dicegah.** Gerbang kop hanya berlaku pada tombol di halaman. Pengguna
   yang menekan Ctrl+P tetap bisa mencetak, dan itu memang tidak bisa dihalangi peramban.
   Karena itu blok cetak menyatakan "KOP INSTANSI BELUM DIISI" alih-alih mengarang kop.
2. **Kop tidak tersinkron.** Dijelaskan di antarmuka dan di bagian keputusan di atas.
3. **Pratinjau menampilkan 3 baris, hasil cetak memuat semua baris.** Angka dan filternya
   identik; yang berbeda hanya panjang pratinjau. Ini disengaja: pratinjau adalah cuplikan,
   sedangkan hasil cetak adalah laporan utuh. Jumlah baris pada hasil cetak sama dengan jumlah
   baris data pada layar untuk filter yang sama.

### Temuan di luar lingkup yang belum dikerjakan

Tiga berkas mock lain juga tidak terpakai dan berisi data karangan. **Belum dihapus** karena
hanya #14 (`mock-reports.ts`) yang disetujui:

| Berkas | Baris | Isi karangan |
|---|---|---|
| `src/lib/mock-master.ts` | 205 | nama pengguna, tanggal login, jumlah anggota divisi |
| `src/lib/mock-settings.ts` | 87 | batas berkas, surel kontak divisi |
| `src/lib/mock-task-detail.ts` | 176 | tenggat, versi dokumen, ukuran berkas |

Rutenya kini sudah memakai data nyata, jadi ketiganya murni kode mati dengan risiko yang sama
seperti `mock-reports.ts`: bisa dipakai orang lain sebagai data nyata. Kandidat dihapus pada
tindak lanjut berikutnya.

Rute yang belum punya `loading.tsx`/`error.tsx`: `/account`, `/master`, `/notifications`,
`/settings`, `/tasks/new`, `/tasks/[id]`, `/tasks/[id]/edit`, `/login`. Catatan: `/login`
sebaiknya **tidak** diberi `error.tsx` rute.

### Satu pertanyaan yang masih terbuka

Definisi "tepat waktu" masih `completedAt <= dueAt`, sehingga tugas yang selesai tepat pada
detik tenggat dihitung tepat waktu. Belum diubah karena mengubahnya membuat ringkasan dan
detail berbeda angka.
