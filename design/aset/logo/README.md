# Aset logo (sumber ukuran penuh)

`public/logo/` hanya berisi versi siap web; berkas di sini adalah salinan
ukuran asli dari sumber desain untuk regenerasi berikutnya.

| Berkas sumber | Berkas web di `public/logo/` | Pemakaian |
|---|---|---|
| `logo-web-bawaslu.png` (2698x720) | `logo-bawaslu.png` (360x96, tinggi 3x) | Halaman login |
| `logo-web-bawaslu-ikon.png` (588x647) | `logo-bawaslu-ikon.png` (87x96, tinggi 3x) | Sidebar desktop + drawer seluler |

Tinggi web 96px adalah 3x dari tinggi tampilan 32px (`h-8`) supaya tajam
sampai layar bertepatan plasma 3x. Ukuran ulang dilakukan sekali dengan
System.Drawing (bicubic) dan hasilnya dikomit; CI tidak pernah menjalankan
ulang proses ini. Aset asli sengaja bertapak di `design/` (bukan `public/`)
supaya tidak ikut berkas statis deployment.
