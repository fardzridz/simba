import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PasswordForm from "./password-form";
import ContactNotificationCard from "./contact-notification-card";

describe("L02 PasswordForm (wireframe L02-akun-saya.svg)", () => {
  it("merender formulir kata sandi dengan atribut aksesibilitas dan autocomplete", () => {
    const html = renderToStaticMarkup(<PasswordForm />);

    // Memiliki label dan input untuk kata sandi saat ini, baru, dan konfirmasi
    expect(html).toContain("Kata sandi saat ini");
    expect(html).toContain("Kata sandi baru");
    expect(html).toContain("Ulangi kata sandi baru");

    // Atribut autocomplete yang benar sesuai standar keamanan browser
    // Atribut autocomplete dan minLength
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('minLength="12"');
    expect(html).toContain("Minimal 12 karakter");

    // Tombol submit fokus utama
    expect(html).toContain("Simpan Kata Sandi");

    // Catatan keamanan di bawah tombol
    expect(html).toContain("Sesi lain akan diakhiri setelah kata sandi berubah.");
    expect(html).toContain("Sesi berakhir otomatis setelah 8 jam tanpa aktivitas.");
  });

  it("menyediakan tombol intip kata sandi untuk kenyamanan pengetikan", () => {
    const html = renderToStaticMarkup(<PasswordForm />);
    expect(html).toContain("Tampilkan kata sandi saat ini");
    expect(html).toContain("Tampilkan kata sandi baru");
    expect(html).toContain("Tampilkan konfirmasi kata sandi");
  });
});

describe("L02 ContactNotificationCard (wireframe L02-akun-saya.svg)", () => {
  it("merender kartu Kontak & Notifikasi dengan surel, nomor WhatsApp, dan status verifikasi", () => {
    const html = renderToStaticMarkup(
      <ContactNotificationCard
        initialEmail="staf.hukum@contoh.local"
        initialWaNumber="+6281234567890"
        initialEmailVerified={true}
        initialWaVerified={true}
      />,
    );

    // Header kartu
    expect(html).toContain("Kontak &amp; notifikasi");
    expect(html).toContain("Berlaku per akun");

    // Kolom surel
    expect(html).toContain("Surel");
    expect(html).toContain("staf.hukum@contoh.local");
    expect(html).toContain("Terverifikasi");
    expect(html).toContain("Ubah Surel");

    // Kolom WhatsApp
    expect(html).toContain("Nomor WhatsApp");
    expect(html).toContain("+62 812•••• 890");
    expect(html).toContain("Ubah Nomor");
  });

  it("merender saklar preferensi kanal email dan WhatsApp yang default mati", () => {
    const html = renderToStaticMarkup(<ContactNotificationCard />);

    // Preferensi kanal
    expect(html).toContain("Preferensi Pengiriman Notifikasi");
    expect(html).toContain("Kanal Email");
    expect(html).toContain("Kanal WhatsApp");

    // Switch atribut aksesibilitas dan default mati
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("mati");
  });

  it("merender catatan kaki peraturan kontak & notifikasi sesuai wireframe L02", () => {
    const html = renderToStaticMarkup(<ContactNotificationCard />);

    expect(html).toContain("Kanal luar mati secara default. Notifikasi in-app tetap selalu aktif.");
    expect(html).toContain("Satu nomor hanya boleh terpasang di satu akun.");
    expect(html).toContain("Ubah surel menunggu tautan verifikasi ke alamat baru.");
    expect(html).toContain("Surel bukan untuk masuk. Perubahan berlaku setelah tautan verifikasi dibuka.");
    expect(html).toContain("Kode WhatsApp berlaku 10 menit dan maksimal 5 percobaan.");
  });
});
