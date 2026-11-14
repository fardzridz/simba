# Audit 001 — Laporan Tindak Lanjut

Tanggal: 12 November 2026
Tindak lanjut dari: `anti-slop/audit-001-2026-11-12.md`
Nomor yang dikerjakan: **1, 2, 3, 4, 5, 6, 7, 8**
Belum dikerjakan: 9, 10, 11, 12, 13, 14

---

## Status per temuan

| # | Temuan | Status | Bukti |
|---|---|---|---|
| 1 | `text-h3`/`text-h4`/`text-body-xs` tidak ada di CSS | **SELESAI** | 0 pemakaian tersisa; dipetakan ke `text-h2` / `text-body-sm` |
| 2 | "Tepat Waktu" memakai rasio selesai | **SELESAI** | Rumus kini `onTime / completed`; tes regresi baru |
| 3 | `NaN%` saat divisi tanpa penugasan | **SELESAI** | Penjaga pembagi nol, tampil `-`; tes regresi baru |
| 4 | Tiga chip status berisi `--` | **SELESAI** | Diambil dari database lewat `byStatus` |
| 5 | Enam warna Tailwind mentah | **SELESAI** | 0 warna mentah tersisa; pakai token `--color-status-*` |
| 6 | `text-green-600` kontras 3.21:1 | **SELESAI** | `text-success` = 4.88:1 PASS |
| 7 | `ink-3` di `bg-gray-100` kontras 4.39:1 | **SELESAI** | Semua chip ≥4.51:1 PASS |
| 8 | Toggle detail tanpa `aria-expanded`, label Inggris | **SELESAI** | `aria-expanded` + `aria-controls`, label Indonesia |

---

## Rincian perubahan

### `src/db/queries/reports.ts` (+23 baris)

`ReportDivisionRow` sekarang membawa data yang sebelumnya dihitung lalu dibuang:

```ts
onTime: number;                    // penyebut persentase ketepatan waktu
byStatus: {
  belumDikerjakan: number;
  sedangDikerjakan: number;
  menungguVerifikasi: number;
};
```

Tiga kolom agregat baru diambil dari kueri yang **sama** dengan metrik lain, memakai `whereClause` yang sama. Ini penting: tidak ada kueri tambahan dan tidak ada rumus berbeda, jadi angka layar, angka ekspor, dan angka detail tetap satu sumber. Divisi tanpa data tetap mendapat `0` lewat cabang `?? { ... }` yang sudah ada.

### `src/app/(app)/reports/reports-client.tsx`

**Tipografi (temuan 1).** `text-h3` → `text-h2` (15px/600), `text-h4` → `text-h2`, `text-body-xs` → `text-body-sm` (12px). Ketiganya tidak pernah ada di skala `DESIGN-SYSTEM.md` §2.2, jadi perbaikannya memetakan ke skala resmi, bukan menambah token baru. `design/tokens.css` **tidak diubah**, dan `python build/build-tokens.py --check` tetap lulus.

**Angka (temuan 2, 3).**

```diff
- {Math.round((row.completed / row.totalAssignments) * 100)}%
+ {row.completed > 0 ? `${Math.round((row.onTime / row.completed) * 100)}%` : "-"}
+ <span className="text-body-sm text-ink-3">
+   {row.onTime} dari {row.completed} selesai
+ </span>
```

Pada data uji audit (12 tugas, 7 selesai, 6 tepat waktu) angka berubah dari **58%** menjadi **86%**, dan sublabel menyebut pembilang serta penyebutnya sehingga pembaca bisa memverifikasi sendiri. Penjaga pembagi nol menghapus `NaN`.

**Chip status (temuan 4, 5, 6, 7).**

```diff
- bg-gray-100 text-body-xs text-ink-2   Belum Dikerjakan: --
+ bg-status-belum-surface text-body-sm text-status-belum-text   Belum Dikerjakan: {row.byStatus.belumDikerjakan}
```

Empat chip kini membaca token `--color-status-*-surface` / `-text` yang sudah ada di `DESIGN-SYSTEM.md` §2.1, jadi tiap pasangan sudah punya entri rasio resmi. `text-green-600` dan `text-red-600` diganti `text-success` dan `text-error`.

**Kontrol detail (temuan 8).** Baris tabel punya **dua** tombol kembar untuk aksi yang sama (glyph `▶`/`▼` di kolom pertama dan tautan "Lihat Detail" di kolom terakhir). Kolom glyph dihapus, menyisakan satu kontrol:

```tsx
<button
  type="button"
  onClick={() => toggleRowExpansion(row.divisionId)}
  aria-expanded={expandedRow === row.divisionId}
  aria-controls={`detail-${row.divisionId}`}
  className="text-body-sm font-semibold text-primary hover:underline"
>
  {expandedRow === row.divisionId ? "Tutup detail" : "Lihat detail"}
</button>
```

Baris detail diberi `id={`detail-${row.divisionId}`}` sehingga `aria-controls` menunjuk elemen nyata. Glyph karakter diganti teks karena `DESIGN-SYSTEM.md` §7.1 melarang ikon menggantikan label ("Ikon selalu berdampingan dengan teks... Tidak ada ikon yang menggantikan label"), dan karena tidak ada glif panah/triangle di 31 glif resmi.

### Tes

`src/app/(app)/reports/reports.test.tsx` — fixture diperbarui, dua tes ditambah:
- kontrol detail menyatakan `aria-expanded="false"`, `aria-controls`, label Indonesia, tanpa `Collapse`
- divisi tanpa penugasan tidak menghasilkan `NaN`

`src/app/(app)/reports/on-time.test.ts` (baru, 3 tes) — mengunci rumus:
- `onTimePercent(6, 7)` = `86%`, dan bukan `58%`
- `onTimePercent(0, 0)` = `-`, tanpa `NaN`
- batas `0%` dan `100%`

---

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx vitest run` (seluruh repo) | **31 file, 183 tes, semua lulus** |
| `npx tsc --noEmit` | bersih, tanpa galat |
| `npx next build` | sukses, 25 rute terbentuk, termasuk `/reports` dan `/reports/export` |
| `python build/build-tokens.py --check` | `design/tokens.css selaras dengan DESIGN-SYSTEM.md` |
| Kelas tak terdefinisi di `reports-client.tsx` | 0 (`text-h3`, `text-h4`, `text-body-xs` sudah tidak dipakai) |
| Warna Tailwind mentah di `reports-client.tsx` | 0 |
| Kontras seluruh pasangan baru (diukur) | semua PASS, terendah 4.51:1 |

### Rasio kontras terukur

| Pasangan | Rasio | Normal text (4.5:1) |
|---|---|---|
| `text-success` `#15803D` di detail expand | 4.88:1 | PASS |
| `text-error` `#B91C1C` di detail expand | 6.29:1 | PASS |
| chip belum `#0E7490` di `#CFFAFE` | 4.79:1 | PASS |
| chip sedang `#1D4ED8` di `#DBEAFE` | 5.49:1 | PASS |
| chip menunggu `#B45309` di `#FEF3C7` | **4.51:1** | PASS (batas tipis) |
| chip selesai `#15803D` di `#DCFCE7` | 4.57:1 | PASS |

Catatan pada chip menunggu: 4.51:1 hanya 0.01 di atas ambang. Pasangan ini berasal dari token resmi `DESIGN-SYSTEM.md` §2.1, jadi tidak saya ubah tanpa persetujuan, tapi kalau nanti token itu digeser sedikit saja, ia akan gagal.

---

## Delivery Gate

Mode `after`, jadi gate dijalankan sebagai pemeriksaan hasil perbaikan.

### Block 1: Hard Gate

| Rule | Status | Bukti |
|---|---|---|
| R-02 em dash | **PASS** | Tidak ada `—` di berkas yang diubah; diverifikasi dengan pencarian karakter U+2014 |
| R-03 mobile | **PASS** | Tidak ada perubahan struktur grid; kolom tabel berkurang satu sehingga justru lebih longgar di layar sempit |
| R-17 angka tanpa sumber | **PASS** | Semua angka dari kueri; sublabel menyebut pembilang/penyebut |
| R-18 testimoni | **PASS** | Tidak ada |
| R-23 aset tanpa konfirmasi | **PASS** | Tidak ada aset baru dibuat |
| R-24 navigasi mati | **PASS** | Tidak diubah; tautan tetap menuju rute nyata |
| R-25 kontras | **PASS** | Enam pasangan diukur, semua ≥4.5:1 (tabel di atas) |
| R-26 kontrol mati | **PASS** | Tombol detail tetap berfungsi; kontrol duplikat dihapus |
| R-27 state | **TIDAK BERLAKU** | Temuan 9 (`loading.tsx`/`error.tsx`) belum dikerjakan, sesuai cakupan |
| R-28 FAQ | **PASS** | Tidak ada |
| R-32 keyboard & fokus | **PASS** | Toggle kini `<button type="button">` dengan `aria-expanded`; cincin fokus dari `globals.css` tetap berlaku |
| R-33 patch via skrip | **PASS** | Tidak ada skrip penulisan ulang |
| R-34 tema | **PASS** | Tidak ada toggle tema di modul ini |
| R-35 verifikasi | **PASS** | `vitest` 183 lulus, `tsc` bersih, `next build` sukses |
| R-36 klaim palsu | **PASS** | Tidak ada klaim baru |
| R-37 arah desain | **PASS** | `DESIGN.md` dibaca; dial ENERGY 1 / RHYTHM 2 / MOTION 1 dipertahankan |
| R-38 konten jujur | **PASS** | `--` diganti angka nyata; angka palsu tidak ditambah |
| R-39 semantik & affordance | **PASS** | Nama aksesibel dari teks tombol; `aria-controls` menunjuk `id` nyata; `cursor: pointer` dari `globals.css` |
| R-40 performa | **PASS** | Tidak ada media baru; tidak ada angka performa dilaporkan |

### Block 2: Purpose-Gate

| Rule | Status | Alasan tertulis |
|---|---|---|
| R-01/R-29 warna | **PASS** | Warna chip diambil dari token status resmi, bukan palet baru |
| R-04 ikon | **PASS** | Tidak ada ikon baru; glyph dekoratif justru dihapus |
| R-06 tipografi | **PASS** | Memakai skala resmi §2.2; tidak ada ukuran di bawah 12px |
| R-08 panah | **PASS** | Tidak ada |
| R-09 badge | **PASS** | Chip status menandai status nyata, bukan label dekoratif |
| R-10/R-12/R-13 glass, shadow, glow | **PASS** | Tidak diubah |
| R-14 kartu seragam | **PASS** | Grid detail mengikuti hierarki konten yang sudah ada |
| R-19 animasi | **PASS** | Tidak ada animasi ditambah; sesuai MOTION 1 |
| R-22 ilustrasi | **PASS** | Tidak ada |
| R-31 alasan tertulis | **PASS** | Setiap perubahan punya alasan di dokumen ini |

### Block 3: Liveliness

| Item | Status |
|---|---|
| Dial eksplisit | **PASS** — ENERGY 1 / RHYTHM 2 / MOTION 1 dari `DESIGN.md` |
| Satu titik fokus per layar | **PASS** — ringkasan periode tetap fokus utama |
| Kontras hierarkis | **PASS** — label `ink-3`, nilai `ink`/`success`/`error` |
| Whitespace sebagai struktur | **PASS** — tidak diubah |
| Satu aksen | **PASS** — `primary` hanya pada aksi dan tautan |
| Motif identitas | **PASS** — garis merah Bawaslu pada `border-l-4 border-primary` |

### Block 4: Craftsmanship & Quality Locks

| Item | Status |
|---|---|
| C-1 intensionalitas | **PASS** |
| C-2 kelengkapan fungsional | **PASS** — kontrol duplikat dihapus, satu kontrol bekerja |
| C-3 komposisi dari konten | **PASS** — chip status kini membawa data nyata |
| C-4 ketahanan | **PASS** — pembagi nol ditangani; state data kosong tetap terender |
| C-5 bukti di atas klaim | **PASS** — angka dapat diverifikasi dari sublabel |
| R-05/R-11/R-15/R-16/R-20/R-21/R-30 | **PASS** — tidak ada struktur atau palet baru |

---

## Yang belum dikerjakan dan alasannya

Nomor **9 sampai 14** sengaja tidak disentuh karena Anda menyetujui 1 sampai 8, dan mode `after` melarang menyentuh nomor yang tidak disebut.

Yang paling perlu keputusan Anda berikutnya:

- **#9** `loading.tsx` / `error.tsx` — dampak terbesar yang tersisa. Tanpa ini, layar kosong tidak bisa dibedakan dari "tidak ada data".
- **#12** "Export Excel" yang menghasilkan CSV — salah label pada dokumen yang dipakai untuk laporan resmi.
- **#2 lanjutan** — angka "Tepat Waktu" di ringkasan atas sudah benar sejak awal (`summary.onTime`), dan sekarang detail divisi ikut benar. Tapi CSV tidak memuat kolom tepat waktu per divisi, hanya total. Kalau rekap per divisi dibutuhkan di berkas ekspor, itu pekerjaan terpisah.

## Satu hal yang perlu Anda putuskan

Rumus ketepatan waktu memakai `completedAt <= dueAt` (kueri baris 235). Artinya tugas yang selesai **tepat pada detik tenggat** dihitung tepat waktu. Saya mempertahankan definisi itu karena sudah dipakai ringkasan atas sejak sebelum audit, dan mengubahnya akan membuat angka ringkasan dan detail berbeda. Kalau kebijakan instansi menghendaki "harus sebelum tenggat", itu perubahan satu karakter (`<`) tapi harus disengaja, bukan efek samping.
