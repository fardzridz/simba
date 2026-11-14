# Audit 001 — Tindak Lanjut Bagian 2 (temuan #9)

Tanggal: 12 November 2026
Nomor yang dikerjakan: **9**
Sudah selesai sebelumnya: 1, 2, 3, 4, 5, 6, 7, 8
Belum dikerjakan: 10, 11, 12, 13, 14

---

## Koreksi temuan #9

Temuan asli berbunyi "tidak ada state loading dan error sama sekali". Itu **tidak akurat** dan perlu dikoreksi sebelum perbaikan:

Yang **sudah ada** di `src/app/(app)/`:

| Berkas | Isi |
|---|---|
| `loading-state.tsx` | `Skeleton`, `TableSkeleton`, `KpiStripSkeleton`, `LoadingButton` |
| `error-state.tsx` | `ErrorBanner`, `ErrorState`, `FieldError` |
| `empty-state.tsx` | `EmptyState` dengan tiga sebab (pertama kali, filter nol, tanpa akses) |
| `forbidden-state.tsx` | `ForbiddenState` (403) |
| `states.test.tsx` | 8 tes untuk komponen-komponen di atas |

Jadi komponen state sudah lengkap dan sudah diuji. Yang **benar-benar tidak ada** adalah berkas konvensi Next.js yang memasangnya di rute: `loading.tsx` dan `error.tsx`. Tanpa berkas itu, komponen tersebut hanya dipakai manual di beberapa klien (`documents-client`, `logs-client`, `notifications-client`, halaman tugas), sementara rute `/reports` tidak punya keduanya.

Temuan tetap valid sebagai **defect**, tetapi penyebabnya berbeda: bukan komponen yang hilang, melainkan **rute yang tidak terpasang ke komponen yang sudah ada**.

---

## Yang dikerjakan

### `src/app/(app)/reports/loading.tsx` (baru)

Kerangka mengikuti tata letak halaman asli supaya tidak ada pergeseran tata letak saat data tiba:

- judul + subjudul
- baris filter (5 kontrol)
- blok ringkasan 8/4 dengan lima sel KPI
- blok pratinjau 8/4 dengan tabel 6 kolom x 4 baris

Mengumumkan `role="status"` dan `aria-live="polite"` dengan teks "Memuat laporan dan pilihan ekspor.", sementara seluruh kerangka `aria-hidden="true"` supaya pembaca layar tidak membacakan kotak kosong. Tidak ada angka yang dirender selama memuat, karena angka sementara adalah data karangan (R-17, R-38).

### `src/app/(app)/reports/error.tsx` (baru)

Mengikuti API Next.js 16 yang dibaca dari `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`:

```tsx
"use client";
export default function ReportsError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
})
```

Tiga hal yang sengaja mengikuti dokumen, bukan kebiasaan lama:

1. **`'use client'` wajib.** Batas galat harus Komponen Klien.
2. **`retry`, bukan `reset`.** Dokumen menyebut `retry` menjadi stabil di `v16.3.0`, dan menyarankan `retry()` di hampir semua kasus karena ia me-render ulang segmen, bukan hanya membersihkan state.
3. **`error: unknown` disempitkan.** Dokumen menyatakan galat dari Komponen Klien diteruskan apa adanya dan bisa bukan `Error`, jadi `instanceof Error` dipakai sebelum membaca properti.

Pesan pengguna tidak pernah memuat detail internal. Yang tampil: judul "Laporan gagal dimuat", sebab yang dapat ditindaklanjuti, tombol "Coba muat ulang", dan tautan "Kembali ke Dashboard". `error.digest` ditampilkan sebagai "Kode kejadian" karena itu satu-satunya nilai yang aman dan berguna untuk mencocokkan log server, sesuai dokumen: pesan galat dari Komponen Server di produksi diganti pesan generik, dan `digest` adalah jalur pencocokannya.

### Tes

`src/app/(app)/reports/loading.test.tsx` (3 tes):
- mengumumkan `role="status"` dan `aria-live="polite"`
- tidak menampilkan satu digit pun selama memuat
- kerangka `aria-hidden="true"`

`src/app/(app)/reports/error.test.tsx` (4 tes):
- menyebut sebab dan dua tindakan pemulihan
- tidak membocorkan pesan internal (diuji dengan galat bergaya D1: `D1_ERROR: no such table: task_assignments`)
- menampilkan kode kejadian dari `digest`
- tetap terender saat yang dilempar bukan `Error`

---

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx vitest run` (seluruh repo) | **33 file, 190 tes, semua lulus** |
| `npx tsc --noEmit` | bersih |
| `npx next build` | sukses; `/reports` dan `/reports/export` terbentuk |
| Chunk build | `src_app_(app)_reports_loading_tsx_*.js` dan `src_app_(app)_reports_error_tsx_*.js` ada di `.next/server/chunks/ssr/` |
| `python build/build-tokens.py --check` | selaras |

Bukti bahwa kedua berkas benar-benar terpasang, bukan sekadar ada di disk: build menghasilkan chunk SSR terpisah untuk masing-masing, yang hanya terjadi bila Next.js mendaftarkannya sebagai segmen rute.

---

## Delivery Gate

### Block 1: Hard Gate

| Rule | Status | Bukti |
|---|---|---|
| R-02 em dash | **PASS** | Tidak ada `—` di berkas baru |
| R-03 mobile | **PASS** | Kerangka memakai grid yang sama (`grid-cols-1` → `desktop:grid-cols-12`) |
| R-17 angka tanpa sumber | **PASS** | Kerangka memuat nol digit; diuji eksplisit |
| R-18 testimoni | **PASS** | Tidak ada |
| R-23 aset | **PASS** | Tidak ada aset baru; ilustrasi dari `public/ilustrasi/` yang sudah ada |
| R-24 navigasi mati | **PASS** | Tautan hanya `/dashboard` yang nyata |
| R-25 kontras | **PASS** | Memakai `ErrorState` yang sudah lolos (teks `error` `#B91C1C` di `error-surface` `#FEE2E2` = 5.30:1, tercatat di komentar komponen) |
| R-26 kontrol mati | **PASS** | `retry` terhubung ke `onRetry`; tautan nyata |
| R-27 state | **PASS** | **Ini yang diperbaiki.** Memuat, galat, dan kosong kini punya jalur di rute |
| R-28 FAQ | **PASS** | Tidak ada |
| R-32 keyboard & fokus | **PASS** | `ErrorState` memakai `<button type="button">` dengan cincin fokus |
| R-33 patch via skrip | **PASS** | Tidak ada |
| R-34 tema | **PASS** | Tidak ada toggle tema |
| R-35 verifikasi | **PASS** | 190 tes, `tsc` bersih, `next build` sukses, chunk terkonfirmasi |
| R-36 klaim palsu | **PASS** | Pesan galat tidak mengklaim sebab yang tidak diketahui; hanya menyebut data tidak dapat diambil |
| R-37 arah desain | **PASS** | Memakai komponen state resmi project |
| R-38 konten jujur | **PASS** | Tidak ada angka atau data karangan di kerangka |
| R-39 semantik & affordance | **PASS** | `role="status"` / `role="alert"`, teks pengumuman, kerangka `aria-hidden` |
| R-40 performa | **PASS** | Kerangka tanpa media; tidak ada skrip pihak ketiga; tidak ada angka performa diklaim |

### Block 2: Purpose-Gate

| Rule | Status | Alasan tertulis |
|---|---|---|
| R-01/R-29 warna | **PASS** | Tidak ada warna baru; memakai token |
| R-04 ikon | **PASS** | Tidak ada ikon ditambah |
| R-06 tipografi | **PASS** | Hanya token skala resmi |
| R-19 animasi | **PASS** | Pulsa skeleton memakai `motion-reduce:animate-none` dari `loading-state.tsx`, sesuai MOTION 1 |
| R-31 alasan tertulis | **PASS** | Setiap pilihan dijelaskan di dokumen ini |

### Block 3: Liveliness

| Item | Status |
|---|---|
| Dial eksplisit | **PASS** — ENERGY 1 / RHYTHM 2 / MOTION 1 |
| Satu titik fokus | **PASS** — kerangka meniru hierarki halaman asli, bukan blok seragam |
| Whitespace sebagai struktur | **PASS** |
| Tanpa loop tak berkesudahan | **PASS** — pulsa skeleton berhenti saat data tiba |

### Block 4: Craftsmanship & Quality Locks

| Item | Status |
|---|---|
| C-1 intensionalitas | **PASS** |
| C-2 kelengkapan fungsional | **PASS** — `retry` benar-benar memulihkan |
| C-3 komposisi dari konten | **PASS** — kerangka mengikuti struktur konten nyata |
| C-4 ketahanan | **PASS** — galat non-`Error` pun tertangani |
| C-5 bukti di atas klaim | **PASS** — `digest` disediakan untuk penelusuran |

---

## Sisa pekerjaan

| # | Temuan | Prioritas |
|---|---|---|
| 12 | "Export Excel" menghasilkan CSV | MEDIUM, salah label pada dokumen resmi |
| 10 | Tombol "Custom Tanggal" mengisi hari ini, memakai UTC | MEDIUM |
| 11 | Rentang tanggal parsial diabaikan diam-diam | MEDIUM |
| 13 | Kop instansi & nama pejabat tanpa jalur pengisian | MEDIUM, butuh keputusan pemilik produk |
| 14 | `mock-reports.ts` berisi angka karangan, tak terpakai | MEDIUM |

### Catatan tambahan yang muncul saat mengerjakan #9

Rute `/reports` sekarang punya `loading.tsx` dan `error.tsx`, tetapi **rute lain belum**. Pola yang sama bisa dipasang di `/tasks`, `/documents`, `/dashboard`, dan `/logs` dengan menyalin pendekatan ini. Itu di luar nomor 9 dan tidak saya kerjakan tanpa persetujuan.

Satu batasan teknis yang perlu diketahui: `error.tsx` **tidak** menangkap galat di layout di atasnya. Galat pada `(app)/layout.tsx` (misalnya kueri divisi atau notifikasi gagal) tetap akan lolos ke `src/app/global-error.tsx`, yang juga belum ada. Kalau ingin cakupan penuh, `global-error.tsx` perlu dibuat terpisah.
