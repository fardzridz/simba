---
name: Portal Manajemen Penugasan & Dokumen Divisi: Arah Visual
version: 1.0.0-draf
date: 2026-10-17
status: draf arah, menunggu koreksi pemilik produk
dial: ENERGY 1 / RHYTHM 2 / MOTION 1
sumber: DESIGN-SYSTEM.md (token & aturan teknis) + RANCANGAN-SISTEM-v2.md (aturan bisnis)
penyusun: disusun agen dari keputusan yang sudah ada di dua dokumen di atas, bukan dari selera umum
---

# DESIGN.md

Arah rasa untuk portal ini: identitas, kepribadian, palet, tipografi, nada, dan tiga dial keaktifan. Ini lapisan paling atas dari tiga lapisan dokumen:

| Lapisan | Berkas | Isi |
|---|---|---|
| Arah rasa | `DESIGN.md` (berkas ini) | identitas, kepribadian, mood, dial, nada teks |
| Token & aturan teknis | `DESIGN-SYSTEM.md` | warna, ukuran, komponen, kontras, cetak |
| Aturan bisnis | `RANCANGAN-SISTEM-v2.md` | status, transisi, metrik, modal, otorisasi |

`antislop` bukan lapisan keempat: ia penyaring yang memastikan ketiga lapisan di atas tidak jatuh ke pola generik.

Baris bertanda **[KONFIRMASI]** adalah hal yang saya simpulkan, bukan keputusan yang sudah kamu tulis. Koreksi bagian itu dulu sebelum dokumen ini dipakai sebagai acuan.

---

## 1. Produk & siapa yang memakainya

Portal internal instansi penyelenggara pemilu. Tiga peran dalam satu kantor: staf pelaksana, admin divisi, dan super admin.

Yang nyata di meja mereka:

- **Staf**: membuka daftar tugas beberapa kali sehari, mencari "apa yang harus saya kerjakan dan kapan tenggatnya", lalu mengunggah berkas hasil kerja (scan, laporan, dokumentasi). Ponsel dipakai saat di lapangan.
- **Admin divisi**: memutuskan setuju atau minta revisi, memantau beban kerja anggotanya, menyusun laporan periode.
- **Super admin**: mengelola akun, divisi, dan kategori; memantau lintas divisi tanpa menyentuh data tugas.

Konsekuensi arah: layar harus menjawab **"apa yang perlu saya kerjakan sekarang"** dalam sekali pandang. Proyektor ruang rapat dan kertas A4 juga termasuk kanvas yang harus benar.

## 2. Kepribadian

Lima kata: **tertib, tenang, langsung, teliti, tidak birokratis berlebihan**.

- **Tertib dan teliti**: kepadatan informasi tinggi, tetapi selalu sejajar. Garis kolom, angka tabular, label satuan. Kekacauan kecil pada tabel padat terbaca sebagai sistem yang tidak bisa dipercaya.
- **Tenang**: warna disiplin. Instansi ini identik dengan merah, dan justru karena itu merah harus lebih hemat di dalam layar daripada di kop surat.
- **Langsung**: kalimat pendek, istilah kerja sehari-hari ("Kumpulkan Tugas", "Minta Revisi"), bukan istilah tabel basis data.
- **Tidak kaku**: keterbacaan adalah bentuknya. Tanpa ornamen, tanpa slogan, tanpa hiasan yang tidak mengerjakan apa pun.

Analogi yang dipakai konsisten saat ragu: **meja kerja pegawai yang sudah dirapikan sebelum pulang**. Satu berkas terbuka di depan, sisanya tersusun rapi, tidak ada yang disembunyikan.

## 3. Identitas & motif

Satu motif, diulang di seluruh aplikasi:

> **Nomor tugas sebagai benang merah.** Setiap penugasan punya nomor `HUK/2026/10/007`, dan nomor itu adalah identitas visualnya: mono, sejajar, muncul di baris tabel, kepala halaman detail, baris katalog dokumen, dan baris laporan.

Kenapa ini yang dipilih: portal ini soal **pengarsipan**, dan yang membuat arsip bisa dipercaya adalah penomoran yang konsisten, bukan ikon folder. Sekali klik kartu KPI, pengguna mendarat di daftar terfilter yang memuat nomor yang sama. Rantai bukti itu terlihat, bukan diklaim.

**Aksen tunggal**: merah `primary` hanya untuk aksi utama, penanda status kritis, dan menu aktif di sidebar. Merah tidak dipakai untuk dekorasi, judul, atau grafik yang bukan seri utama.

## 4. Palet

Rincian nilai ada di `DESIGN-SYSTEM.md` §2.1 (satu sumber kebenaran). Ringkasan maksudnya:

| Peran | Warna | Alasan |
|---|---|---|
| Permukaan | `background`, `surface`, `surface-sunken`, `border` | Netral menanggung sekitar 90% layar supaya isi tabel yang menonjol, bukan wadahnya |
| Aksen | `primary #B7091E` | Warna instansi, dipakai hemat (aksi utama, status kritis, menu aktif) |
| Navigasi | `sidebar #191B27` | Bidang gelap memisahkan navigasi dari pekerjaan tanpa perlu bayangan bertumpuk |
| Status | 5 pill status + flag `Terlambat`, `Perlu Revisi`, `Terarsip` | Status tidak pernah dibedakan warna saja; selalu ikon + teks + warna |
| Grafik | `chart-1…chart-6` | Satu seri utama memakai merah, sisanya netral dan cyan/amber/blue; tetap terbaca saat dicetak abu-abu |

Aturan dosis: maksimal **2 warna inti + 1 aksen** per layar (R-29). Warna status dan netral tidak dihitung sebagai warna inti.

## 5. Tipografi

| Peran | Pilihan | Alasan |
|---|---|---|
| Teks & judul | **Inter** (fallback `system-ui`) | Huruf untuk tabel padat pada 12-13px; bentuk angka jelas; tersedia tanpa unduh di mesin kantor |
| Angka, nomor tugas, kode aksi | **JetBrains Mono** | Nomor tugas dan kode log dibandingkan karakter per karakter; lebar seragam memudahkan pemindaian |
| Angka KPI, tenggat, hitungan | `tabular-nums` wajib | Kolom angka harus sejajar vertikal, termasuk saat "7" dan "11" bersebelahan |

Skala 12px sampai 20px dengan `display-kpi` 28px; tidak ada teks di bawah 12px (`DESIGN-SYSTEM.md` §2.2). Panjang baris paragraf maksimal 80 karakter.

## 6. Dial keaktifan

| Dial | Nilai | Alasan |
|---|---|---|
| **ENERGY** | 1 | Ini alat kerja yang dibuka 8 jam sehari. "Menyapa keras" pada alat harian berubah jadi kelelahan, bukan kesan. Referensi rasanya: alat kerja pemerintahan yang rapi, bukan halaman pemasaran |
| **RHYTHM** | 2 | Ada pecahan yang disengaja: pita KPI, lalu bidang grafik, lalu tabel. Tidak seragam, tetapi juga tidak asimetris; kepadatan yang berubah mengikuti pertanyaan pengguna ("seberapa sehat?", lalu "mana yang harus saya kerjakan?") |
| **MOTION** | 1 | Hanya state hover, fokus, dan transisi 120-160ms. Tidak ada animasi masuk, tidak ada pulsa berulang. Alasannya: tabel panjang + `prefers-reduced-motion` + pengguna harian yang sudah tahu letak segalanya |

Konsekuensi yang mengikat pada tiap layar:

- **Satu titik fokus per layar.** Dashboard: baris yang menjawab "perlu tindakan". Daftar: baris tugas yang paling mendesak (tenggat/flag). Detail: keputusan yang diminta.
- **Ruang kosong struktural**, bukan sisa: jarak 16px antar kartu dan 24px padding kontainer memisahkan kelompok informasi.
- **Satu aksen**: merah hanya pada momen kunci.
- **Motif identitas**: nomor tugas mono (§3).

## 7. Nada teks

Bahasa Indonesia kerja, kalimat perintah, tanpa basa-basi.

| Konteks | Dipakai | Dihindari |
|---|---|---|
| Tombol utama | "Kumpulkan Tugas", "Setujui & Arsipkan", "Minta Revisi", "Buat Tugas" | "Submit", "Kirim", "OK", "Lanjutkan" |
| Aksi merusak | "Batalkan Tugas" + alasan wajib | "Hapus" tanpa konteks |
| Pesan kosong | "Belum ada tugas di divisimu. Buat tugas pertama lewat tombol Buat Tugas." | "No data available" |
| Pesan galat | "Berkas lebih dari 10 MB: laporan-pleno.pdf (14,2 MB). Perkecil lalu unggah ulang." | "Terjadi kesalahan" |
| Status | Label kanonik: Belum Dikerjakan, Sedang Dikerjakan, Menunggu Verifikasi, Selesai, Dibatalkan | `SUBMITTED`, `MENUNGGU_VERIFIKASI` (kode hanya di log dan ekspor) |
| Angka | "Penugasan: 401" (satuan selalu ikut) | "401" tanpa satuan |

Kata yang dilarang muncul di antarmuka: canggih, mulus, revolusioner, terdepan, mudah sekali, tanpa batas, serta istilah asing yang sudah ada padanannya. Tidak ada tanda pisah panjang (em dash) di teks yang ditulis mesin (aturan antislop R-02).

## 8. Aturan aset & data contoh

Supaya tidak ada yang terlihat seperti data produksi padahal bukan:

- **Logo**: `[LOGO]` atau wordmark teks sampai instansi menyerahkan berkas resmi. Tidak ada logo karangan.
- **Avatar**: inisial dua huruf di lingkaran netral. Tidak ada foto orang.
- **Angka, nama, dan dokumen di wireframe/mockup**: semuanya **data contoh (seed)**, dan kepala setiap lembar memberi label "data contoh". Angka tidak pernah dipakai sebagai klaim di dokumen lain (antislop R-17, R-38).
- **Ikon**: satu set resmi 31 glif dari Microsoft Fluent System Icons (Regular), kanvas 20×20 terisi `currentColor`, disalin sekali ke `src/app/icons.tsx`. Alasan setiap glif tertulis di `DESIGN-SYSTEM.md` §7.1. Ikon selalu mendampingi teks, sehingga status tidak pernah dibedakan warna saja (R-04, §9 aturan 1). Tanpa set pustaka pihak ketiga, tanpa ikon hias, tanpa bintang atau kilau.
- **Ilustrasi**: satu keluarga bergaya "siluet perabot arsip": bentuk utama bertinta `#191B27` (warna bidang navigasi), kertas putih bergaris tegas, satu aksen merah per gambar, garis 2px, tanpa gradien, bayangan, atau figur orang. Alasannya: bentuk perabot arsip menautkan gambar ke tema kerja portal, dan tinta gelap yang sama dengan navigasi membuatnya terbaca sebagai satu keluarga dengan antarmuka. Ilustrasi stok generik (Undraw, Storyset, blob tiga dimensi) dilarang (antislop R-22). Rincian, pemetaan pemakaian, dan berkasnya di `public/ilustrasi/README.md`.

## 9. Tema

Satu tema terang dengan sidebar gelap. Alasannya: laporan dicetak, ruang kantor terang, dan dokumen yang dibaca adalah berkas pindai. Mode gelap penuh **belum** diputuskan; bila diminta, ia harus dikerjakan penuh (kontras dan cetak diuji di kedua mode), bukan dijanjikan. **[KONFIRMASI]**

## 10. Yang belum diputuskan

1. Merek resmi: logo, font instansi, dan apakah ada manual brand yang harus diikuti. **[KONFIRMASI]**
2. Apakah instansi meminta mode gelap sejak awal. **[KONFIRMASI]**
3. Nama divisi asli dan kop laporan (`RANCANGAN-SISTEM-v2.md` §12 #1 dan #11).

## 11. Cara dokumen ini dipakai

1. Arah visual dibaca dari berkas ini.
2. Token dan aturan teknis diambil dari `DESIGN-SYSTEM.md`; bila keduanya bertentangan, `DESIGN-SYSTEM.md` yang menang untuk hal teknis, dan berkas ini yang diperbaiki untuk hal rasa.
3. Aturan bisnis tetap dari `RANCANGAN-SISTEM-v2.md`.
4. Sebelum menyerahkan pekerjaan UI, jalankan Delivery Gate antislop dan lampirkan laporannya.
