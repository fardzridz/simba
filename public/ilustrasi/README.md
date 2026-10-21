# Ilustrasi

Keluarga ilustrasi untuk portal ini. Bukan ikon, bukan ilustrasi stok: setiap gambar menggambarkan objek nyata dari alur kerja pengarsipan, dan alasannya tertulis di bawah.

## Gaya yang mengikat

| Aspek | Aturan |
|---|---|
| Bentuk utama | Siluet perabot arsip bertinta `#191B27` (warna bidang navigasi), supaya ilustrasi senada dengan rangka aplikasi |
| Kertas dan berkas | Putih `#FFFFFF` dengan garis `#111827` setebal 2px |
| Netral | `#E5E7EB` dan `#D1D5DB` hanya untuk bentuk yang tidak membawa arti |
| Aksen | `#B7091E` maksimal satu kali per gambar, dan selalu untuk hal yang bermakna (map milik divisi, garis batas cakupan) |
| Larangan | Gradien, bayangan, glow, figur orang, wajah, emoji, teks di dalam gambar, dan bentuk melengkung tiga dimensi |
| Kanvas | `320 x 200`, `viewBox` sama, `role="img"` |
| Wajib disertakan | `<title>` nama gambar dan `<desc>` berisi alasan keberadaannya |
| Sisi gelap | Latar tembus pandang; ilustrasi dipakai di atas `#FFFFFF` atau `#F9FAFB` |

Gaya ini dipilih karena dua alasan yang bisa ditulis satu baris: bentuk perabot arsip menautkan ilustrasi ke tema kerja portal ini, dan tinta gelap dari bidang navigasi membuatnya terbaca sebagai satu keluarga dengan antarmuka, bukan gambar tempelan.

## Berkas

| Berkas | Dipakai di | Alasan satu baris |
|---|---|---|
| `kosong-tugas.svg` | Keadaan kosong `L06` Tugas Saya, kartu `Perlu Tindakan` saat belum ada tugas | Layar ini kosong karena belum ada tugas yang ditugaskan, jadi yang digambar adalah baki berkas dengan slot tugas yang menunggu |
| `kosong-rak.svg` | Keadaan kosong `L09` Tugas Divisi dan `L13` Katalog Dokumen | Yang kosong di sana adalah isi rak divisi, jadi yang digambar adalah rak dengan slot yang belum terisi berkas |
| `kosong-notifikasi.svg` | Keadaan kosong `L16` Notifikasi | Yang kosong di layar itu adalah kotak masuk, jadi yang digambar adalah slot kotak notifikasi dengan surat yang masih dalam perjalanan |
| `tanpa-akses.svg` | Keadaan tanpa akses pada daftar dan layar `state-403.svg` | Yang membedakan halaman ini adalah batas cakupan divisi, jadi yang digambar adalah garis batas dengan lemari arsip di seberangnya |
| `galat-muat.svg` | Keadaan galat daftar dan katalog | Yang terjadi pada keadaan ini adalah berkas gagal masuk ke rak, jadi yang digambar adalah kartu yang jatuh di luar slotnya |
Lima gambar ini menutup seluruh layar yang benar-benar membutuhkan ilustrasi. Tiga gambar yang sempat direncanakan **sengaja tidak digambar**, karena tempatnya sudah dijawab teks dan ilustrasi di sana hanya akan jadi hiasan (antislop R-22, R-27):

| Tidak digambar | Alasan |
|---|---|
| Kartu tenggat dekat di dashboard | Kartu itu sudah memuat nomor tugas, sisa waktu, dan tombol aksi; ilustrasi akan bersaing dengan angka yang justru dicari |
| Konfirmasi tugas selesai dan terarsip | Modal `done` pada `L08` sudah menyebut nomor versi dan status baru; gambar map masuk rak tidak menambah informasi |
| Panel merek di layar masuk | `L01` menggambar satu kartu terpusat tanpa rangka samping, jadi tidak ada tempat yang menjawab pertanyaan pengguna; berkas `login.svg` sempat dibuat lalu dihapus (antislop R-22) |

## Pakai di kode

```tsx
<Image src="/ilustrasi/kosong-tugas.svg" alt="" width={320} height={200} aria-hidden="true" />
```

Aturan pemakaian: ilustrasi selalu berdampingan dengan kalimat keadaan dari `wireframe/WIREFRAME-UIUX.md` §5 yang menyebut sebab dan aksi berikutnya. Ilustrasi tidak pernah berdiri sendiri sebagai pengganti penjelasan (antislop R-27).
