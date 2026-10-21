# Spesifikasi Wireframe (berkas SVG)

Aturan teknis untuk 17 wireframe + lembar state. Semua berkas SVG di folder ini wajib mengikuti halaman ini. Contoh acuan: `L01-login.svg` dan `L06-tugas-saya.svg`.

## 1. Sifat berkas

- SVG statis, satu berkas per layar, tanpa `<script>`, tanpa animasi, tanpa font eksternal (pakai tumpukan font sistem).
- Kanvas desktop `1280 x 800`, `viewBox="0 0 1280 800"`. Lembar khusus memakai ukuran sendiri yang tertulis di spesifikasi layarnya.
- Setiap berkas wajib: `xmlns`, `role="img"`, dan satu `<title>` berisi nama layar.
- Wireframe ini **tidak dapat dijalankan** sebagai aplikasi. Interaksi diverifikasi lewat pemeriksaan berkas dan tabel alur pada `WIREFRAME-UIUX.md`, bukan klaim "sudah diklik" (antislop R-35).

## 2. Warna (khusus wireframe)

Wireframe memakai warna sistem desain yang sudah ada, tanpa menambah warna baru (antislop R-29). Tidak ada gradien, glow, atau bayangan bertumpuk (R-01, R-12, R-13).

| Peran | Nilai | Dipakai untuk |
|---|---|---|
| Kanvas | `#FFFFFF` | latar halaman (`surface`) |
| Latar aplikasi | `#FCFCFC` | area di belakang kartu (`background`) |
| Isian redup | `#F3F4F6` | kolom tabel, sel kosong, ikon netral |
| Bidang ceruk | `#F9FAFB` | kepala tabel, baris terpilih |
| Garis hairline | `#E5E7EB` | pemisah dekoratif |
| Garis kontrol | `#D1D5DB` | batas kolom input, tombol garis, garis tabel |
| Tinta 1 | `#111827` | judul, angka KPI |
| Tinta 2 | `#374151` | teks isi |
| Tinta 3 | `#6B7280` | meta; **hanya di atas `#FFFFFF`** (4.83:1). Di atas `#F3F4F6`/`#F9FAFB` pakai Tinta 2 |
| Sidebar | `#191B27` | bidang navigasi |
| Teks sidebar | `#FFFFFF` / `#9CA3AF` | item aktif / item biasa |
| Aksen | `#B7091E` | hanya tombol utama, pill menu aktif, penanda kritis |
| Status | `#0E7490`/`#CFFAFE`, `#1D4ED8`/`#DBEAFE`, `#B45309`/`#FEF3C7`, `#15803D`/`#DCFCE7`, `#4B5563`/`#F3F4F6` | 5 status kanonik (teks/latar pill) |
| Flag | `#B91C1C`/`#FFFFFF` (Terlambat), `#B91C1C`/`#FEE2E2` (Perlu Revisi) | penanda turunan |

Setiap nilai di atas sudah terhitung di `DESIGN-SYSTEM.md` §2.1. Jangan memakai warna di luar daftar ini.

## 3. Tipografi

| Peran | Ukuran / bobot |
|---|---|
| Judul layar (h1) | 20 / 600 |
| Judul bagian (h2) | 15 / 600 |
| Teks isi | 13 / 400 |
| Meta, label, isi tabel rapat | 12 / 400 (label 12 / 500) |
| Angka KPI | 28 / 600, `font-variant-numeric: tabular-nums` |
| Nomor tugas, kode aksi | 12 / 400, mono |

Tumpukan font: `Inter, system-ui, sans-serif` dan `JetBrains Mono, ui-monospace, monospace`. Tidak ada teks di bawah 12px.

## 4. Rangka aplikasi (kecuali L01)

- Sidebar tetap **220px**, latar `#191B27`. Item tinggi 36px, ikon 16px bergaris + label 13px. Glifnya memakai nama dan makna set resmi `DESIGN-SYSTEM.md` §7.1 (`src/app/icons.tsx`), tetapi digambar ulang pada grid 16 dengan garis 1.5 sebagai sketsa low-fi; path final aplikasi memakai Fluent 20-grid terisi, jadi bentuk wireframe bukan path yang disalin. Item aktif: pill `#B7091E` dengan teks putih. Item yang belum ada layarnya diberi teks `(menyusul)` dan digambar redup, tidak pernah jadi tautan mati (antislop R-24).
- Top bar tinggi **56px**, garis bawah `#E5E7EB`: judul halaman di kiri, di kanan lencana notifikasi (angka, `9+` bila lebih dari 9) dan avatar inisial dua huruf + chip peran.
- Area isi: padding **24px**, grid 12 kolom, jarak antar kartu **16px**. Lebar maksimum isi 1440px (pada kanvas 1280px berarti penuh).
- Kartu: radius 10px, garis `#E5E7EB`, latar `#FFFFFF`. Tombol dan input radius 8px. Chip dan pill status radius 6px.

## 5. Isi wajib tiap berkas

1. **Kepala berkas** (y = 20): kiri `WIREFRAME <KODE>: <NAMA LAYAR>`, kanan `data contoh (seed), bukan data nyata`. Keduanya 12px, Tinta 3, **di atas kanvas putih**. Kepala ini digambar di luar rangka aplikasi.
2. **Rangka aplikasi** (untuk L02 sampai L17), atau kartu terpusat (L01).
3. **Titik fokus** layar terlihat jelas: satu elemen yang paling menonjol (tombol utama, baris perlu tindakan, atau angka KPI utama).
4. **Satuan pada angka**: `Penugasan: 401`, `Dokumen final: 286`, `Tenggat: 3 hari lagi`.
5. **Peran ditandai**: chip peran di top bar (`Staf`, `Admin Divisi`, `Super Admin`).

## 6. Larangan

- Tanda pisah panjang (em dash) di semua teks (antislop R-02).
- Emoji, ikon hias, ikon bintang/kilau, ilustrasi stok (R-04, R-22).
- Glif ikon di luar set resmi `DESIGN-SYSTEM.md` §7.1, termasuk menggambar bentuk sendiri di berkas wireframe.
- Angka atau nama yang tidak berasal dari seed contoh atau dari `RANCANGAN-SISTEM-v2.md` §7.2 (R-17, R-38).
- Foto orang; avatar wajib inisial dua huruf (R-23).
- Tombol atau tautan tanpa tujuan nyata; setiap tautan harus menunjuk ke layar lain di daftar 17 (R-24, R-26).
- Status sebagai pilihan filter status untuk `Perlu Revisi`, `Tenggat Dekat`, `Terlambat`, `Terarsip` (`DESIGN-SYSTEM.md` §9 aturan 5).

## 7. Kerangka berkas

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" role="img" font-family="Inter, system-ui, sans-serif">
  <title>L06 Tugas Saya, wireframe</title>
  <rect width="1280" height="800" fill="#FFFFFF"/>
  <rect width="1280" height="40" fill="#FFFFFF"/>
  <text x="24" y="26" font-size="12" fill="#6B7280">WIREFRAME L06: Tugas Saya</text>
  <text x="1256" y="26" font-size="12" fill="#6B7280" text-anchor="end">data contoh (seed), bukan data nyata</text>
  <!-- rangka aplikasi -->
  <rect x="0" y="40" width="220" height="760" fill="#191B27"/>
  ...
</svg>
```

## 8. Pola bersama (wajib dipakai ulang, bukan digambar ulang)

Semua koordinat di bawah sudah memperhitungkan kanvas 1280 x 800. Pakai apa adanya supaya berkas-berkas ini konsisten satu sama lain.

**Rangka.** Kepala berkas: `y` 0 sampai 40. Sidebar: `x=0 y=40 width=220 height=760` latar `#191B27`. Top bar: `y=40` sampai `96`, garis bawah `#E5E7EB` di `y=96`. Area isi: `x` mulai 244, lebar 1012, sampai `x=1256`.

**Sidebar.** Wordmark `[LOGO]` di `x=20 y=76` (12px, `#9CA3AF`). Item mulai `y=104`, tinggi 36, jarak 4: `x=12 width=196 rx=8`. Item aktif: latar `#B7091E`, teks `#FFFFFF` 13px/500. Item biasa: tanpa latar, teks `#9CA3AF` 13px. Ikon 16px di `x=28`; label di `x=52`, baseline `y = item_y + 23`. Item `(menyusul)`: teks `#6B7280`.

Bentuk ikon selalu sama, satu grup berisi satu path: `<g transform="translate(28,Y)" fill="none" stroke="WARNA_ITEM" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="PATH_DARI_SET_RESMI"/></g>` dengan `Y` posisi item. Label item menentukan glifnya: Dashboard `dashboard`; Tugas Saya, Tugas Divisi, Semua Tugas `tugas`; Antrean Review `antrean`; Katalog Dokumen `dokumen`; Laporan `laporan`; Log Aktivitas `log`; Kelola Master `pengguna`; Notifikasi `notifikasi`; Pengaturan `pengaturan`; Akun Saya `akun`. Lonceng top bar memakai `notifikasi` di `x=1158 y=52`.

**Top bar.** Judul halaman 20px/600 `#111827` di `x=244 y=78`. Lencana notifikasi: ikon lonceng `x=1160`; angka `9+` bila lebih dari 9. Avatar: lingkaran `r=16` di `cx=1236 cy=68`, latar `#F3F4F6`, garis `#D1D5DB`, inisial dua huruf 12px/600 `#374151`; chip peran 12px `#6B7280` di `x=1210` (rata kanan).

**Judul bagian isi.** Subjudul halaman 12px `#6B7280` di `y=124`. Baris filter: `rect x=244 y=144 width=1012 height=44 rx=8` latar `#F9FAFB` garis `#D1D5DB`; chip filter di dalamnya tinggi 28, `rx=6`, latar `#FFFFFF`, teks 12px `#374151`; chip aktif latar `#F3F4F6` garis `#D1D5DB`.

**Kartu.** `rx=10`, latar `#FFFFFF`, garis `#E5E7EB`. Kepala kartu: judul 15px/600 `#111827` di `x = kartu_x + 16`, baseline `y = kartu_y + 28`; aksi kanan (tautan 12px `#1D4ED8`) rata kanan di `x = kartu_x + kartu_lebar - 16`. Garis pemisah kepala di `y = kartu_y + 44`.

**Pita KPI.** Kartu 6 buah: lebar 155, tinggi 84, jarak 16, mulai `x=244 y=144`. Kartu 4 buah: lebar 241. Kartu 3 buah: lebar 326. Isi: label 12px `#6B7280` di `+16/+24`, angka 28px/600 `#111827` tabular di `+16/+58`, satuan 12px `#6B7280` di sebelah kanan angka (rata kanan `x = kartu_x + kartu_lebar - 16`, baseline sama).

**Tabel.** Kartu tabel: `x=244 y=208 width=1012 height=420`. Baris kepala `y` 208 sampai 244 latar `#F9FAFB`, garis bawah `#D1D5DB` di `y=244`; label kolom 12px/500 `#374151` baseline `y=230`. Baris tinggi 56, mulai `y=244`; garis pemisah `#E5E7EB` di dasar tiap baris. Baseline dalam satu baris: judul 13px `#111827` di `+23`; nomor tugas mono 12px `#6B7280` di `+41`; kolom teks lain 12px `#374151` di `+23` dan `+41`; pill status `y = +17 height = 22 rx = 6`; tombol baris `y = +12 height = 32 rx = 8`.

Posisi kolom baku untuk tabel daftar tugas: judul `x=260` (sampai 630), tenggat `x=640`, prioritas `x=860`, status `x=920`, aksi rata kanan `x=1240`. Paginasi di dalam kartu, baseline `y = kartu_y + kartu_tinggi - 22`: kiri "Menampilkan 1 sampai 6 dari 16 penugasan" 12px `#6B7280`; kanan tombol halaman 28x28 `rx=6` (halaman aktif latar `#F3F4F6`, garis `#D1D5DB`).

**Pill status.** Tinggi 22, `rx=6`, padding 8 kiri, teks 12px/500. Wajib ikon 12px + teks; tidak pernah warna saja. Glif ikon mengikuti teks pill, diambil dari set resmi `DESIGN-SYSTEM.md` §7.1: `Belum Dikerjakan` `belum`; `Sedang Dikerjakan` `sedang`; `Menunggu Verifikasi` `menunggu`; `Selesai` `selesai`; `Dibatalkan` `dibatalkan`; `Terlambat` `terlambat`; `Perlu Revisi` `revisi`; `Terarsip` `terarsip`; `Aktif` `centang`; `Nonaktif` `tutup`. Sisipan ikon: `<g transform="translate(X+8,Y+5) scale(0.75)" fill="none" stroke="WARNA_TEKS_PILL" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`, lebar pill bertambah 12, dan `x` label bergeser dari `X+12` menjadi `X+24`. Pasangan warna dari `SPEC-SVG.md` §2. Satu baris memuat maksimal satu pill status + satu pill flag: bila hanya ada status, pill digambar di tengah sel (`y = baris + 17`); bila ada flag, keduanya **ditumpuk** di dalam kolom status (status di `y = baris + 9`, flag di `y = baris + 33`), karena kolom status hanya selebar 165px dan tombol aksi mulai di `x=1096`. Bila tinggi baris tidak cukup untuk menumpuk (baris 56px tanpa baris catatan), flag digambar **di sebelah kanan** status dengan jarak 4px dan tepi kanannya tidak boleh melewati `x=1096`.

**Warna tenggat pada kolom Tenggat.** `Terlambat n hari` memakai `error #B91C1C`; `Hari ini HH:MM WIB` dan `Sisa n hari` yang mendekat memakai `warning #B45309` (flag Tenggat Dekat); `Sisa n hari` biasa memakai `#6B7280`.

**Tombol.** Utama: `height=36 rx=8` latar `#B7091E`, teks 13px/600 `#FFFFFF`, padding 16. Garis: latar `#FFFFFF` garis `#D1D5DB`, teks `#374151`. Danger: latar `#B91C1C`, teks `#FFFFFF`. Ukuran baris tabel dipakai versi kecil: `height=32`, teks 12px/600. Tombol utama maksimal **satu** per layar.

**Keadaan.** Skeleton: `rect` latar `#F3F4F6` tinggi 12 `rx=4`. Keadaan kosong dan galat: card di tengah area isi (`x=430 width=420`, `y=300 height=200`), judul 15px/600, penjelasan 13px `#374151`, satu tombol aksi.
