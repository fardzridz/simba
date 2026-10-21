---
name: Portal Manajemen Penugasan & Dokumen Divisi (Design System)
version: 1.4.0
date: 2026-10-19
status: acuan desain antarmuka
sumber-keputusan: RANCANGAN-SISTEM-v2.md versi 2.2 (§3 status kanonik, §7.1 definisi metrik, §8 pola modal)
basis: Swiss Grid System + Bento Grid
---

## 1. Overview

Sistem desain ini mengatur seluruh tampilan **Portal Manajemen Penugasan & Dokumen Divisi** untuk tiga peran (`USER`, `ADMIN` divisi, `SUPER_ADMIN`). Prioritasnya: kepadatan informasi yang terstruktur, kejelasan satuan metrik (`assignment` vs `task`), dan kepatuhan **WCAG 2.1 AA** yang bisa diuji.

Dokumen ini **bukan** tempat mendefinisikan ulang aturan bisnis. Status tugas, transisi, definisi metrik, dan pola modal tetap mengikuti `RANCANGAN-SISTEM-v2.md`. Bila terjadi pertentangan, dokumen rancangan yang menang, dan sistem desain ini yang diperbaiki.

---

## 2. Tokens

### 2.1 Warna

```yaml
colors:
  # Identitas
  primary: "#B7091E"          # CTA utama, penanda kritis, lencana section
  primary-hover: "#990718"
  primary-active: "#7F0614"

  # Permukaan
  background: "#FCFCFC"
  surface: "#FFFFFF"
  surface-sunken: "#F9FAFB"
  border: "#E5E7EB"           # hairline dekoratif
  border-strong: "#D1D5DB"    # batas kontrol yang perlu terlihat

  # Teks
  text-primary: "#111827"
  text-secondary: "#4B5563"
  text-muted: "#6B7280"

  # Sidebar gelap
  sidebar: "#191B27"
  sidebar-hover: "#252934"
  on-dark: "#FFFFFF"
  on-dark-muted: "#9CA3AF"

  # Semantik (di atas permukaan putih)
  success: "#15803D"
  success-surface: "#DCFCE7"
  warning: "#B45309"
  warning-surface: "#FEF3C7"
  error: "#B91C1C"
  error-surface: "#FEE2E2"
  info: "#1D4ED8"
  info-surface: "#DBEAFE"
  neutral-surface: "#F3F4F6"

  # Status kanonik (§3.1 rancangan), teks di atas pill
  status-belum-text: "#0E7490"
  status-belum-surface: "#CFFAFE"
  status-sedang-text: "#1D4ED8"
  status-sedang-surface: "#DBEAFE"
  status-menunggu-text: "#B45309"
  status-menunggu-surface: "#FEF3C7"
  status-selesai-text: "#15803D"
  status-selesai-surface: "#DCFCE7"
  status-dibatalkan-text: "#4B5563"
  status-dibatalkan-surface: "#F3F4F6"

  # Flag turunan (§3.3 rancangan), bukan status
  flag-terlambat-surface: "#B91C1C"
  flag-terlambat-text: "#FFFFFF"
  flag-revisi-surface: "#FEE2E2"
  flag-revisi-text: "#B91C1C"
  flag-terarsip-text: "#374151"
  flag-terarsip-border: "#D1D5DB"

  # Keadaan non-aktif
  disabled-surface: "#F3F4F6"
  disabled-text: "#6B7280"

  # Fokus
  focus-light: "#B7091E"
  focus-dark: "#FCA5A5"

  # Grafik
  chart-1: "#B7091E"
  chart-2: "#191B27"
  chart-3: "#0E7490"
  chart-4: "#B45309"
  chart-5: "#1D4ED8"
  chart-6: "#6B7280"
  chart-grid: "#E5E7EB"
  chart-axis-text: "#4B5563"
```

**Rasio kontras terverifikasi** (dihitung dengan rumus WCAG 2.1; ambang teks normal 4.5, elemen UI 3.0). Setiap penambahan warna wajib melengkapi tabel ini:

| Pasangan | Rasio | Ambang | Status |
|---|---|---|---|
| `text-muted` di `surface` | 4.83 | 4.5 | lulus |
| `text-secondary` di `surface` | 7.56 | 4.5 | lulus |
| `text-primary` di `background` | 17.29 | 4.5 | lulus |
| `on-dark` di `sidebar` | 17.11 | 4.5 | lulus |
| `on-dark-muted` di `sidebar` | 6.74 | 4.5 | lulus |
| `on-dark` di `sidebar-hover` | 14.53 | 4.5 | lulus |
| teks putih di `primary` | 6.84 | 4.5 | lulus |
| `primary` di `surface` (tautan) | 6.84 | 4.5 | lulus |
| teks putih di `primary-hover` | 8.76 | 4.5 | lulus |
| teks putih di `primary-active` | 10.83 | 4.5 | lulus |
| `success` di `surface` | 5.02 | 4.5 | lulus |
| `warning` di `surface` | 5.02 | 4.5 | lulus |
| `error` di `surface` | 6.47 | 4.5 | lulus |
| `info` di `surface` | 6.70 | 4.5 | lulus |
| `status-belum-text` di `status-belum-surface` | 4.79 | 4.5 | lulus |
| `status-sedang-text` di `status-sedang-surface` | 5.49 | 4.5 | lulus |
| `status-menunggu-text` di `status-menunggu-surface` | 4.51 | 4.5 | lulus |
| `status-selesai-text` di `status-selesai-surface` | 4.57 | 4.5 | lulus |
| `status-dibatalkan-text` di `status-dibatalkan-surface` | 6.87 | 4.5 | lulus |
| `flag-revisi-text` di `flag-revisi-surface` | 5.30 | 4.5 | lulus |
| `flag-terlambat-text` di `flag-terlambat-surface` | 6.47 | 4.5 | lulus |
| `flag-terarsip-text` di `surface` | 10.31 | 4.5 | lulus |
| `disabled-text` di `disabled-surface` | 4.39 | tidak berlaku | dikecualikan (teks pada kontrol nonaktif, WCAG 1.4.3); non-aktif tetap ditandai atribut `disabled` + kursor, bukan hanya warna |
| `focus-light` di `surface` | 6.84 | 3.0 | lulus |
| `focus-dark` di `sidebar` | 9.01 | 3.0 | lulus |
| `chart-1` di `surface` | 6.84 | 3.0 | lulus |
| `chart-2` di `surface` | 17.11 | 3.0 | lulus |
| `chart-3` di `surface` | 5.36 | 3.0 | lulus |
| `chart-4` di `surface` | 5.02 | 3.0 | lulus |
| `chart-5` di `surface` | 6.70 | 3.0 | lulus |
| `chart-6` di `surface` | 4.83 | 3.0 | lulus |
| `border` di `surface` | 1.24 | 3.0 | **dekoratif**: bukan penanda batas kontrol |
| `border-strong` di `surface` | 1.47 | 3.0 | **dekoratif**: bukan penanda batas kontrol |
| `flag-terarsip-border` di `surface` | 1.47 | 3.0 | **dekoratif** |

Catatan: `border`/`border-strong`/`flag-terarsip-border` dipakai sebagai garis pemisah, bukan satu-satunya penanda batas kontrol. Setiap kontrol wajib tetap punya label, latar, atau ikon sehingga tidak bergantung pada garis tipis (WCAG 1.4.11, lihat §9 aturan 6).

### 2.2 Tipografi

```yaml
typography:
  font-sans: "Inter, Plus Jakarta Sans, system-ui, sans-serif"
  font-mono: "JetBrains Mono, Geist Mono, ui-monospace, monospace"
  display-kpi: { size: 28px, weight: 600, lineHeight: 1.1, numeric: tabular }
  h1:  { size: 20px, weight: 600, lineHeight: 1.25, letterSpacing: -0.01em }
  h2:  { size: 15px, weight: 600, lineHeight: 1.3 }
  body: { size: 13px, weight: 400, lineHeight: 1.55 }
  body-sm: { size: 12px, weight: 400, lineHeight: 1.5 }
  label: { size: 12px, weight: 500, letterSpacing: 0.02em }
  mono: { size: 12px, weight: 400 }
```

Aturan:
- **Ukuran minimum 12px.** Tidak ada teks antarmuka di bawah 12px; label 11px dihapus.
- Angka KPI, persentase, durasi tunggu, dan hitungan pada tabel **wajib** `font-variant-numeric: tabular-nums` agar sejajar vertikal.
- Nomor tugas (`<KODE>/<YYYY>/<MM>/<NNN>`) dan kode aksi (`submission.created`) memakai `font-mono`.
- Panjang baris teks paragraf maksimal 80 karakter.

### 2.3 Spasi, radius, elevasi, lapisan

```yaml
spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48, "3xl": 64 }
rounded: { sm: 6px, md: 8px, lg: 10px, xl: 16px, full: 9999px }
elevation:
  card: "0 1px 2px rgba(0,0,0,0.05)"
  dialog: "0 20px 25px -5px rgba(0,0,0,0.15)"
  overlay: { color: "rgba(17,24,39,0.45)", blur: "4px" }
zIndex: { dropdown: 10, stickyHeader: 20, sidebar: 30, overlay: 40, dialog: 50, toast: 60, tooltip: 70 }
motion: { fast: "120ms ease-out", dialog: "160ms ease-out", reducedMotion: "hormati prefers-reduced-motion" }
breakpoints: { tablet: 768, desktop: 1024 }
page: { maxWidth: 1440 }
```

Micro-grid 4px untuk jarak internal (sel tabel, badge, progress bar); macro-grid 8px (gap kartu 16px, padding kontainer 24px).

---

## 3. Warna: aturan pemakaian

- **Primary `#B7091E`** hanya untuk: CTA utama (`+ Buat Tugas`, `Kumpulkan Tugas`, `Setujui`), aksi aktif pada navigasi, lencana ikon judul section, kurva utama grafik, dan penekanan status kritis. Tidak untuk dekorasi, tidak untuk seluruh teks judul.
- **Sidebar gelap `#191B27`** adalah bidang pemisah, bukan tempat menaruh teks merah. Menu aktif = pill terisi `primary` dengan teks `on-dark`.
- **Tonal elevation tipis**: `background` → `surface`, dibatasi hairline `border`. Satu tingkat saja; dilarang menumpuk tiga lapis bayangan.
- Status kritis (`Terlambat`, `Perlu Revisi`) memakai keluarga merah; status normal memakai cyan/amber/blue/green; warna tidak pernah berdiri sendiri (lihat §9).
- Grafik memakai `chart-1…chart-6` berurutan sesuai besar seri, **selalu** disertai label langsung pada seri atau legenda bernama divisi, dan tetap terbaca saat dicetak hitam-putih (uji dengan konversi grayscale).
- **Permukaan semantik** dipakai sebagai latar pesan dan chip turunan, bukan untuk teks: `success-surface`/`warning-surface`/`error-surface`/`info-surface` pada toast & banner, `neutral-surface` pada chip `Dibatalkan` dan kontrol nonaktif, `surface-sunken` untuk area tabel yang lebih redup dari kartu.
- **Grafik**: latar bidang dan garis bantu memakai `chart-grid`, label sumbu memakai `chart-axis-text` (kontras 7.56 di atas `surface`), nilai seri memakai `text-primary`.

---

## 4. Status & flag: aturan chip

Status kanonik hanya 5 (mengikuti §3.1 rancangan). `Revisi`, `Tenggat Dekat`, `Terlambat`, dan `Terarsip` adalah **flag turunan**, bukan status.

| Chip | Jenis | Gaya | Dipakai pada |
|---|---|---|---|
| Belum Dikerjakan | status | pill `status-belum-*` | kolom status, kartu, filter |
| Sedang Dikerjakan | status | pill `status-sedang-*` | idem |
| Menunggu Verifikasi | status | pill `status-menunggu-*` | idem |
| Selesai | status | pill `status-selesai-*` | idem |
| Dibatalkan | status | pill `status-dibatalkan-*` | idem |
| Perlu Revisi | flag | pill `flag-revisi-*` | baris tugas, panel tindakan |
| Terlambat | flag | pill terisi `flag-terlambat-*` (teks putih) | baris tugas, kartu ringkasan |
| Terarsip | flag | chip garis `flag-terarsip-*` | katalog dokumen |
| Tenggat Dekat | flag | pill `status-menunggu-*` + ikon jam | kartu ringkasan (bukan di tabel) |

Aturan tumpuk: **maksimal 1 status + 1 flag** per baris. Bila beberapa flag aktif, prioritasnya: Terlambat → Perlu Revisi → Terarsip, sisanya jadi penghitung (`+1`) dengan tooltip. Di ponsel, chip flag sembunyi dan dipindah ke baris kedua.

Setiap chip wajib **ikon + teks Bahasa Indonesia + warna** sekaligus. Istilah chip memakai Bahasa Indonesia; kode status (`MENUNGGU_VERIFIKASI`) hanya muncul di log, ekspor, dan dokumentasi teknis.

---

## 5. Tata letak & responsif

| | Ponsel (<768) | Tablet (768–1023) | Desktop (≥1024) |
|---|---|---|---|
| Navigasi | top bar + laci (drawer) | top bar + laci | sidebar tetap 220px, `sidebar` bg |
| Grid konten | 4 kolom, gap 12px | 8 kolom, gap 16px | 12 kolom, gap 16px, `max-width: 1440px` |
| Pola section | 1 kolom bertumpuk | `6+6`, `8+4` | `4+4+4`, `4+8`, `6+6`, `4+5+3` |
| Tabel tugas | 3 kolom prioritas: judul, tenggat, status + aksi; sisanya jadi baris kedua di dalam sel | 5 kolom, tanpa scroll | semua kolom |
| Filter | tombol "Filter" membuka panel bawah (sheet) | panel bawah | baris filter terbuka |
| Angka KPI | 2 kolom | 4 kolom | 4 kolom |
| Target sentuh | ≥44×44 px untuk semua kontrol | ≥44×44 px | ≥32×32 px boleh |
| Menggulir mendatar | dilarang, kecuali tabel laporan | dilarang | dilarang |

Pola baca **F-pattern**: setiap section diawali bar judul (lencana ikon + judul + aksi), lalu deretan KPI ringkas, baru pecahan grafik/tabel.

---

## 6. Bentuk & kedalaman

- Kartu: `rounded.lg` 10px, border hairline, elevasi `card`.
- Tombol & input: `rounded.md` 8px.
- Chip & filter: `rounded.sm` 6px (efisiensi ruang di tabel padat).
- Lencana ikon section & avatar: `rounded.full`.
- Dialog: `rounded.xl` 16px, overlay + blur, elevasi `dialog`, fokus terkunci di dalam dialog.
- Bidang data (grafik, progress): radius 4px pada batang; ujung membulat hanya untuk gauge.

---

## 7. Inventaris komponen

Kolom "state" wajib ada sebelum komponen dianggap selesai.

| Komponen | State wajib |
|---|---|
| Button | primary, secondary (garis), danger, ghost, disabled, loading (`aria-busy`) |
| Button danger | normal, hover gelap, disabled, memicu dialog konfirmasi |
| Input / textarea / select / date | normal, fokus (`focus-light` ring 2px + offset 2px), galat (border `error` + pesan), wajib, disabled |
| Kolom form | label, petunjuk, pesan galat, penanda wajib |
| Dropzone berkas | kosong, seret-di-atas, tipe ditolak (pesan spesifik) |
| Daftar berkas | mengunggah (progress per berkas + persen), berhasil, gagal + coba ulang, dibatalkan |
| Chip status & flag | sesuai §4, termasuk versi ringkas |
| Kartu KPI | normal, peringatan (`warning`), bahaya (`error`), dapat diklik → membawa filter, satuan tercantum |
| Kartu KPI (strip) | kelompok "Aktif" dan "Riwayat" terpisah |
| Tabel | header, urut asc/desc, baris hover, baris terpilih, paginasi (25/50/100), kosong, memuat, galat |
| Paginasi | halaman aktif, sebelumnya/berikutnya, jumlah per halaman |
| Baris filter | chip filter aktif + tombol hapus filter |
| Dialog | kecil (konfirmasi),besar (form), fokus terkunci, ESC, tombol tutup |
| Modal pengumpulan tugas | 6 state: `idle`, `validating`, `uploading`, `committing`, `done`, `rolled_back` (§8.1 rancangan) |
| Toast / banner inline | sukses, galat, info; durasi 5 detik, dapat ditutup |
| Lencana notifikasi | belum dibaca (tanpa angka jika >9 → "9+") |
| Empty state | ilustrasi ringan + penjelasan + satu aksi utama |
| Skeleton | baris tabel, kartu KPI, grafik |
| Tooltip | teks singkat, muncul di hover/fokus |
| Navigasi | sidebar desktop (item, item aktif, item terkunci "(menyusul)"), laci ponsel, top bar |
| Progress bar | per berkas unggah, progres divisi (dengan label nilai) |

### 7.1 Ikon

Satu set resmi, 31 glif, geometri tunggal di `src/app/icons.tsx`. Tidak ada impor set ikon pihak ketiga di komponen: glif disalin sekali dari Microsoft Fluent System Icons (Regular) ke satu berkas itu, sehingga bentuknya seragam tanpa menambah dependensi runtime.

Aturan geometri:

- Kanvas `viewBox="0 0 20 20"`, mengikuti grid Fluent Regular, bukan grid 16.
- Bentuk diisi `fill="currentColor"`, tanpa `stroke`, sehingga ikon mengikuti warna teks induknya dan tidak pernah menambah warna baru ke palet §2.1.
- Ukuran pakai: 16px pada navigasi, lonceng top bar, dan aksi tabel; 18px pada tombol tampilkan kata sandi; 12px pada chip status dan flag (§4).
- Ikon selalu berdampingan dengan teks, jadi selalu ditulis `aria-hidden="true"`. Tidak ada ikon yang menggantikan label.

| Glif | Dipakai di | Alasan |
|---|---|---|
| `dashboard` | Item navigasi Dashboard | Empat panel mewakili susunan kartu pada layar ringkasan |
| `tugas` | Item navigasi Tugas | Papan berkas berisi baris, mewakili daftar penugasan |
| `antrean` | Item navigasi Antrean Review | Baki masuk, mewakili pengumpulan yang menunggu diperiksa |
| `dokumen` | Item navigasi Dokumen dan Katalog Dokumen | Map berkas, objek yang diarsipkan |
| `laporan` | Item navigasi Laporan | Batang bertingkat dengan garis alas, inti laporan rekap |
| `pengguna` | Item navigasi Pengguna dan Kelola Master | Dua sosok, mewakili banyak akun yang dikelola |
| `divisi` | Item navigasi Divisi | Bagan organisasi, mewakili struktur divisi |
| `kategori` | Item navigasi Kategori | Label bertanda lubang, penanda pengelompokan |
| `log` | Item navigasi Log Aktivitas | Lingkaran waktu berjarum, jejak kejadian lampau |
| `notifikasi` | Lonceng top bar dan item Notifikasi | Lonceng, bentuk yang sudah dipakai produk untuk pemberitahuan |
| `akun` | Akun Saya | Sosok di dalam lingkaran, identitas pemilik sesi |
| `belum` | Chip Belum Dikerjakan | Lingkaran kosong, belum ada isi pekerjaan |
| `sedang` | Chip Sedang Dikerjakan | Tanda jalan, pekerjaan mulai berjalan |
| `menunggu` | Chip Menunggu Verifikasi | Jam pasir, waktu berjalan menunggu pihak lain |
| `selesai` | Chip Selesai | Centang di dalam lingkaran, pekerjaan sah |
| `dibatalkan` | Chip Dibatalkan | Lingkaran tercoret, alur dihentikan |
| `jam` | Flag Tenggat Dekat | Jarum jam, menandai sisa waktu |
| `terlambat` | Flag Terlambat | Segitiga peringatan, penanda kritis yang harus terbaca sebelum teksnya dibaca |
| `revisi` | Flag Perlu Revisi | Pensil, pekerjaan perlu dikoreksi |
| `terarsip` | Flag Terarsip | Kotak arsip bertutup, berkas sudah masuk rak |
| `unduh` | Aksi `Unduh Bukti Terarsip` pada tabel | Tanda arah turun ke garis alas, berkas keluar dari sistem |
| `unggah` | Dropzone dan aksi kirim pada modal pengumpulan | Tanda arah naik dari garis alas, berkas masuk ke sistem |
| `cari` | Kolom pencarian | Lup, konvensi pencarian yang tidak menimbulkan salah baca |
| `filter` | Tombol dan baris filter | Garis mengecil berurutan, mewakili penyaringan bertingkat |
| `tutup` | Tombol tutup dialog | Silang, satu-satunya aksi pada posisi itu |
| `tambah` | CTA `+ Buat Tugas` | Tanda tambah, aksi menambah baris baru |
| `lihat` | Aksi Lihat pada baris tabel dan tombol tampilkan kata sandi | Mata, membuka detail atau isian tersembunyi tanpa berpindah konteks |
| `sembunyi` | Tombol tampilkan kata sandi pada L01 dan L02 | Mata tercoret, aksi menyembunyikan isian yang sedang tampil |
| `centang` | Kolom terpilih dan chip Aktif | Tanda centang, keadaan terpilih atau menyala |
| `menu` | Tombol `Menu` pada top bar ponsel dan tablet | Tiga bilah sejajar, lambang daftar navigasi yang tersembunyi |
| `pengaturan` | Item navigasi Pengaturan (L18) | Roda gigi, lambang setelan yang lazim dan tidak dipakai glif lain |

Glif baru hanya boleh masuk lewat penambahan baris di tabel ini beserta alasannya (§9 aturan 16).

---

## 8. Cetak laporan

Fitur cetak/ekspor laporan wajib punya aturan sendiri:

- Ukuran A4 potret, margin 15 mm; sidebar, top bar, tombol aksi, chip filter, dan paginasi disembunyikan.
- Kepala laporan: kop instansi, judul laporan, periode, **daftar filter yang sedang aktif**, dan waktu cetak (WIB).
- Tabel: border 0.5pt hitam, tanpa zebra, tanpa warna latar status; status ditulis sebagai teks (`Menunggu Verifikasi`).
- Angka memakai `tabular-nums`; kolom jumlah rata kanan.
- Grafik dicetak sebagai gambar skala abu-abu dengan label nilai tercetak, bukan mengandalkan warna.
- Blok tanda tangan tidak boleh terpotong (`page-break-inside: avoid`); setiap section mulai di halaman baru bila lebih dari satu halaman.
- Jumlah baris tercetak harus sama dengan jumlah baris pada layar dengan filter yang sama.

---

## 9. Aturan yang tidak boleh dilanggar

1. **Status tidak pernah dibedakan hanya oleh warna**: wajib ikon + teks + warna.
2. **Ukuran teks minimum 12px**; angka KPI memakai `tabular-nums`.
3. **Setiap pasangan warna teks/latar wajib ≥4.5:1**; elemen non-teks yang informatif ≥3:1. Setiap penambahan warna baru wajib menyertakan rasio terhitung di tabel §2.1.
4. **`Revisi` bukan status.** Status kanonik 5; kondisi revisi ditampilkan sebagai flag `Perlu Revisi` + penghitung `revision_count`.
5. **`Revisi`/`Tenggat Dekat`/`Terlambat`/`Terarsip` tidak boleh muncul sebagai opsi filter status**, karena bukan status.
6. **Tidak ada kontrol yang hanya ditandai garis tipis.** Bila batas kontrol tidak mencapai 3:1, wajib ada label, latar, atau ikon.
7. **Optimistic UI hanya setelah `env.DB.batch()` berhasil.** Baris tabel baru berubah ke "Menunggu Verifikasi" setelah commit sukses; gagal → state `rolled_back` + pesan galat.
8. **Semua teks antarmuka Bahasa Indonesia**; kode teknis hanya di log, ekspor, dan dokumentasi.
9. **Waktu selalu ditampilkan WIB** dengan format `16 Okt 2026 17:00 WIB` (hari ini boleh "hari ini 17:00 WIB").
10. **Setiap angka pada kartu menyebut satuannya** (`assignment` atau `task`) dan dapat diklik menuju daftar terfilter.
11. **Aksi merusak wajib konfirmasi + alasan** yang tercatat (batalkan tugas, hapus dokumen) dan memakai tombol `danger`, bukan `primary`.
12. **Target sentuh ≥44×44 px** pada ponsel dan tablet.
13. **Dialog wajib fokus terkunci**, `role="dialog"`, `aria-modal="true"`, dapat ditutup dengan ESC (kecuali sedang mengunggah), dan mengumumkan galat lewat `aria-live="polite"`.
14. **Grafik tidak boleh mengandalkan warna saja**: setiap seri punya label/legenda bernama dan tetap terbaca saat dicetak abu-abu.
15. **Jangan menambah komponen, warna, atau ukuran teks baru** tanpa mencatatnya di changelog §11 beserta alasannya.
16. **Ikon hanya dari set resmi §7.1.** Tidak mengimpor set ikon pihak ketiga dan tidak menggambar glif baru di luar §7.1; setiap glif baru wajib menambah baris di §7.1 beserta alasannya dan catatan di §11.

---

## 10. Tata kelola token

- **Sumber kebenaran**: berkas ini. Salinan ke kode dibangun otomatis: `python build/build-tokens.py` membaca §2.1 sampai §2.3 dan menulis `design/tokens.css` (CSS variables + `@theme` Tailwind v4). Salinan itu tidak boleh diedit manual; CI menolak salinan yang tidak selaras lewat `build-tokens.py --check`.
- **Utilitas**: kode aplikasi memakai utilitas Tailwind dari `@theme` (`bg-surface`, `border-border`, `text-ink-3`, `bg-status-menunggu-surface`). Nama panjang tetap sah lewat `var(--color-...)`. Nama pendek `ink`, `ink-2`, `ink-3` adalah alias Tinta 1/2/3, bukan warna baru.
- **Uji kontras otomatis**: `python build/check-contrast.py` menghitung ulang setiap pasangan pada tabel §2.1 dan menolak baris berstatus "lulus" yang rasionya di bawah ambang. CI menjalankannya.
- **Format `{colors.primary}`** adalah gaya Design Tokens; Tailwind tidak membacanya. Konversi meratakan referensi menjadi nilai akhir.
- **Perubahan**: tambah baris di §11 (tanggal, nilai lama → baru, alasan, rasio kontras baru bila berkaitan dengan warna).
- **Aturan bisnis** (status, transisi, metrik, modal) tetap merujuk `RANCANGAN-SISTEM-v2.md`; jangan disalin ulang di sini.
- **Uji**: setiap warna teks baru wajib lolos pemeriksaan kontras otomatis sebelum dipakai.

---

## 11. Changelog

| Versi | Tanggal | Perubahan | Alasan |
|---|---|---|---|
| 1.0.0 | 2026-10-16 | Versi awal, disusun dari draf sistem desain internal | Menyatukan token, komponen, dan aturan agar tidak ada keputusan visual ad-hoc |
| 1.0.0 | 2026-10-16 | Teks chip status dinaikkan ke shade 700/800 (`#16A34A`→`#15803D`, `#D97706`→`#B45309`, `#2563EB`→`#1D4ED8`, `#0891B2`→`#0E7490`, `#DC2626`→`#B91C1C`) | Draf awal hanya mencapai 2.86–4.24:1 dan gagal WCAG AA; nilai baru 4.51–5.49:1 |
| 1.0.0 | 2026-10-16 | Indikator navigasi aktif di sidebar jadi pill terisi `primary` + teks putih | Merah `#B7091E` sebagai teks di atas `#191B27` hanya 2.50:1 |
| 1.0.0 | 2026-10-16 | Ukuran teks minimum dinaikkan dari 11px ke 12px; ditambah `display-kpi` 28px | Body 12px dan label 11px terlalu kecil untuk pemakaian harian; angka KPI belum punya token |
| 1.0.0 | 2026-10-16 | Ditambah: aturan responsif (§5), aturan cetak (§8), focus ring, disabled/loading, tombol danger, palet grafik, aturan tumpuk chip | Menutup celah yang dibutuhkan 17 layar dan fitur cetak laporan |
| 1.1.0 | 2026-10-17 | Ditambah §7.1 set ikon resmi (28 glif, grid 16, garis 1.5, `currentColor`) dan §9 aturan 16 | Navigasi, chip status, dan aksi tabel sebelumnya tanpa ikon sama sekali, padahal §9 aturan 1 mewajibkan ikon pada status; belum ada sumber geometri ikon milik produk |
| 1.1.0 | 2026-10-17 | Tanda pisah panjang diganti koma, titik dua, atau tanda kurung di seluruh berkas ini | Antislop R-02 melarang karakter tanda pisah panjang pada teks |
| 1.2.0 | 2026-10-17 | §2.3 jadi terbaca mesin: `breakpoints` memakai lebar minimum angka (`tablet: 768`, `desktop: 1024`), `elevation.overlay` jadi peta `{ color, blur }`, ditambah `page.maxWidth` 1440 | `design/tokens.css` dibangun otomatis dari bagian ini, jadi nilainya harus terbaca mesin; nilai visual tidak berubah, hanya bentuk penulisannya |
| 1.2.0 | 2026-10-17 | Ditambah §10: penunjuk skrip pembangun token, aturan pemakaian utilitas, dan pemeriksaan kontras otomatis | Salinan token dilarang diedit manual, jadi asal-usul dan cara memeriksanya harus tertulis |
| 1.3.0 | 2026-10-17 | §7.1 ditambah glif `menu` (29 glif) | Tombol `Menu` pada top bar ponsel sudah digambar di `wireframe/mobile-reflow.svg`, tetapi set glif belum punya lambang untuknya |
| 1.4.0 | 2026-10-19 | §7.1 diselaraskan dengan `src/app/icons.tsx`: kanvas 20x20 Fluent Regular dan `fill`, glif `sembunyi` didokumentasikan, glif `pengaturan` ditambahkan (31 glif) | Dokumen menyebut grid 16 dengan garis 1.5, sedangkan kode memakai 20x20 terisi; `sembunyi` sudah dipakai di form kata sandi tetapi belum tercatat; L18 membutuhkan lambang Pengaturan |
