# Audit 001 — Tindak Lanjut Bagian 3 (temuan #12, `global-error`, dan state rute lain)

Tanggal: 12 November 2026
Nomor yang dikerjakan: **12**
Pekerjaan tambahan yang disetujui: `src/app/global-error.tsx` + `loading.tsx`/`error.tsx` untuk `/tasks`, `/documents`, `/dashboard`, `/logs`
Sudah selesai sebelumnya: 1, 2, 3, 4, 5, 6, 7, 8, 9
Belum dikerjakan: 10, 11, 13, 14

---

## Temuan #12 — label ekspor menjanjikan format yang tidak dikirim

**Masalah.** Tombol di panel detail per divisi berlabel **"Export Excel"**, sementara rute yang dibukanya mengirim CSV:

```ts
// src/app/(app)/reports/export/route.ts
"Content-Type": "text/csv; charset=utf-8",
"Content-Disposition": `attachment; filename="${filename}"`,
```

Jadi berkasnya `.csv` berisi teks berkoma, bukan `.xlsx`. Pada dokumen yang dipakai untuk laporan resmi, salah label seperti ini membuat orang mengira berkasnya bisa dibuka langsung di Excel dengan format sel, padahal isinya teks polos.

**Perbaikan.**

```diff
- Export Excel
+ Ekspor CSV divisi ini
```

Label baru sekaligus menyebut cakupannya ("divisi ini"), karena tombol ini berada di dalam panel detail satu divisi dan mengekspor filter yang sudah disempitkan ke divisi tersebut. Tanpa keterangan itu, pengguna bisa mengira tombolnya mengekspor seluruh laporan seperti tombol di panel atas.

**Tes regresi.** Tes baru di `reports.test.tsx` memastikan tidak ada lagi sebutan Excel dalam bentuk apa pun:

```ts
expect(html).not.toMatch(/excel|xlsx|xls\b/i);
expect(html).toContain("Ekspor CSV");
```

Pencarian di seluruh `src` menyisakan satu kemunculan `xls`, dan itu bukan label: `settings.ts` baris 98 memuat `application/vnd.ms-excel` sebagai tipe MIME yang **diterima** saat unggah berkas. Itu benar dan tidak disentuh.

---

## `src/app/global-error.tsx` (baru)

### Kapan berkas ini benar-benar terpakai

`error.tsx` tidak menangkap galat di `layout.tsx` pada segmen yang sama. Artinya bila `(app)/layout.tsx` gagal, yaitu kueri nama divisi atau hitungan notifikasi belum terbaca, seluruh kerangka aplikasi tidak bisa dirender dan tidak ada `error.tsx` rute mana pun yang aktif. Di titik itulah `global-error.tsx` mengambil alih.

### Tiga hal yang wajib, dan mudah terlewat

Saya baca `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` § Global Error sebelum menulis, dan ada tiga syarat yang tidak boleh ditebak:

1. **Harus Komponen Klien.** Batas galat tidak bisa berupa Komponen Server.
2. **Harus mendefinisikan `<html>` dan `<body>` sendiri.** Berkas ini *menggantikan* root layout, bukan berada di dalamnya.
3. **Tidak mewarisi global styles.** Dokumen menyebutnya eksplisit: `global-error` "render their own document and do **not** include your global styles". Karena itu `globals.css` diimpor langsung di berkas ini. Tanpa impor itu, halaman galat akan tampil tanpa token warna dan tipografi sama sekali.

`metadata` juga tidak didukung di sini karena batasannya Komponen Klien, jadi judul halaman dipasang lewat elemen `<title>` React, sesuai saran dokumen.

### Isi pesannya

Pesan tidak menyebut detail teknis. Ada satu hal yang sengaja dinyatakan: **"Ini bukan berarti akun Anda tidak berhak atas datanya."** Tanpa kalimat itu, halaman galat pada aplikasi berlapis izin mudah disalahartikan sebagai penolakan akses, dan pengguna akan menghubungi admin untuk hal yang salah.

`error.digest` ditampilkan sebagai "Kode kejadian". Dokumen menyatakan pesan galat dari Komponen Server di produksi diganti pesan generik, dan `digest` adalah satu-satunya jalur untuk mencocokkannya dengan log server. Menampilkannya membuat laporan pengguna bisa ditelusuri; menyembunyikannya membuat laporan galat tidak bisa dicocokkan dengan apa pun.

---

## `src/app/(app)/route-error.tsx` (baru) dan empat rute

Lima rute butuh perilaku galat yang identik: pesan tanpa detail internal, satu tombol pemulihan, satu jalan keluar, dan kode kejadian bila ada. Menyalin blok yang sama lima kali membuat aturan keamanan mudah menyimpang di salah satu salinan, jadi kerangkanya dipisah dan tiap rute hanya menyatakan teksnya sendiri.

| Rute | Judul | Aksi keluar |
|---|---|---|
| `/reports` | Laporan gagal dimuat | Kembali ke Dashboard |
| `/dashboard` | Dashboard gagal dimuat | **Buka Daftar Tugas** |
| `/tasks` | Daftar tugas gagal dimuat | Kembali ke Dashboard |
| `/documents` | Katalog dokumen gagal dimuat | Kembali ke Dashboard |
| `/logs` | Log aktivitas gagal dibaca | Kembali ke Dashboard |

Dua pilihan teks yang disengaja:

- **Dashboard** memakai aksi keluar ke `/tasks`, bukan ke `/dashboard`. Tautan ke halaman yang sedang gagal hanya memutar pengguna kembali ke galat yang sama.
- **Log** memakai kata "gagal dibaca", bukan "tidak ada log". Log adalah bukti audit; kalimat yang menyiratkan tidak ada aktivitas tercatat adalah klaim palsu saat yang benar adalah pembacaan gagal. Pesannya menyatakan eksplisit bahwa catatan tetap tersimpan di server.

### Empat `loading.tsx`

| Rute | Kerangka mengikuti |
|---|---|
| `/dashboard` | banner lingkup, 8 kartu metrik, panel distribusi 7/12 + antrean 5/12 |
| `/tasks` | judul + tombol buat, pita 4 KPI, baris filter, tabel 5 kolom, paginasi |
| `/documents` | judul, baris filter, tabel 3 kolom + panel detail 5/12 |
| `/logs` | judul, banner aturan log, baris filter, tabel 5 kolom, paginasi |

Semua memakai `Skeleton`/`TableSkeleton`/`KpiStripSkeleton` yang sudah ada, mengumumkan `role="status"` + `aria-live="polite"`, dan menyembunyikan kerangka dengan `aria-hidden="true"` supaya pembaca layar tidak membacakan kotak kosong. Tidak ada satu digit pun dirender selama memuat, karena angka sementara adalah data karangan (R-17, R-38).

---

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx vitest run` (seluruh repo) | **37 file, 230 tes, semua lulus** |
| `npx tsc --noEmit` | bersih |
| `npx next build` | sukses, `BUILD_ID` `BfG8eKyY5_EkIW4DDEDK7` |
| `python build/build-tokens.py --check` | selaras |
| Sisa sebutan Excel di `src` | 1, dan itu MIME `application/vnd.ms-excel` pada daftar tipe unggah, bukan label |

### Bukti berkas konvensi benar-benar terdaftar

Build menghasilkan chunk SSR terpisah untuk **setiap** berkas konvensi. Chunk itu hanya muncul bila Next.js mendaftarkannya sebagai segmen rute, bukan sekadar karena berkasnya ada di disk:

```
src_app_global-error_tsx_0w4-lfw52j65b._.js
src_app_(app)_dashboard_error_tsx_117uppfapwx36._.js
src_app_(app)_dashboard_loading_tsx_18nj037to4_5z._.js
src_app_(app)_documents_error_tsx_0nqa01l4wdjl3._.js
src_app_(app)_documents_loading_tsx_03telcr46_ftp._.js
src_app_(app)_logs_error_tsx_0ntcrl5tpqw83._.js
src_app_(app)_logs_loading_tsx_0x4iuyfqsxj25._.js
src_app_(app)_reports_error_tsx_1je9u69hhwd8n._.js
src_app_(app)_reports_loading_tsx_01kkuo51dwxhl._.js
src_app_(app)_tasks_error_tsx_1abbatmt364f4._.js
src_app_(app)_tasks_loading_tsx_1oxk1yy-unjjg._.js
```

Selain itu `.next/app-path-routes-manifest.json` memuat entri `"/_global-error/page": "/_global-error"`, yang hanya ada bila `global-error.tsx` dikenali.

### Kontras yang diukur

| Pasangan | Rasio | Normal text (4.5:1) |
|---|---|---|
| `text-ink` `#111827` di card putih | 17.74:1 | PASS |
| `text-ink-2` `#4B5563` di card putih | 7.56:1 | PASS |
| `text-ink-3` `#6B7280` di card putih | 4.83:1 | PASS |
| `text-on-dark` `#FFFFFF` di `bg-primary` `#B7091E` | 6.84:1 | PASS |
| `text-ink` `#111827` di `bg-background` `#FCFCFC` | 17.29:1 | PASS |

### Kelas CSS yang dipakai benar-benar ada di bundel

Diperiksa langsung pada `.next/static/chunks/*.css` hasil build, termasuk nama ber-escape seperti `hover\:bg-primary-hover`, `focus-visible\:outline-focus-light`, `duration-\[120ms\]`, `max-w-\[520px\]`, dan `motion-reduce\:transition-none`: semuanya ADA. Tidak ada kelas yang hanya terlihat benar di kode tetapi tidak menghasilkan CSS.

### Tes baru

| Berkas | Tes | Yang dikunci |
|---|---|---|
| `src/app/global-error.test.tsx` | 6 | dokumen sendiri (`<html>`/`<body>`/`lang`), pesan bukan-penolakan-akses, tanpa bocor detail, `digest`, tahan nilai non-`Error` |
| `src/app/(app)/route-error.test.tsx` | 6 | aksi keluar bawaan & khusus, tanpa bocor detail, `digest` kondisional, tahan non-`Error`, judul halaman opsional |
| `src/app/(app)/route-error-wiring.test.tsx` | 3 | `retry` benar-benar diteruskan ke `onRetry` (diuji dengan komponen tiruan) |
| `src/app/(app)/route-states.test.tsx` | 24 | 4 loading: status diumumkan, nol digit, kerangka tersembunyi; 4 error: judul, pemulihan, aksi keluar, tanpa bocor detail, tahan non-`Error` |
| `src/app/(app)/reports/reports.test.tsx` | +1 | tidak ada lagi sebutan Excel |

Catatan metode: penyambungan `retry` **tidak bisa** diuji lewat markup statis, karena markup tidak memperlihatkan handler. Karena itu ada tes terpisah yang mengganti komponen keadaan galat dengan tiruan dan memeriksa identitas fungsi yang diterima. Tanpa tes itu, `onRetry={retry}` bisa salah ketik menjadi `onRetry={() => retry}` dan semua tes markup tetap hijau.

---

## Delivery Gate

Mode `after`, jadi gate dijalankan sebagai pemeriksaan hasil perbaikan.

### Block 1: Hard Gate

| Rule | Status | Bukti |
|---|---|---|
| R-02 em dash | **PASS** | Pencarian U+2014 di 12 berkas baru: tidak ada |
| R-03 mobile | **PASS** | Kerangka memakai grid yang sama dengan halaman asli (`grid-cols-1` → `tablet:`/`desktop:`); tidak ada lebar tetap yang memaksa gulir horizontal |
| R-17 angka tanpa sumber | **PASS** | Kerangka memuat nol digit; diuji eksplisit per rute |
| R-18 testimoni | **PASS** | Tidak ada |
| R-23 aset tanpa konfirmasi | **PASS** | Tidak ada aset baru; ilustrasi galat dari `public/ilustrasi/galat-muat.svg` yang sudah ada |
| R-24 navigasi mati | **PASS** | Hanya `/dashboard` dan `/tasks`, keduanya rute nyata |
| R-25 kontras | **PASS** | Lima pasangan diukur, terendah 4.83:1 |
| R-26 kontrol mati | **PASS** | `retry` tersambung dan diuji dengan komponen tiruan; label ekspor menuju rute nyata |
| R-27 state | **PASS** | Lima rute kini punya memuat + galat; lapisan layout ditutup `global-error` |
| R-28 FAQ | **PASS** | Tidak ada |
| R-32 keyboard & fokus | **PASS** | Tombol `type="button"` dengan cincin fokus; `retry` bisa dicapai keyboard |
| R-33 patch via skrip | **PASS** | Tidak ada skrip penulisan ulang |
| R-34 tema | **PASS** | Tidak ada toggle tema; `global-error` mengikuti token terang aplikasi |
| R-35 verifikasi | **PASS** | 230 tes, `tsc` bersih, build sukses, chunk & manifest diperiksa |
| R-36 klaim palsu | **PASS** | **Ini inti #12.** Label tidak lagi menjanjikan Excel untuk berkas CSV; pesan galat log tidak menyiratkan tidak ada aktivitas |
| R-37 arah desain | **PASS** | Memakai komponen state resmi; dial ENERGY 1 / RHYTHM 2 / MOTION 1 dipertahankan |
| R-38 konten jujur | **PASS** | Tidak ada angka karangan; halaman galat menyatakan ketidakpastian apa adanya |
| R-39 semantik & affordance | **PASS** | `role="status"`/`role="alert"`, `aria-live`, kerangka `aria-hidden`, tombol nyata |
| R-40 performa | **PASS** | Satu bundel CSS 52 KB, tidak bertambah karena `global-error` mengimpor berkas yang sama; tidak ada media baru |

### Block 2: Purpose-Gate

| Rule | Status | Alasan tertulis |
|---|---|---|
| R-01/R-29 warna | **PASS** | Hanya token §2.1; tidak ada palet baru |
| R-04 ikon | **PASS** | Tidak ada ikon ditambah |
| R-06 tipografi | **PASS** | Hanya `text-h1`, `text-body`, `text-body-sm`, `font-mono` dari skala §2.2 |
| R-08 panah | **PASS** | Tidak ada |
| R-09 badge | **PASS** | Tidak ada badge dekoratif |
| R-10/R-12/R-13 glass, shadow, glow | **PASS** | Hanya `card` dan `shadow-xs` yang sudah ada |
| R-14 kartu seragam | **PASS** | Kerangka mengikuti hierarki konten nyata tiap halaman, bukan blok seragam |
| R-19 animasi | **PASS** | Pulsa skeleton memakai `motion-reduce:animate-none`; transisi tombol `motion-reduce:transition-none` |
| R-22 ilustrasi | **PASS** | Hanya ilustrasi galat resmi yang sudah ada |
| R-31 alasan tertulis | **PASS** | Setiap pilihan dijelaskan di dokumen ini |

### Block 3: Liveliness

| Item | Status |
|---|---|
| Dial eksplisit | **PASS** — ENERGY 1 / RHYTHM 2 / MOTION 1 dari `DESIGN.md` |
| Satu titik fokus per layar | **PASS** — halaman galat berpusat pada satu pesan dan satu tombol |
| Kontras hierarkis | **PASS** — judul `ink`, penjelasan `ink-2`, bantuan `ink-3` |
| Whitespace sebagai struktur | **PASS** — `mt-2`/`mt-3`/`mt-5` memisahkan pesan, bantuan, aksi |
| Satu aksen | **PASS** — `primary` hanya pada tombol pemulihan |
| Motif identitas | **PASS** — memakai `card` dan token yang sama dengan sisa aplikasi |

### Block 4: Craftsmanship & Quality Locks

| Item | Status |
|---|---|
| C-1 intensionalitas | **PASS** — setiap berkas punya alasan; tidak ada salinan buta |
| C-2 kelengkapan fungsional | **PASS** — `retry` bekerja, aksi keluar menuju halaman yang tidak sedang gagal |
| C-3 komposisi dari konten | **PASS** — kerangka meniru susunan asli tiap halaman |
| C-4 ketahanan | **PASS** — nilai non-`Error` dan `null` tetap terender; tanpa `digest` pun tetap utuh |
| C-5 bukti di atas klaim | **PASS** — chunk, manifest, dan CSS diperiksa langsung, bukan diasumsikan |

---

## Catatan yang perlu keputusan Anda

### 1. Rute yang belum punya state

Sisa rute tanpa `loading.tsx`/`error.tsx`: `/account`, `/master`, `/notifications`, `/settings`, `/tasks/new`, `/tasks/[id]`, `/tasks/[id]/edit`, `/login`. Polanya sudah tersedia, jadi tinggal disalin dengan teks yang sesuai. Belum saya kerjakan karena di luar persetujuan.

Dua di antaranya perlu pertimbangan sendiri:

- **`/tasks/[id]`** dan **`/tasks/[id]/edit`** adalah halaman detail. Kerangka memuat untuk halaman detail berbeda bentuknya (judul tugas, metadata, panel berkas), bukan tabel.
- **`/login`** justru sebaiknya **tanpa** `error.tsx` rute, karena galat di halaman masuk lebih baik jatuh ke `global-error` daripada menampilkan kerangka aplikasi yang belum ada sesinya.

### 2. Sisa temuan audit

| # | Temuan | Catatan |
|---|---|---|
| 10 | "Custom Tanggal" mengisi hari ini dan memakai UTC lewat `toISOString` | Bisa menggeser tanggal satu hari untuk WIB/WITA/WIT |
| 11 | Rentang tanggal parsial diabaikan diam-diam | `reportWhere` butuh `dateFrom` **dan** `dateTo`; mengisi salah satu tidak berefek apa pun tanpa pemberitahuan |
| 13 | Kop instansi & nama pejabat tanpa jalur pengisian | Butuh keputusan pemilik produk: dari pengaturan, atau tetap placeholder |
| 14 | `src/lib/mock-reports.ts` berisi angka karangan (378/286) dan tidak terpakai | Berisiko dipakai orang lain sebagai data nyata |

### 3. Pertanyaan yang masih terbuka dari sesi sebelumnya

Definisi "tepat waktu" memakai `completedAt <= dueAt`, jadi tugas yang selesai tepat pada detik tenggat dihitung tepat waktu. Saya pertahankan karena ringkasan atas sudah memakai definisi itu sejak sebelum audit; mengubahnya membuat ringkasan dan detail berbeda angka. Kalau kebijakan instansi menghendaki "harus sebelum tenggat", itu perubahan satu karakter (`<`), tetapi harus disengaja.
