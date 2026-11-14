# Audit 001 Tindak Lanjut Bagian 6 (tiga mock sisa + fixture tes)

Tanggal: 12 November 2026
Nomor yang dikerjakan: lanjutan **#14** (pembersihan modul mock tak terpakai)
Sudah selesai sebelumnya: 1 sampai 14
Sisa temuan dari audit awal: **tidak ada**

---

## Ringkasan

Laporan bagian 5 mencatat tiga berkas mock yang tidak terpakai tapi belum dihapus, karena saat itu
hanya #14 (`mock-reports.ts`) yang disetujui. Ketiganya kini dihapus. Saat dihapus, muncul satu
masalah yang tidak terlihat sebelumnya: **dua berkas tes memakai salah satu mock itu sebagai
fixture**, sehingga modul tersebut ternyata bukan kode mati sepenuhnya.

| Berkas | Baris | Isi karangan | Status |
|---|---|---|---|
| `src/lib/mock-master.ts` | 205 | nama pengguna, tanggal login, jumlah anggota divisi | Dihapus |
| `src/lib/mock-settings.ts` | 87 | batas berkas, surel kontak divisi | Dihapus |
| `src/lib/mock-task-detail.ts` | 176 | tenggat, versi dokumen, ukuran berkas | Dihapus, diganti fixture tes |

Total 468 baris data karangan keluar dari `src/lib/`. Folder `src/lib` kini tidak lagi memuat
berkas bernama `mock*`.

---

## Cacat 1: tiga modul data karangan tinggal di samping kode produksi

**Kondisi lama.** Ketiga berkas berada di `src/lib/`, satu folder dengan `time.ts`, `status.ts`,
dan `report-letterhead.ts` yang benar-benar dipakai aplikasi. Rute yang bersangkutan sudah
memakai data nyata dari basis data:

| Mock | Rute yang dulu memakainya | Sumber nyata sekarang |
|---|---|---|
| `mock-master.ts` | `/master` | `src/db/queries/master.ts` |
| `mock-settings.ts` | `/settings` | `src/db/queries/settings.ts` |
| `mock-task-detail.ts` | `/tasks/[id]` | `src/db/queries/task-detail.ts` |

Tipe di dalamnya juga sudah **menyimpang** dari tipe nyata, dan penyimpangan itu sendiri adalah
risiko: orang yang membuka `mock-master.ts` akan mengira `MasterUser` tidak punya `nip` dan
`divisionId`, padahal tipe aslinya punya keduanya.

```
mock-master.ts    MasterUser   { id, fullName, username, email, divisionName, divisionCode, role, roleLabel, isActive, lastLoginFormatted }
master.ts         MasterUser   { ...idem, nip: string | null, divisionId: string, ... }
```

Berkas bernama `mock-` di folder pustaka mudah disangka sumber data sungguhan, terutama oleh
orang yang baru bergabung. Itu alasan yang sama dengan penghapusan `mock-reports.ts` pada #14.

**Perbaikan.** Ketiganya dihapus (`git rm`). Sebelum dihapus, pemakaiannya diperiksa dengan dua
cara: pencarian impor statis di seluruh `src` dan `tests`, lalu pencarian impor dinamis
(`import(...)` / `require(...)`) untuk menutup jalur yang tidak terlihat oleh pencarian teks
biasa. Tidak ada satu pun pemakaian di kode produksi.

---

## Cacat 2: dua tes memakai mock sebagai fixture (baru ditemukan)

Ini yang membuat penghapusan tidak sesederhana `git rm`.

**Bukti:**

```tsx
// src/app/(app)/tasks/[id]/task-detail.test.tsx
import { getMockTaskDetail } from "@/lib/mock-task-detail";
const task = getMockTaskDetail("tsk_huk_1");

// src/app/(app)/tasks/[id]/task-review.test.tsx
import { getMockTaskDetail } from "@/lib/mock-task-detail";
const task = getMockTaskDetail("tsk_huk_3");
```

Kedua komponen yang diuji (`TaskDetailClient`, `TaskReviewClient`) bertipe `initialTask: TaskDetail`
dari `src/db/queries/task-detail.ts`. Jadi tes ini selama ini **memberi komponen data bertipe mock**,
lalu lolos karena `MockTaskDetail` kebetulan superset dari yang dibaca komponen. Bila tipe
`TaskDetail` asli berubah, tes ini tidak akan ikut gagal, karena tidak pernah menyentuh tipe asli.

**Kenapa pencarian pertama saya melewatkannya.** Pencarian pertama saya jalankan dengan
`Select-String` pada daftar berkas di `src` dan `tests`. Folder `[id]` dibaca PowerShell sebagai
pola wildcard, sehingga berkas di dalamnya **tidak ikut diperiksa** dan hasilnya tampak bersih.
Yang menangkapnya adalah `tsc`, bukan pencarian teks:

```
src/app/(app)/tasks/[id]/task-detail.test.tsx(4,35): error TS2307: Cannot find module '@/lib/mock-task-detail'
src/app/(app)/tasks/[id]/task-review.test.tsx(4,35): error TS2307: Cannot find module '@/lib/mock-task-detail'
```

Saya catat ini karena menunjukkan bahwa "tidak ada pemakai" adalah klaim yang bisa salah, dan yang
membuktikannya salah adalah pemeriksaan tipe, bukan pencarian teks.

**Perbaikan.** Dibuat `src/app/(app)/tasks/[id]/task-detail.fixture.ts`, bertipe `TaskDetail` asli,
berisi tiga keadaan yang benar-benar dipakai tes:

| Ekspor | Keadaan |
|---|---|
| `TASK_DETAIL_REVISI` | sudah mengumpulkan, diminta revisi, ada catatan admin |
| `TASK_DETAIL_BELUM_DIMULAI` | belum dikerjakan, tanpa riwayat pengumpulan |
| `TASK_DETAIL_MENUNGGU_VERIFIKASI` | menunggu verifikasi admin, terlambat, ada satu pengumpulan |

Letaknya di samping tes, bukan di `src/lib/`, dan namanya berakhiran `.fixture.ts` yang tidak cocok
dengan pola `vitest.config.ts` (`src/**/*.test.{ts,tsx}`), jadi ia tidak pernah dijalankan sebagai
suite. Kode produksi tidak mengimpor berkas ini sama sekali; sudah diperiksa, satu-satunya
kemunculan kata "fixture" di kode non-tes adalah di dalam berkas fixture itu sendiri.

Isi datanya diambil dari mock lama supaya assertion yang ada tetap sah dan tidak ada cakupan tes
yang hilang. Jumlah tes tidak berubah: 5 di `task-detail.test.tsx`, 3 di `task-review.test.tsx`.

---

## Cacat 3: satu tes menguji modul mock, bukan komponen

**Kondisi lama:**

```tsx
it("menghasilkan data fallback yang aman untuk id tugas acak", () => {
  const task = getMockTaskDetail("tsk_acak_999");
  expect(task.id).toBe("tsk_acak_999");
  expect(task.taskNumber).toContain("HUK/2026/10/999");
  expect(task.title).toBeDefined();
});
```

Tes ini tidak menyentuh komponen apa pun. Yang diuji adalah `getMockTaskDetail` beserta perilaku
fallback-nya. Begitu modulnya dihapus, tesnya tidak punya arti lagi, dan **tidak ada perilaku
aplikasi yang hilang** karenanya.

**Perbaikan.** Diganti tes yang menguji keadaan nyata yang mungkin terjadi: tugas tanpa riwayat
pengumpulan harus menampilkan kartu kosong yang menjelaskan keadaannya, bukan kartu yang hilang
tanpa penjelasan.

### Satu koreksi terhadap pekerjaan saya sendiri

Versi pertama tes pengganti itu saya tulis dengan assertion `not.toContain("Riwayat Pengumpulan")`.
Tes gagal, dan yang salah adalah assertion saya, bukan komponennya:

```
AssertionError: expected '<div class="flex flex-col gap-6"><div…' not to contain 'Riwayat Pengumpulan'
```

Komponen memang sengaja tetap menampilkan kartu itu dengan keadaan kosong:

```
Belum ada berkas pengumpulan
Kerjakan tugas ini lalu kirimkan berkas melalui tombol Kumpulkan Tugas.
```

Menghilangkan kartunya akan membuat pengguna tidak tahu apakah tugas ini belum pernah dikumpulkan
atau bagian riwayatnya rusak. Assertion saya perbaiki menjadi mengunci keadaan kosong yang jujur
itu. Saya catat kegagalan ini di laporan supaya tidak terbaca seolah tes baru langsung hijau.

---

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx vitest run` (TZ `Asia/Jakarta`) | **45 file, 305 tes, semua lulus** |
| `npx vitest run` (TZ `UTC`) | 45 file, 305 tes, lulus |
| `npx vitest run` (TZ `America/New_York`) | 45 file, 305 tes, lulus |
| `npx tsc --noEmit` | bersih |
| `npx next build` | sukses, `BUILD_ID` `5kSPxDX-6Oa1KT87w3onB` |
| `python build/build-tokens.py --check` | selaras |
| Berkas `mock*` di `src` | 0 |
| Impor `mock-` di `src` dan `tests` | 0 |
| Impor dinamis (`import(...)`/`require(...)`) yang menyebut mock | 0 |
| Kode produksi yang mengimpor berkas `*.fixture.ts` | 0 |
| Em dash di tiga berkas yang diubah/dibuat | 0 |

Jumlah tes tetap 305 karena penggantian fixture tidak menambah atau mengurangi kasus uji; yang
berubah adalah sumber datanya, dari tipe mock menjadi tipe asli.

### Kendali negatif: tes benar-benar menangkap kesalahan

| Yang diuji | Perlakuan | Hasil |
|---|---|---|
| Fixture bertipe `TaskDetail` asli mengunci bentuk data | Satu bidang wajib (`createdByName`) dihapus dari fixture | **GAGAL** seperti seharusnya: `TS2741: Property 'createdByName' is missing ... but required in type 'TaskDetail'`, muncul di ketiga ekspor |
| Tes keadaan kosong mengunci perilaku komponen | Teks `"Belum ada berkas pengumpulan"` dirusak menjadi `"Belum ada berkas"` di komponen | **GAGAL** seperti seharusnya: `expected ... to contain 'Belum ada berkas pengumpulan'` |

Keduanya dipulihkan setelah dijalankan. `git diff` pada `task-detail-client.tsx` kosong, jadi
komponen tidak ikut berubah karena kendali negatif ini.

Kendali negatif pertama adalah inti penggantian fixture: dengan tipe mock yang lama, menghapus
bidang wajib dari data uji **tidak akan menghasilkan galat apa pun**, karena yang mengikat data itu
adalah tipe mock, bukan tipe aplikasi.

---

## Delivery Gate

### Block 1: Hard Gate

| Rule | Status | Bukti |
|---|---|---|
| R-02 em dash | **PASS** | 0 di tiga berkas yang diubah/dibuat |
| R-03 mobile | **PASS** | Tidak ada perubahan tata letak |
| R-17 angka tanpa sumber | **PASS** | Angka di fixture adalah data uji bertanda jelas sebagai fixture, bukan angka yang tampil di aplikasi |
| R-18 testimoni | **PASS** | Tidak ada |
| R-23 aset | **PASS** | Tidak ada aset baru |
| R-24 navigasi mati | **PASS** | Tidak ada tautan baru |
| R-25 kontras | **PASS** | Tidak ada warna disentuh |
| R-26 kontrol mati | **PASS** | Tidak ada kontrol baru; justru kode mati yang dihapus |
| R-27 state | **PASS** | Tidak ada state baru |
| R-28 FAQ | **PASS** | Tidak ada |
| R-32 keyboard & fokus | **PASS** | Tidak ada komponen antarmuka yang berubah |
| R-33 patch via skrip | **PASS** | Berkas ditulis lewat alat tulis berkas; skrip hanya dipakai untuk membaca data lama dan memulihkan berkas setelah kendali negatif, dan hasilnya diperiksa dengan `git diff` |
| R-34 tema | **PASS** | Tidak ada toggle tema |
| R-35 verifikasi | **PASS** | 305 tes di 3 zona waktu, `tsc` bersih, build sukses, dua kendali negatif dijalankan dan dipulihkan |
| R-36 klaim palsu | **PASS** | **Inti perubahan.** 468 baris data karangan keluar dari `src/lib/`; tes tidak lagi menguji tipe mock yang tidak dipakai aplikasi |
| R-37 arah desain | **PASS** | Tidak ada perubahan visual |
| R-38 konten jujur | **PASS** | Fixture berlabel jelas sebagai data uji dan hanya dipakai tes |
| R-39 semantik & affordance | **PASS** | Tidak ada elemen antarmuka berubah |
| R-40 performa | **PASS** | Berkas yang dihapus tidak pernah masuk bundel karena tidak diimpor |

### Block 2: Purpose-Gate

| Rule | Status | Alasan tertulis |
|---|---|---|
| R-01/R-29 warna | **PASS** | Tidak ada warna disentuh |
| R-04 ikon | **PASS** | Tidak ada ikon baru |
| R-06 tipografi | **PASS** | Tidak ada ukuran teks berubah |
| R-08 panah | **PASS** | Tidak ada |
| R-09 badge | **PASS** | Tidak ada |
| R-14 kartu seragam | **PASS** | Tidak ada kartu baru |
| R-19 animasi | **PASS** | Tidak ada animasi |
| R-31 alasan tertulis | **PASS** | Tiga cacat dijelaskan dengan potongan kode dan keluaran galat sebenarnya |

### Block 3: Liveliness

| Item | Status |
|---|---|
| Dial eksplisit | **PASS**: tidak ada perubahan dial; tetap ENERGY 1 / RHYTHM 2 / MOTION 1 |
| Satu titik fokus | **PASS**: tidak ada elemen baru yang tampil |
| Kontras hierarkis | **PASS**: tidak berubah |
| Whitespace sebagai struktur | **PASS**: tidak berubah |
| Satu aksen | **PASS**: tidak berubah |

### Block 4: Craftsmanship & Quality Locks

| Item | Status |
|---|---|
| C-1 intensionalitas | **PASS**: tiga berkas dihapus karena satu sebab yang sama (data karangan di folder pustaka), bukan karena "kelihatan tidak dipakai" |
| C-2 kelengkapan fungsional | **PASS**: penghapusan tidak mengurangi cakupan tes; 305 tes tetap, kini bersandar pada tipe asli |
| C-3 komposisi dari konten | **PASS**: fixture hanya memuat tiga keadaan yang benar-benar dipakai tes, bukan seluruh isi mock lama |
| C-4 ketahanan | **PASS**: fixture bertipe `TaskDetail` membuat perubahan tipe aplikasi langsung menggagalkan `tsc` di data uji |
| C-5 bukti di atas klaim | **PASS**: klaim "tidak ada pemakai" awalnya salah dan terbukti salah lewat `tsc`; dua kendali negatif dijalankan dan dipulihkan |

---

## Catatan

### Kesalahan proses yang perlu diingat

Pencarian pemakaian dengan `Select-String` melewatkan berkas di folder `[id]` karena PowerShell
membacanya sebagai wildcard. Untuk folder semacam ini, pencarian wajib memakai `-LiteralPath`, dan
`tsc` harus dijalankan sebagai jaring pengaman sebelum menyimpulkan "tidak ada pemakai". Saya tidak
mengubah skrip apa pun untuk itu karena ini kebiasaan kerja, bukan cacat aplikasi.

### Batas yang perlu diketahui

1. **Fixture tetap memuat nama orang karangan** (`Ahmad Fauzi`, `Siti Rahma`, dan seterusnya).
   Itu disengaja: data uji butuh nilai yang bisa diperiksa assertion-nya. Bedanya dengan kondisi
   lama, berkasnya kini berakhiran `.fixture.ts`, berada di samping tes, dan menyatakan dirinya
   sebagai data uji di kepala berkas. Tidak ada kode produksi yang bisa mengimpornya tanpa
   sengaja menulis impor dari folder tes.
2. **Beberapa rute belum punya `loading.tsx`/`error.tsx`**: `/account`, `/master`,
   `/notifications`, `/settings`, `/tasks/new`, `/tasks/[id]`, `/tasks/[id]/edit`. Catatan:
   `/login` sebaiknya **tidak** diberi `error.tsx` rute. Ini di luar lingkup laporan dan belum
   dikerjakan.

### Satu pertanyaan yang masih terbuka

Definisi "tepat waktu" masih `completedAt <= dueAt`, sehingga tugas yang selesai tepat pada detik
tenggat dihitung tepat waktu. Belum diubah karena mengubahnya membuat ringkasan dan detail
berbeda angka. Menunggu keputusan.
