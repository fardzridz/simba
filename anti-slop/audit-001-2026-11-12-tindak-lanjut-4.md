# Audit 001 — Tindak Lanjut Bagian 4 (temuan #10 dan #11)

Tanggal: 12 November 2026
Nomor yang dikerjakan: **10, 11**
Sudah selesai sebelumnya: 1, 2, 3, 4, 5, 6, 7, 8, 9, 12
Belum dikerjakan: 13, 14

---

## Ringkasan

Temuan #10 dan #11 ternyata bukan dua cacat terpisah. Keduanya berada di satu jalur kode yang sama, dan saat ditelusuri ada **tiga** cacat, bukan dua:

| Cacat | Dampak | Status |
|---|---|---|
| Tanggal dibaca sebagai tengah malam zona waktu **server**, bukan WIB | Batas rentang bergeser 7 jam bila server tidak di WIB | Diperbaiki |
| Label rentang dihitung dari **periode preset**, bukan rentang kustom | Angka benar untuk 15 hari, labelnya bilang sebulan penuh | Diperbaiki (baru ditemukan) |
| Rentang parsial/terbalik **diabaikan diam-diam** | Pengguna mengira filternya berlaku | Diperbaiki |

---

## Cacat 1: zona waktu server (inti #10)

**Kode lama:**

```ts
dateFrom = new Date(values.dateFrom);
dateFrom.setHours(0, 0, 0, 0);        // <-- tengah malam ZONA SERVER
dateTo = new Date(values.dateTo);
dateTo.setHours(23, 59, 59, 999);
```

`setHours` memakai zona waktu mesin yang menjalankan. Kalau server berjalan di UTC (umum untuk container dan edge), maka `2026-10-01` menjadi 1 Okt 00:00 **UTC**, bukan 1 Okt 00:00 **WIB**. Selisihnya 7 jam: tugas yang diterbitkan 1 Okt pukul 00.00 sampai 06.59 WIB akan terlempar ke hari sebelumnya dan hilang dari rentang.

**Bukti terukur.** Saya jalankan implementasi lama dan baru pada dua zona waktu:

```
TZ = Asia/Jakarta (server WIB)
  LAMA  from: 2026-09-30T17:00:00.000Z   BENAR: 2026-09-30T17:00:00.000Z   (sama)
  LAMA  to  : 2026-10-01T16:59:59.999Z   BENAR: 2026-10-01T16:59:59.000Z   (beda 999ms)

TZ = UTC (server non-WIB)
  LAMA  from: 2026-10-01T00:00:00.000Z   BENAR: 2026-09-30T17:00:00.000Z   (geser 7 jam)
  LAMA  to  : 2026-10-01T23:59:59.999Z   BENAR: 2026-10-01T16:59:59.000Z   (geser 7 jam)
```

Di mesin pengembang yang kebetulan WIB, bug ini **hampir tidak terlihat** (hanya 999ms). Itu sebabnya ia lolos sampai audit.

**Perbaikan.** Memakai helper yang sudah ada di `src/lib/time.ts` dan sudah dipakai form tenggat tugas:

```ts
const dateFromSeconds = startOfJakartaDayFromDateInput(values.dateFrom);
const dateToSeconds = endOfJakartaDayFromDateInput(values.dateTo);
```

Ini sekaligus menghapus duplikasi: modul laporan tadinya punya cara sendiri menghitung batas hari, berbeda dari sisa aplikasi.

---

## Cacat 2: label rentang tidak mengikuti rentang yang dipakai (baru ditemukan)

Ini yang paling berbahaya, dan tidak ada di laporan audit awal.

**Kode lama:**

```ts
const { from, to } = reportPeriodRange(filters.period, nowSeconds());   // selalu preset
...
rangeLabel: `${formatWibDate(from)} sampai ${formatWibDate(to - 1)}`,
```

`reportWhere` sudah benar memakai rentang kustom untuk kueri, tetapi labelnya dihitung dari periode preset. Akibatnya:

```
Filter dipilih : 1 Okt 2026 s/d 15 Okt 2026 (15 hari)
Angka          : benar, hanya 15 hari
Label LAMA     : "1 Okt 2026 sampai 31 Okt 2026"   <-- SALAH
Label BENAR    : "1 Okt 2026 sampai 15 Okt 2026"
```

Pada laporan resmi, label yang salah **lebih berbahaya daripada angka yang salah**, karena pembaca tidak punya cara mengetahui ada yang tidak cocok. Angka yang salah bisa dicurigai; label yang salah diterima sebagai keterangan.

**Perbaikan.** Satu fungsi `effectiveRange()` menjadi satu-satunya sumber untuk kueri, label, dan ekspor:

```ts
export function effectiveRange(filters, now): {
  from: number; to: number; isCustom: boolean; label: string;
}
```

`reportWhere`, `getReport`, dan `rangeLabel` semuanya memanggil fungsi itu. Secara struktural, label dan angka tidak bisa lagi menyebut rentang berbeda.

---

## Cacat 3: rentang tidak sah diabaikan diam-diam (inti #11)

**Perilaku lama:** `reportWhere` memakai rentang kustom hanya bila `filters.dateFrom && filters.dateTo`. Kalau hanya satu terisi, ia diam-diam jatuh ke periode preset. Pengguna melihat kolom tanggal terisi, mengira filternya berlaku, padahal angkanya untuk sebulan penuh.

**Perbaikan.** Tiga hal:

1. `readReportFilters` mengembalikan `rangeIssue: "partial" | "reversed" | null` supaya alasannya bisa dijelaskan.
2. Antarmuka menampilkan pesan yang menyebut apa yang sedang dipakai sebagai gantinya.
3. `ReportView` membawa `isCustomRange` dan `rangeIssue`, jadi ekspor CSV ikut jujur soal rentang yang dipakai.

Pesan yang tampil:

- **Parsial:** "Rentang tanggal belum lengkap. Isi tanggal mulai dan tanggal selesai; selama salah satu kosong, laporan memakai periode preset di atas."
- **Terbalik:** "Tanggal mulai melewati tanggal selesai, jadi rentang ini tidak dipakai. Laporan memakai periode preset di atas."

Rentang terbalik **tidak** dibalik otomatis. Membalik diam-diam akan menyembunyikan salah ketik, dan pengguna akan mendapat angka untuk rentang yang tidak pernah ia minta.

---

## Cacat tambahan yang ikut diperbaiki

### Nilai awal tombol "Custom Tanggal" memakai UTC

```diff
- update({ period: "bulan_ini", dateFrom: new Date().toISOString().split('T')[0] });
+ const today = jakartaDateInput(nowSeconds());
+ update({ period: "bulan_ini", dateFrom: today, dateTo: today });
```

Antara pukul 00.00 dan 06.59 WIB, `toISOString()` masih berada di hari sebelumnya, sehingga kolom tanggal terisi **tanggal kemarin**. Sekarang memakai kalender WIB.

### Kolom tanggal selesai menampilkan nilai palsu

```diff
- value={current.dateTo || new Date().toISOString().split('T')[0]}
+ value={current.dateTo}
```

Kolom tanggal selesai menampilkan tanggal hari ini saat `dateTo` kosong, padahal nilai itu **tidak pernah dikirim** ke server. Pengguna melihat tanggal yang tidak berlaku untuk laporannya. Sekarang nilainya dikendalikan penuh oleh state.

### Nama berkas ekspor memakai UTC

```diff
- `laporan-penugasan-custom-${new Date().toISOString().split('T')[0]}.csv`
+ `laporan-penugasan-custom-${jakartaDateInput(nowSeconds())}.csv`
```

Ekspor pukul 06.00 WIB tanggal 13 menghasilkan nama berkas bertanggal 12.

### Baris "Rentang Tanggal" di CSV diformat ulang

Dihapus. CSV sekarang memakai `report.rangeLabel` yang sama dengan layar. Sebelumnya ia memformat ulang dari objek Date dengan `toLocaleDateString`, yang bisa menghasilkan tanggal berbeda untuk rentang yang sama.

### Cast tipe yang menutupi masalah

```diff
- const transformedParams: Parameters<typeof import("...").readReportFilters>[0] =
-   params.dateFrom || params.dateTo ? { ...params, ... } : params as unknown as ...
```

Seluruh blok itu dihapus. Ia ada hanya untuk memaksa tipe cocok, dan justru menyembunyikan bahwa tanggal dikonversi bolak-balik lewat UTC. Sekarang tanggal diteruskan apa adanya sebagai `YYYY-MM-DD`.

---

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx vitest run` | **41 file, 261 tes, semua lulus** |
| `npx vitest run` dengan `TZ=UTC` | **41 file, 261 tes, lulus** |
| `npx vitest run` dengan `TZ=America/New_York` | **41 file, 261 tes, lulus** |
| `npx tsc --noEmit` | bersih |
| `npx next build` | sukses, `BUILD_ID` `RgJHvFvniEgnM0omTL23e` |
| `python build/build-tokens.py --check` | selaras |
| `toISOString`/`setHours`/`toLocaleDateString` di modul laporan | 0 (hanya tersisa di komentar penjelas) |
| Em dash di berkas yang diubah | 0 |

Menjalankan seluruh rangkaian tes di **tiga zona waktu berbeda** adalah bagian dari verifikasi, bukan tambahan. Bug ini tidak muncul di mesin WIB, jadi lulus di satu zona waktu tidak membuktikan apa pun.

### Kendali negatif: tes benar-benar menangkap bug lama

Tes yang lulus belum tentu menguji sesuatu. Untuk setiap perbaikan, saya jalankan assertion yang sama terhadap implementasi lama:

| Perbaikan | Assertion dijalankan pada kode lama | Hasil |
|---|---|---|
| Batas hari WIB | `from` = `2026-09-30T17:00:00.000Z` | **GAGAL** saat `TZ=UTC` (menghasilkan `2026-10-01T00:00:00.000Z`) |
| Label rentang | label = "1 Okt 2026 sampai 15 Okt 2026" | **GAGAL** (menghasilkan "1 Okt 2026 sampai 31 Okt 2026") |
| Nama berkas WIB | `jakartaDateInput` = `2026-10-13` | **GAGAL** (menghasilkan `2026-10-12`) |

### Tes baru

| Berkas | Tes | Yang dikunci |
|---|---|---|
| `src/db/queries/reports-date-range.test.ts` | 10 | batas 00:00:00 dan 23:59:59 WIB, hasil tidak bergantung zona mesin, rentang parsial, rentang terbalik, rentang satu hari, format tidak sah, divisi tetap terikat scope |
| `src/db/queries/reports-effective-range.test.ts` | 7 | label mengikuti rentang kustom, batas `to` eksklusif, jatuh ke preset saat tidak sah, preset dihitung dalam WIB |
| `src/db/queries/reports-export-label.test.ts` | 4 | nama berkas bertanggal WIB, label CSV satu sumber dengan layar |
| `src/lib/time-date-input.test.ts` | 5 | nilai awal WIB pada jam rawan 00.00 sampai 06.59, `formatWibDate` tidak pernah sehari lebih awal |
| `src/app/(app)/reports/reports.test.tsx` | +5 | peringatan parsial, peringatan terbalik, tidak ada peringatan saat sah, input tidak diisi tanggal palsu, label dari server |

---

## Delivery Gate

### Block 1: Hard Gate

| Rule | Status | Bukti |
|---|---|---|
| R-02 em dash | **PASS** | 0 di 10 berkas yang diubah |
| R-03 mobile | **PASS** | Peringatan memakai `basis-full` sehingga turun satu baris penuh di layar sempit, tidak memaksa gulir |
| R-17 angka tanpa sumber | **PASS** | Label rentang kini berasal dari rentang yang benar-benar dipakai kueri |
| R-18 testimoni | **PASS** | Tidak ada |
| R-23 aset | **PASS** | Tidak ada aset baru |
| R-24 navigasi mati | **PASS** | Tidak ada tautan baru |
| R-25 kontras | **PASS** | Peringatan `text-warning` `#B45309` di `bg-warning-surface` `#FEF3C7` = 4.51:1 |
| R-26 kontrol mati | **PASS** | Tombol custom benar-benar mengubah URL; input tanggal benar-benar mengirim nilainya |
| R-27 state | **PASS** | Peringatan memakai `role="status"` |
| R-28 FAQ | **PASS** | Tidak ada |
| R-32 keyboard & fokus | **PASS** | Input `type="date"` dan tombol tetap bisa dicapai keyboard dengan cincin fokus |
| R-33 patch via skrip | **PASS** | Tidak ada |
| R-34 tema | **PASS** | Tidak ada toggle tema |
| R-35 verifikasi | **PASS** | 261 tes di 3 zona waktu, `tsc` bersih, build sukses, kendali negatif dijalankan |
| R-36 klaim palsu | **PASS** | **Inti perbaikan.** Label rentang tidak lagi mengklaim cakupan yang bukan dihitung; rentang tidak sah tidak lagi tampak berlaku |
| R-37 arah desain | **PASS** | Dial ENERGY 1 / RHYTHM 2 / MOTION 1 dipertahankan |
| R-38 konten jujur | **PASS** | Antarmuka menyatakan sendiri saat filternya tidak berlaku |
| R-39 semantik & affordance | **PASS** | `role="status"` pada peringatan, label aksesibel pada kedua input |
| R-40 performa | **PASS** | Tidak ada kueri tambahan; `effectiveRange` hanya perhitungan aritmetika |

### Block 2: Purpose-Gate

| Rule | Status | Alasan tertulis |
|---|---|---|
| R-01/R-29 warna | **PASS** | Memakai token `--color-warning` dan `--color-warning-surface` |
| R-04 ikon | **PASS** | Tidak ada ikon ditambah |
| R-06 tipografi | **PASS** | `text-body-sm` (12px), di atas batas minimum |
| R-08 panah | **PASS** | Tidak ada |
| R-09 badge | **PASS** | Peringatan adalah pesan, bukan label dekoratif |
| R-14 kartu seragam | **PASS** | Peringatan menempel di baris filter, bukan kartu baru |
| R-19 animasi | **PASS** | Tidak ada animasi ditambah |
| R-31 alasan tertulis | **PASS** | Setiap cacat dijelaskan dengan bukti terukur di dokumen ini |

### Block 3: Liveliness

| Item | Status |
|---|---|
| Dial eksplisit | **PASS** — ENERGY 1 / RHYTHM 2 / MOTION 1 |
| Satu titik fokus | **PASS** — peringatan hanya muncul saat ada masalah nyata |
| Kontras hierarkis | **PASS** — peringatan `warning`, penjelasan `ink-2` |
| Whitespace sebagai struktur | **PASS** — peringatan turun baris sendiri lewat `basis-full` |
| Satu aksen | **PASS** — `primary` tetap hanya pada aksi utama |

### Block 4: Craftsmanship & Quality Locks

| Item | Status |
|---|---|
| C-1 intensionalitas | **PASS** — tiga cacat ditelusuri ke satu jalur kode, bukan ditambal terpisah |
| C-2 kelengkapan fungsional | **PASS** — filter tanggal benar-benar bekerja dan bisa diverifikasi pengguna |
| C-3 komposisi dari konten | **PASS** — pesan peringatan menyebut keadaan nyata |
| C-4 ketahanan | **PASS** — format tidak sah, rentang parsial, rentang terbalik, dan rentang satu hari semuanya ditangani |
| C-5 bukti di atas klaim | **PASS** — kendali negatif dijalankan; klaim "bug terbukti" didukung keluaran nyata |

---

## Catatan

### Sisa temuan

| # | Temuan | Catatan |
|---|---|---|
| 13 | Kop instansi & nama pejabat tanpa jalur pengisian | Butuh keputusan pemilik produk: diisi dari pengaturan, atau tetap placeholder |
| 14 | `src/lib/mock-reports.ts` berisi angka karangan (378/286), tidak terpakai | Berisiko dipakai sebagai data nyata. Kandidat dihapus |

### Satu keputusan yang saya ambil dan perlu Anda ketahui

Rentang terbalik **ditolak**, bukan dibalik otomatis. Kalau kebijakan instansi justru menghendaki pembalikan otomatis (anggap pengguna hanya salah urutan), itu perubahan kecil di `readReportFilters`. Saya memilih menolak karena membalik diam-diam menyembunyikan salah ketik.

### Pertanyaan lama yang masih terbuka

Definisi "tepat waktu" memakai `completedAt <= dueAt`, jadi tugas yang selesai tepat pada detik tenggat dihitung tepat waktu. Belum diubah karena mengubahnya membuat ringkasan dan detail berbeda angka.
