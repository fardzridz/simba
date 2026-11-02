import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import SettingsClient from "./settings-client";
import type { AppSettingsView, DivisionSettingsView } from "@/db/queries/settings";
import type { CategoryOption } from "@/db/queries/form-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const FIXTURE_APP_SETTINGS: AppSettingsView = {
  maxFileMb: 10,
  maxFilesPerSubmission: 5,
  allowedTypes: ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"],
  dueSoonDays: 3,
  updatedByName: null,
  updatedAtFormatted: null,
};

const FIXTURE_CATEGORIES: CategoryOption[] = [
  { id: "cat_kegiatan", name: "Kegiatan dan Laporan" },
  { id: "cat_pleno", name: "Pengawasan Pleno" },
];

function divisionFixture(overrides: Partial<DivisionSettingsView>): DivisionSettingsView {
  return {
    id: "div_hukum",
    name: "Hukum & Sengketa",
    code: "HUK",
    adminName: "Ahmad Fauzi",
    contactEmail: "hukum@bawaslu-pasuruan.go.id",
    defaultCategoryId: null,
    defaultCategoryName: null,
    defaultCategoryActive: false,
    defaultPriority: "SEDANG",
    ...overrides,
  };
}

const FIXTURE_DIVISIONS: DivisionSettingsView[] = [
  divisionFixture({}),
  divisionFixture({ id: "div_pgs", name: "Pengawasan", code: "PGS" }),
  divisionFixture({
    id: "div_sdm",
    name: "SDM & Organisasi",
    code: "SDM",
    adminName: null,
  }),
  divisionFixture({ id: "div_sek", name: "Sekretariat", code: "SEK" }),
  divisionFixture({
    id: "div_tnd",
    name: "Penindakan",
    code: "TND",
    defaultCategoryId: "cat_kegiatan",
    defaultCategoryName: "Kegiatan dan Laporan",
    defaultCategoryActive: true,
  }),
];

function renderSettings(propsOverrides: Record<string, unknown> = {}) {
  const html = renderToStaticMarkup(
    <SettingsClient
      role="ADMIN"
      userDivisionId="div_hukum"
      appSettings={FIXTURE_APP_SETTINGS}
      divisions={FIXTURE_DIVISIONS}
      categories={FIXTURE_CATEGORIES}
      externalChannelsEnabled={true}
      {...propsOverrides}
    />,
  );
  return html;
}

describe("Pengaturan Operasional L18 (wireframe L18-pengaturan.svg & L18-pengaturan-sistem.svg)", () => {
  it("merender tab Divisi untuk Admin Divisi dengan pembatasan hanya divisi sendiri", () => {
    const html = renderSettings();

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
    expect(html).toContain("Admin divisi");
    expect(html).toContain("Ahmad Fauzi");

    // Kontak divisi terisi dari data divisi
    expect(html).toContain("Kontak divisi");
    expect(html).toContain("hukum@bawaslu-pasuruan.go.id");
    expect(html).toContain("Identitas diubah di Kelola Master; kontak menjadi Reply-To email divisi.");

    // Kartu Nilai Awal Form Tugas
    expect(html).toContain("Nilai awal form tugas");
    expect(html).toContain("Kategori default");
    expect(html).toContain("Tanpa kategori default");
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
    const html = renderSettings({ role: "SUPER_ADMIN", userDivisionId: "div_sek" });

    // Super Admin melihat kedua tab
    expect(html).toContain("Divisi");
    expect(html).toContain("Sistem");

    // Pada tab divisi, Super Admin melihat pemilih divisi dengan semua divisi
    expect(html).toContain("Pilih divisi:");
    expect(html).toContain("Hukum &amp; Sengketa (HUK)");
    expect(html).toContain("Pengawasan (PGS)");
    expect(html).toContain("SDM &amp; Organisasi (SDM)");
    expect(html).toContain("Sekretariat (SEK)");
    expect(html).toContain("Penindakan (TND)");
  });

  it("memiliki batasan dan atribut aksesibilitas pada input form", () => {
    const html = renderSettings();

    // Read-only input fields memiliki atribut disabled/readOnly
    expect(html).toContain('disabled=""');
    expect(html).toContain('type="email"');

    // Tombol submit
    expect(html).toContain('type="submit"');
  });

  it("memperingatkan jika kategori default tersimpan sudah nonaktif", () => {
    const html = renderSettings({
      divisions: [
        divisionFixture({
          defaultCategoryId: "cat_bubar",
          defaultCategoryName: "Kegiatan Bubar",
          defaultCategoryActive: false,
        }),
      ],
    });

    expect(html).toContain("Kegiatan Bubar");
    expect(html).toContain(
      "sedang nonaktif dan tidak bisa dipilih; simpan kategori lain atau biarkan kosong.",
    );
  });

  it("merender tab Sistem untuk Super Admin dengan kebijakan berkas dan ambang tenggat", () => {
    const html = renderSettings({ role: "SUPER_ADMIN", userDivisionId: "div_sek", initialTab: "sistem" });

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
    expect(html).toContain("Selalu Aktif");
    expect(html).toContain("WhatsApp (Fonnte)");
    expect(html).toContain("Surel (Email Gateway)");
    expect(html).toContain("Dinyalakan");
  });

  it("menyatakan kanal luar dimatikan sistem bila pengiriman eksternal tidak aktif", () => {
    const html = renderSettings({
      role: "SUPER_ADMIN",
      userDivisionId: "div_sek",
      initialTab: "sistem",
      externalChannelsEnabled: false,
    });

    expect(html).toContain("Dimatikan sistem");
    expect(html).not.toContain("Dinyalakan");
  });

  it("menyatakan nilai default bila setelan sistem belum pernah disimpan", () => {
    const html = renderSettings({ role: "SUPER_ADMIN", userDivisionId: "div_sek", initialTab: "sistem" });

    expect(html).toContain(
      "Belum pernah disimpan; nilai di kartu memakai default aplikasi.",
    );
  });

  it("menyatakan pemeriksaan terakhir setelan sistem bersama nama penyimpannya", () => {
    const html = renderSettings({
      role: "SUPER_ADMIN",
      userDivisionId: "div_sek",
      initialTab: "sistem",
      appSettings: {
        ...FIXTURE_APP_SETTINGS,
        updatedByName: "Super Admin",
        updatedAtFormatted: "31 Okt 2026 08:00 WIB",
      },
    });

    expect(html).toContain("Terakhir disimpan oleh Super Admin pada 31 Okt 2026 08:00 WIB.");
  });

  it("mencegah Admin Divisi mengakses tab Sistem meskipun parameter initialTab diberikan", () => {
    const html = renderSettings({ initialTab: "sistem" });

    // Otomatis fallback ke tab Divisi dan tidak merender tab Sistem
    expect(html).toContain("Kontak divisi dan nilai awal form tugas.");
    expect(html).not.toContain("Kebijakan berkas dan ambang tenggat untuk seluruh institusi.");
    expect(html).not.toContain("Sistem</button>");
  });
});
