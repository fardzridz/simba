import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import EmptyState from "./empty-state";
import ErrorState, { ErrorBanner, FieldError } from "./error-state";
import {
  KpiStripSkeleton,
  LoadingButton,
  TableSkeleton,
} from "./loading-state";
import ForbiddenState from "./forbidden-state";

describe("EmptyState (state-kosong.svg)", () => {
  it("merender judul, deskripsi, dan sebab secara benar", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Belum ada tugas untukmu"
        description="Tugas yang ditugaskan admin akan muncul di sini."
        reason="akun baru belum pernah menerima penugasan."
        illustration="tugas"
      />,
    );
    expect(html).toContain("Belum ada tugas untukmu");
    expect(html).toContain("Tugas yang ditugaskan admin akan muncul di sini.");
    expect(html).toContain("Sebab: akun baru belum pernah menerima penugasan.");
    expect(html).toContain("/ilustrasi/kosong-tugas.svg");
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Belum ada tugas untukmu"');
  });

  it("merender tombol aksi untuk varian link dan button", () => {
    const linkHtml = renderToStaticMarkup(
      <EmptyState
        title="Belum ada dokumen final"
        description="Dokumen muncul setelah tugas disetujui."
        action={{
          type: "link",
          label: "Buka Dashboard",
          href: "/dashboard",
          variant: "primary",
        }}
      />,
    );
    expect(linkHtml).toContain('href="/dashboard"');
    expect(linkHtml).toContain("Buka Dashboard");
    expect(linkHtml).toContain("bg-primary");

    const buttonHtml = renderToStaticMarkup(
      <EmptyState
        title="Hasil filter nol"
        description="Hapus filter untuk melihat semua tugasmu."
        action={{
          type: "button",
          label: "Hapus filter",
          variant: "secondary",
        }}
      />,
    );
    expect(buttonHtml).toContain("<button");
    expect(buttonHtml).toContain("Hapus filter");
    expect(buttonHtml).toContain("border-border-strong");
  });
});

describe("ErrorBanner & ErrorState (state-galat.svg)", () => {
  it("ErrorBanner merender role alert dengan warna error-surface dan teks error", () => {
    const html = renderToStaticMarkup(
      <ErrorBanner
        title="Daftar tugas gagal dimuat"
        description="Periksa sambungan lalu muat ulang."
        detail="Filter yang aktif tidak berubah."
        onRetry={() => {}}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("bg-error-surface");
    expect(html).toContain("text-error");
    expect(html).toContain("Daftar tugas gagal dimuat");
    expect(html).toContain("Periksa sambungan lalu muat ulang.");
    expect(html).toContain("Filter yang aktif tidak berubah.");
    expect(html).toContain("Coba lagi");
  });

  it("ErrorState merender tampilan kartu dengan ilustrasi galat-muat", () => {
    const html = renderToStaticMarkup(
      <ErrorState
        title="Katalog gagal dimuat"
        description="Terjadi kendala saat mengambil data katalog dokumen."
        onRetry={() => {}}
        actionHref="/dashboard"
        actionLabel="Kembali ke Dashboard"
      />,
    );
    expect(html).toContain("/ilustrasi/galat-muat.svg");
    expect(html).toContain("Katalog gagal dimuat");
    expect(html).toContain("Coba lagi");
    expect(html).toContain('href="/dashboard"');
  });

  it("FieldError hanya merender saat pesan galat ada", () => {
    expect(renderToStaticMarkup(<FieldError message="" />)).toBe("");
    expect(renderToStaticMarkup(<FieldError message={undefined} />)).toBe("");

    const html = renderToStaticMarkup(
      <FieldError message="Pilih minimal satu penerima sebelum menyimpan." />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Pilih minimal satu penerima sebelum menyimpan.");
    expect(html).toContain("text-error");
  });
});

describe("LoadingState Skeletons (state-memuat.svg)", () => {
  it("TableSkeleton merender jumlah baris persis dengan atribut aria-busy", () => {
    const html = renderToStaticMarkup(
      <TableSkeleton
        rows={6}
        ariaLabel="Memuat tabel tugas..."
        columns={[
          { labelWidth: "w-40" },
          { labelWidth: "w-24" },
          { labelWidth: "w-16", align: "right" },
        ]}
      />,
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Memuat tabel tugas..."');
    // Memeriksa keberadaan elemen thead dan tbody
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    // Hitung kemunculan baris tr di dalam tbody (6 baris data + 1 header = 7 total)
    const trCount = (html.match(/<tr/g) || []).length;
    expect(trCount).toBe(7);
  });

  it("KpiStripSkeleton merender kartu skeleton dalam grid 2-4 kolom", () => {
    const html = renderToStaticMarkup(<KpiStripSkeleton count={4} />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("tablet:grid-cols-4");
    const cardCount = (html.match(/card/g) || []).length;
    expect(cardCount).toBeGreaterThanOrEqual(4);
  });

  it("LoadingButton merender teks proses dan terkunci saat loading", () => {
    const idleHtml = renderToStaticMarkup(
      <LoadingButton loading={false}>Simpan Perubahan</LoadingButton>,
    );
    expect(idleHtml).toContain("Simpan Perubahan");
    expect(idleHtml).not.toContain('disabled=""');
    expect(idleHtml).not.toContain('aria-busy="true"');

    const loadingHtml = renderToStaticMarkup(
      <LoadingButton loading={true} loadingText="Menyimpan...">
        Simpan Perubahan
      </LoadingButton>,
    );
    expect(loadingHtml).toContain('disabled=""');
    expect(loadingHtml).toContain("disabled");
    expect(loadingHtml).toContain('aria-busy="true"');
    expect(loadingHtml).toContain("animate-spin");
  });
});

describe("ForbiddenState (state-403.svg)", () => {
  it("merender kartu 403 dengan peringatan log aktivitas dan tanpa membocorkan data teknis", () => {
    const html = renderToStaticMarkup(<ForbiddenState />);
    expect(html).toContain("Akses ditolak");
    expect(html).toContain("Data ini di luar cakupan akunmu.");
    expect(html).toContain("Percobaan akses ini tercatat di log aktivitas.");
    expect(html).toContain("Hubungi admin divisimu bila menurutmu ini keliru.");
    expect(html).toContain("/ilustrasi/tanpa-akses.svg");
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Kembali ke Dashboard");
    expect(html).toContain('role="alert"');

    // Pastikan tidak ada istilah kueri atau teknis yang bocor
    expect(html).not.toContain("sql");
    expect(html).not.toContain("database");
    expect(html).not.toContain("stack");
  });
});

describe("Visual Preview Generator", () => {
  it("menghasilkan preview HTML lengkap untuk verifikasi visual", () => {
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Pratinjau Komponen State</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; background: #FCFCFC; color: #111827; padding: 24px; margin: 0; }
    .grid-demo { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .bg-surface-sunken { background: #F9FAFB; }
    .bg-neutral-surface { background: #F3F4F6; }
    .bg-error-surface { background: #FEE2E2; }
    .text-error { color: #B91C1C; }
    .text-ink { color: #111827; }
    .text-ink-2 { color: #4B5563; }
    .text-ink-3 { color: #6B7280; }
    .text-on-dark { color: #FFFFFF; }
    .bg-primary { background: #B7091E; }
    .border-border { border-color: #E5E7EB; }
    .border-border-strong { border-color: #D1D5DB; }
  </style>
</head>
<body>
  <div style="max-width: 1080px; margin: 0 auto;">
    <h1 style="font-size: 20px; font-weight: 600; margin-bottom: 24px;">Pratinjau Komponen 4 State Antarmuka</h1>
    
    <h2 style="font-size: 15px; font-weight: 600; margin: 24px 0 12px;">1. EmptyState (state-kosong.svg)</h2>
    <div class="grid-demo">
      ${renderToStaticMarkup(
        <EmptyState
          title="Belum ada tugas untukmu"
          description="Tugas yang ditugaskan admin akan muncul di sini."
          reason="akun baru belum pernah menerima penugasan."
          illustration="tugas"
          action={{ type: "button", label: "Muat ulang", variant: "secondary" }}
        />
      )}
      ${renderToStaticMarkup(
        <EmptyState
          title="Belum ada tugas pada filter ini"
          description="Hapus filter untuk melihat semua tugasmu."
          reason="data ada, tetapi tersaring habis oleh filter aktif."
          illustration="rak"
          action={{ type: "button", label: "Hapus filter", variant: "secondary" }}
        />
      )}
    </div>

    <h2 style="font-size: 15px; font-weight: 600; margin: 24px 0 12px;">2. ErrorState & ErrorBanner (state-galat.svg)</h2>
    <div class="grid-demo">
      <div>
        ${renderToStaticMarkup(
          <ErrorBanner
            title="Daftar tugas gagal dimuat"
            description="Periksa sambungan lalu muat ulang."
            detail="Filter yang aktif tidak berubah."
            onRetry={() => {}}
          />
        )}
        <div style="margin-top: 16px;">
          ${renderToStaticMarkup(
            <FieldError message="Pilih minimal satu penerima sebelum menyimpan." />
          )}
        </div>
      </div>
      ${renderToStaticMarkup(
        <ErrorState
          title="Katalog gagal dimuat"
          description="Terjadi kendala saat mengambil data katalog dokumen final."
          retryLabel="Coba lagi"
          illustration={false}
        />
      )}
    </div>

    <h2 style="font-size: 15px; font-weight: 600; margin: 24px 0 12px;">3. LoadingState Skeletons & Buttons (state-memuat.svg)</h2>
    <div style="margin-bottom: 24px;">
      ${renderToStaticMarkup(<KpiStripSkeleton count={4} />)}
    </div>
    <div style="margin-bottom: 24px;">
      ${renderToStaticMarkup(<TableSkeleton rows={4} />)}
    </div>
    <div style="display: flex; gap: 12px; margin-bottom: 32px;">
      ${renderToStaticMarkup(
        <LoadingButton loading={false} variant="primary">Simpan Perubahan</LoadingButton>
      )}
      ${renderToStaticMarkup(
        <LoadingButton loading={true} loadingText="Menyimpan..." variant="primary">Simpan</LoadingButton>
      )}
      ${renderToStaticMarkup(
        <LoadingButton loading={true} loadingText="Menyiapkan berkas, 378 baris" variant="secondary">Ekspor</LoadingButton>
      )}
    </div>

    <h2 style="font-size: 15px; font-weight: 600; margin: 24px 0 12px;">4. ForbiddenState (state-403.svg)</h2>
    <div>
      ${renderToStaticMarkup(<ForbiddenState />)}
    </div>
  </div>
</body>
</html>`;
    writeFileSync("build/preview-states.html", html, "utf-8");
  });
});
