import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SettingsClient from "./settings-client";

describe("Pengaturan Operasional L18 (wireframe L18-pengaturan.svg & L18-pengaturan-sistem.svg)", () => {
  it("merender tab Divisi untuk Admin Divisi dengan pembatasan hanya divisi sendiri", () => {
    const html = renderToStaticMarkup(
      <SettingsClient role="ADMIN" userDivisionId="div_hukum" />,
    );

    // Judul dan subjudul
    expect(html).toContain("Pengaturan");
    expect(html).toContain("Kontak divisi dan nilai awal form tugas.");

    // Tab Divisi aktif, Tab Sistem TIDAK tampil untuk Admin Divisi
    expect(html).toContain("Divisi");
    expect(html).not.toContain("Sistem</button>");

    // Kartu Identitas Divisi
    expect(html).toContain("Identitas divisi");
    expect(html).toContain("Hanya divisi ini");
    expect(html).toContain("Nama divisi");
    expect(html).toContain("Hukum &amp; Sengketa");
    expect(html).toContain("Kode divisi");
    expect(html).toContain("HUK");
    expect(html).toContain("Kepala divisi");
    expect(html).toContain("Ahmad Fauzi");

    // Input kontak divisi dan catatan fungsi Reply-To
    expect(html).toContain("Kontak divisi");
    expect(html).toContain("hukum@bawaslu-pasuruan.go.id");
    expect(html).toContain("Identitas diubah di Kelola Master; kontak menjadi Reply-To email divisi.");

    // Kartu Nilai Awal Form Tugas
    expect(html).toContain("Nilai awal form tugas");
    expect(html).toContain("Kategori default");
    expect(html).toContain("Prioritas default");
    expect(html).toContain("Dipakai saat Admin membuka form tugas baru.");
    expect(html).toContain("Tenggat selalu disimpan sampai 23:59:59 WIB.");

    // Tombol aksi dan catatan kaki
    expect(html).toContain("Batal");
    expect(html).toContain("Simpan Pengaturan");
    expect(html).toContain("Tab Sistem hanya tampil untuk Super Admin.");
    expect(html).toContain("Nilai awal hanya mengisi form; tidak mengubah tugas yang sudah ada.");

    // Tautan ke Akun Saya untuk notifikasi pribadi
    expect(html).toContain("Buka Pengaturan Akun Saya →");
    expect(html).toContain("Preferensi kanal notifikasi pribadi (Email &amp; WhatsApp)");
  });
  it("merender tab Divisi untuk Super Admin dengan pemilih lintas divisi", () => {
    const html = renderToStaticMarkup(
      <SettingsClient role="SUPER_ADMIN" userDivisionId="div_sekretariat" />,
    );

    // Super Admin melihat kedua tab
    expect(html).toContain("Divisi");
    expect(html).toContain("Sistem");

    // Pada tab divisi, Super Admin melihat pemilih divisi
    expect(html).toContain("Pilih divisi:");
    expect(html).toContain("Hukum &amp; Sengketa (HUK)");
    expect(html).toContain("Pengawasan (PGS)");
    expect(html).toContain("SDM &amp; Organisasi (SDM)");
    expect(html).toContain("Sekretariat (SEK)");
    expect(html).toContain("Penindakan (TND)");
  });

  it("memiliki batasan dan atribut aksesibilitas pada input form", () => {
    const html = renderToStaticMarkup(
      <SettingsClient role="ADMIN" userDivisionId="div_hukum" />,
    );

    // Read-only input fields memiliki atribut disabled/readOnly
    expect(html).toContain('disabled=""');
    expect(html).toContain('type="email"');

    // Tombol submit
    expect(html).toContain('type="submit"');
  });

  it("merender tab Sistem untuk Super Admin dengan kebijakan berkas dan ambang tenggat", () => {
    const html = renderToStaticMarkup(
      <SettingsClient role="SUPER_ADMIN" initialTab="sistem" />,
    );

    // Judul dan subjudul tab Sistem
    expect(html).toContain("Pengaturan");
    expect(html).toContain("Kebijakan berkas dan ambang tenggat untuk seluruh institusi.");

    // Kartu Kebijakan Berkas
    expect(html).toContain("Kebijakan berkas");
    expect(html).toContain("Seluruh institusi");
    expect(html).toContain("Ukuran maksimum per berkas (MB)");
    expect(html).toContain('min="1"');
    expect(html).toContain('max="10"');
    expect(html).toContain('value="10"');
    expect(html).toContain("Jumlah berkas per pengumpulan");
    expect(html).toContain('max="5"');
    expect(html).toContain('value="5"');

    // 8 tipe berkas kanonik dengan status tombol toggle aktif
    expect(html).toContain("Tipe berkas yang diterima");
    expect(html).toContain("PDF");
    expect(html).toContain("DOC");
    expect(html).toContain("DOCX");
    expect(html).toContain("XLS");
    expect(html).toContain("XLSX");
    expect(html).toContain("JPG");
    expect(html).toContain("JPEG");
    expect(html).toContain("PNG");
    expect(html).toContain('aria-pressed="true"');

    // Kartu Ambang Tenggat Dekat
    expect(html).toContain("Ambang tenggat dekat");
    expect(html).toContain("Sisa waktu dianggap dekat");
    expect(html).toContain('max="30"');
    expect(html).toContain('value="3"');
    expect(html).toContain("hari");
    expect(html).toContain("Pengumpulan setelah tenggat tetap diterima.");
    expect(html).toContain("Statusnya ditandai terlambat pada tabel dan laporan.");

    // Catatan kaki Tab Sistem
    expect(html).toContain("Tab ini hanya dibuka Super Admin. Admin Divisi tidak melihat tab Sistem.");
    expect(html).toContain("Batas atas ukuran berkas 10 MB mengikuti batas aplikasi; setelan hanya dapat menurunkan.");

    // Infrastruktur kanal notifikasi sistem
    expect(html).toContain("Infrastruktur Kanal Notifikasi Eksternal");
    expect(html).toContain("Notifikasi In-App");
    expect(html).toContain("WhatsApp (Fonnte)");
    expect(html).toContain("Surel (Email Gateway)");
  });
  it("mencegah Admin Divisi mengakses tab Sistem meskipun parameter initialTab diberikan", () => {
    const html = renderToStaticMarkup(
      <SettingsClient role="ADMIN" initialTab="sistem" userDivisionId="div_hukum" />,
    );

    // Otomatis fallback ke tab Divisi dan tidak merender tab Sistem
    expect(html).toContain("Kontak divisi dan nilai awal form tugas.");
    expect(html).not.toContain("Kebijakan berkas dan ambang tenggat untuk seluruh institusi.");
    expect(html).not.toContain("Sistem</button>");
  });
});
