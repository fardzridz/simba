/**
 * Smoke test UI (throwaway, tidak bagian dari aplikasi):
 * alur login nyata di peramban terhadap `next dev` + D1 lokal.
 *   cd build && node smoke-ui.mjs
 *
 * Catatan: label di UI memakai CSS text-transform, jadi perbandingan teks
 * dilakukan tanpa membedakan huruf besar/kecil.
 */
import puppeteer from "puppeteer";
import { mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const PORT = process.env.TEST_PORT || process.env.PORT || "3005";
const BASE = `http://localhost:${PORT}`;
const PASSWORD = "Bawaslu#2026";
const SHOTS = "screenshots";
mkdirSync(SHOTS, { recursive: true });

function findChromeHeadlessShell() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cacheRoot = join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".cache", "puppeteer", "chrome-headless-shell");
  if (!existsSync(cacheRoot)) return undefined;
  for (const version of readdirSync(cacheRoot)) {
    for (const arch of readdirSync(join(cacheRoot, version))) {
      const candidate = join(cacheRoot, version, arch, "chrome-headless-shell" + (process.platform === "win32" ? ".exe" : ""));
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

const results = [];
function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? `, ${detail}` : ""}`);
}

const has = (text, needle) => text.toLowerCase().includes(needle.toLowerCase());

async function step(name, fn) {
  try {
    await fn();
  } catch (error) {
    check(name, false, `galat: ${String(error).split("\n")[0]}`);
  }
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: findChromeHeadlessShell(),
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const cdp = await page.createCDPSession();

async function gotoSettled(url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 15000 });
}

async function login(username, password) {
  await cdp.send("Network.clearBrowserCookies");
  await gotoSettled(`${BASE}/login`);
  await page.waitForSelector("#username", { timeout: 15000 });
  await page.type("#username", username);
  await page.type("#password", password);
  await Promise.all([
    page.waitForFunction(() => location.pathname !== "/login", { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 15000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 600));
}

const bodyText = () => page.evaluate(() => document.body.innerText);

await step("halaman login", async () => {
  await cdp.send("Network.clearBrowserCookies");
  await gotoSettled(`${BASE}/login`);
  const text = await bodyText();
  check("halaman login menampilkan formulir", has(text, "Nama pengguna") && has(text, "Kata sandi"));
  check("halaman login menyebut batas percobaan dan masa sesi", has(text, "5 percobaan gagal") && has(text, "8 jam"));
  check("halaman login menyebut jalur pemulihan tanpa tautan mati", has(text, "Hubungi Super Admin"));
  await page.screenshot({ path: `${SHOTS}/01-login.png` });
});

await step("kata sandi salah", async () => {
  await login("admin.hukum", "salah-sekali");
  const text = await bodyText();
  check(
    "kata sandi salah ditolak di halaman login",
    page.url().endsWith("/login") && has(text, "Nama pengguna atau kata sandi salah"),
    page.url(),
  );
  await page.screenshot({ path: `${SHOTS}/02-login-gagal.png` });
});

await step("admin divisi", async () => {
  await login("admin.hukum", PASSWORD);
  const text = await bodyText();
  check("admin divisi masuk ke dashboard", page.url().endsWith("/dashboard"), page.url());
  check("peran tampil di top bar", has(text, "Admin Divisi"));
  check("subjudul halaman menyebut divisi", has(text, "Hukum & Sengketa"));
  check(
    "sidebar admin memuat menu perannya",
    has(text, "Tugas Divisi") && has(text, "Laporan") && has(text, "Log Aktivitas"),
  );
  check("sidebar admin tidak memuat menu super admin", !has(text, "Kelola Master"));
  check("seluruh menu peran admin telah aktif", !has(text, "(menyusul)"));
  check("kartu metrik memakai satuan penugasan", has(text, "satuan: penugasan") && has(text, "Terlambat"));
  check("antrean review menampilkan status jelas", has(text, "Tidak ada pengumpulan yang menunggu") || has(text, "Antrean Review Menunggu Verifikasi") || has(text, "Pengunggahan Dokumen C1 Pleno"));
  await page.screenshot({ path: `${SHOTS}/03-dashboard-admin.png`, fullPage: true });
});

await step("tolak lintas divisi", async () => {
  await gotoSettled(`${BASE}/api/divisions/div_pengawasan`);
  const text = await bodyText();
  check("admin divisi lain ditolak", has(text, "Data di luar divisi Anda"), text.slice(0, 60));
});

await step("kerangka desktop", async () => {
  await gotoSettled(`${BASE}/dashboard`);
  const shell = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    const active = document.querySelector('nav a[aria-current="page"]');
    const header = document.querySelector("header");
    const title = document.querySelector("header h1");
    const main = document.querySelector("main");
    return {
      sidebarShown: aside ? getComputedStyle(aside).display !== "none" : false,
      sidebarWidth: aside?.getBoundingClientRect().width ?? 0,
      sidebarBg: aside ? getComputedStyle(aside).backgroundColor : "",
      sidebarPosition: aside ? getComputedStyle(aside).position : "",
      activeLabel: active?.textContent?.trim() ?? "",
      activeBg: active ? getComputedStyle(active).backgroundColor : "",
      activeText: active ? getComputedStyle(active).color : "",
      headerPosition: header ? getComputedStyle(header).position : "",
      headerHeight: header?.getBoundingClientRect().height ?? 0,
      title: title?.textContent?.trim() ?? "",
      mainLeft: main?.getBoundingClientRect().left ?? 0,
    };
  });
  check(
    "sidebar gelap 220px tetap di sisi kiri",
    shell.sidebarShown &&
      shell.sidebarPosition === "fixed" &&
      shell.sidebarWidth === 220 &&
      shell.sidebarBg === "rgb(25, 27, 39)",
    JSON.stringify(shell),
  );
  check(
    "menu aktif jadi pill primary dengan teks on-dark",
    shell.activeLabel === "Dashboard" &&
      shell.activeBg === "rgb(183, 9, 30)" &&
      shell.activeText === "rgb(255, 255, 255)",
    `${shell.activeLabel} ${shell.activeBg} ${shell.activeText}`,
  );
  check(
    "top bar lengket 56px memuat judul halaman",
    shell.headerPosition === "sticky" && shell.headerHeight === 56 && shell.title === "Dashboard Divisi",
    `${shell.headerPosition} ${shell.headerHeight} ${shell.title}`,
  );
  check("konten dimulai setelah sidebar", shell.mainLeft >= 220, `${shell.mainLeft}px`);
});

await step("menu akun", async () => {
  await gotoSettled(`${BASE}/dashboard`);
  await page.click('header button[aria-haspopup="true"]');
  await page.waitForSelector("header form[action] button", { timeout: 5000 });
  const panel = await page.evaluate(() => {
    const menu = document.querySelector('header [id][class*="rounded-lg"]');
    return {
      text: menu?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      expanded: document.querySelector('header button[aria-haspopup="true"]')?.getAttribute("aria-expanded"),
    };
  });
  check("menu akun menyebut nama, divisi, dan peran", has(panel.text, "Admin Hukum") && has(panel.text, "Admin Divisi"), panel.text.slice(0, 80));
  check("menu akun menyediakan tautan Akun Saya", has(panel.text, "Akun Saya"));
  check("menu akun menyediakan Keluar", has(panel.text, "Keluar"));
  check("avatar menyatakan keadaan terbuka", panel.expanded === "true", String(panel.expanded));
  await page.keyboard.press("Escape");
  await new Promise((resolve) => setTimeout(resolve, 200));
  check("Escape menutup menu akun", (await page.$("header form[action] button")) === null);
});

await step("halaman akun saya", async () => {
  await gotoSettled(`${BASE}/account`);
  const text = await bodyText();
  check("berada di rute /account", page.url().endsWith("/account"), page.url());
  check("judul Akun Saya tampil", has(text, "Akun Saya"));
  check("subjudul profil tampil", has(text, "Profil kepegawaian dan keamanan akun"));
  check("kartu profil menampilkan peran", has(text, "Admin Divisi"));
  check("kartu profil menampilkan nama pengguna", has(text, "admin.hukum"));
  check("kartu profil menampilkan divisi", has(text, "Hukum & Sengketa"));
  check("formulir keamanan memuat kolom kata sandi", has(text, "Kata sandi saat ini") && has(text, "Kata sandi baru"));
  check("tombol simpan kata sandi tampil", has(text, "Simpan Kata Sandi"));
  check("catatan cara kerja keamanan tampil", has(text, "Cara kerja keamanan akun"));
  await page.screenshot({ path: `${SHOTS}/04-akun-saya.png`, fullPage: true });
});

await step("halaman daftar tugas", async () => {
  await gotoSettled(`${BASE}/tasks`);
  const text = await bodyText();
  check("berada di rute /tasks", page.url().endsWith("/tasks"), page.url());
  check("judul Tugas Divisi tampil untuk admin", has(text, "Tugas Divisi"));
  check("tombol Buat Tugas tampil untuk admin", has(text, "Buat Tugas"));
  check("pita 4 KPI tugas divisi tampil", has(text, "Penugasan Aktif") && has(text, "Menunggu Verifikasi"));
  check("filter bar memuat pencarian dan status", has(text, "Status: semua") && has(text, "Terlambat"));
  check("filter bar memuat tombol flag", has(text, "Perlu Revisi") && has(text, "Terarsip"));
  check("tampilan empty state atau tabel bersih", has(text, "Belum ada tugas") || has(text, "penugasan"));
  await page.screenshot({ path: `${SHOTS}/09-tugas-divisi-admin.png`, fullPage: true });

  // Navigasi ke L10 Buat Tugas
  await gotoSettled(`${BASE}/tasks/new`);
  const formText = await bodyText();
  check("berada di rute /tasks/new", page.url().endsWith("/tasks/new"), page.url());
  check("judul Buat Tugas tampil di formulir", has(formText, "Buat Tugas"));
  check("tautan kembali ke Tugas Divisi ada", has(formText, "Kembali ke Tugas Divisi"));
  check("kolom formulir judul, kategori, dan tenggat ada", has(formText, "Judul tugas") && has(formText, "Kategori") && has(formText, "Tenggat"));
  check("pratinjau nomor tugas mono tampil", has(formText, "HUK/"));
  check("pemilih penerima memuat staf divisi", has(formText, "Ahmad Fauzi") && has(formText, "pegawai dipilih"));
  check("tombol aksi Simpan & Tugaskan ada", has(formText, "Simpan & Tugaskan") && has(formText, "Batal"));
  await page.screenshot({ path: `${SHOTS}/10-buat-tugas.png`, fullPage: true });

  // Navigasi ke L10 Ubah Tugas (Admin)
  await gotoSettled(`${BASE}/tasks/tsk_huk_1/edit`);
  const editFormText = await bodyText();
  check("berada di rute /tasks/[id]/edit", page.url().includes("/tasks/tsk_huk_1/edit"), page.url());
  check("judul Ubah Tugas tampil", has(editFormText, "Ubah Tugas"));
  check("nomor tugas mono tetap tampil", has(editFormText, "HUK/2026/10/007"));
  check("tombol Simpan Perubahan ada", has(editFormText, "Simpan Perubahan"));
  await page.screenshot({ path: `${SHOTS}/13-ubah-tugas.png`, fullPage: true });

  // Navigasi ke L11 Detail Tugas & Panel Review (Admin)
  await gotoSettled(`${BASE}/tasks/tsk_huk_3`);
  const reviewText = await bodyText();
  check("berada di rute detail tugas admin", page.url().includes("/tasks/tsk_huk_3"), page.url());
  check("judul tugas admin tampil", has(reviewText, "Pengunggahan Dokumen C1 Pleno"));
  check("nomor tugas mono tampil", has(reviewText, "HUK/2026/10/003"));
  check("tombol tindakan admin ada", has(reviewText, "Perpanjang Tenggat") && has(reviewText, "Batalkan Tugas"));
  check("metadata penerima dan tunggu review tampil", has(reviewText, "Penerima: Siti Rahma") && has(reviewText, "Tunggu review"));
  check("panel pengumpulan terbaru memuat berkas", has(reviewText, "Pengumpulan Terbaru") && has(reviewText, "dokumen-c1-pleno-final.pdf"));
  check("panel keputusan memuat Setujui dan Minta Revisi", has(reviewText, "Keputusan") && has(reviewText, "Setujui & Arsipkan") && has(reviewText, "Minta Revisi"));
  await page.screenshot({ path: `${SHOTS}/11-detail-review-admin.png`, fullPage: true });

  // Uji modal perpanjang tenggat
  const extendBtn = await page.$('button ::-p-text(Perpanjang Tenggat)');
  if (extendBtn) {
    await extendBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const modalText = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
    check("dialog perpanjang tenggat terbuka", has(modalText, "Perpanjang Tenggat") && has(modalText, "Tenggat baru"));
    const cancelModalBtn = await page.$('[role="dialog"] button ::-p-text(Batal)');
    if (cancelModalBtn) {
      await cancelModalBtn.click();
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 }).catch(() => {});
    }
    check("dialog perpanjang tenggat tertutup", (await page.$('[role="dialog"]')) === null);
  }
  // Uji dialog Batalkan Tugas langsung di tabel admin
  await gotoSettled(`${BASE}/tasks`);
  const cancelTaskTrigger = await page.$('button ::-p-text(Batalkan)');
  if (cancelTaskTrigger) {
    await cancelTaskTrigger.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const cancelModalText = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
    check("dialog batalkan tugas terbuka", has(cancelModalText, "Batalkan Tugas") && has(cancelModalText, "Peringatan"));
    const closeCancelBtn = await page.$('[role="dialog"] button ::-p-text(Kembali)');
    if (closeCancelBtn) {
      await closeCancelBtn.click();
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 }).catch(() => {});
    }
    check("dialog batalkan tugas tertutup", (await page.$('[role="dialog"]')) === null);
  }
});
await step("halaman katalog dokumen", async () => {
  await gotoSettled(`${BASE}/documents`);
  const text = await bodyText();
  check("berada di rute /documents", page.url().endsWith("/documents"), page.url());
  check("judul Katalog Dokumen Final tampil", has(text, "Katalog Dokumen Final"));
  check("dokumen sah terdaftar di tabel", has(text, "Rekap Berita Acara Rapat Pleno") && has(text, "HUK/2026/10/002"));
  check("divisi terkunci untuk admin", has(text, "Divisi: Hukum & Sengketa (terkunci)"));
  check("panel detail dokumen tampil di sebelah kanan", has(text, "Detail Dokumen") && has(text, "Unduh Semua"));
  check("tautan lihat tugas asal ada", has(text, "Lihat tugas asal"));
  await page.screenshot({ path: `${SHOTS}/12-katalog-dokumen.png`, fullPage: true });
});
await step("halaman notifikasi", async () => {
  await gotoSettled(`${BASE}/notifications`);
  const text = await bodyText();
  check("berada di rute /notifications", page.url().endsWith("/notifications"), page.url());
  check("judul Notifikasi tampil", has(text, "Notifikasi"));
  check("kelompok BARU atau SUDAH DIBACA tampil", has(text, "BARU") || has(text, "SUDAH DIBACA"));
  check("tautan buka tugas ada", has(text, "Buka tugas"));
  await page.screenshot({ path: `${SHOTS}/14-notifikasi.png`, fullPage: true });
});
await step("halaman laporan dan ekspor", async () => {
  await gotoSettled(`${BASE}/reports`);
  const text = await bodyText();
  check("berada di rute /reports", page.url().endsWith("/reports"), page.url());
  check("judul Laporan & Ekspor tampil", has(text, "Laporan & Ekspor"));
  check("ringkasan periode memuat 5 metrik", has(text, "Ringkasan Periode") && has(text, "378") && has(text, "286"));
  check("tombol Ekspor XLSX dan Cetak ada", has(text, "Ekspor XLSX") && has(text, "Cetak / PDF"));
  check("tabel pratinjau rekapitulasi tampil", has(text, "Pratinjau") && has(text, "Hukum & Sengketa"));
  check("tampilan cetak A4 ber-KOP tampil", has(text, "Tampilan Cetak A4") && has(text, "KOP INSTANSI"));
  await page.screenshot({ path: `${SHOTS}/15-laporan-ekspor.png`, fullPage: true });
});
await step("halaman log aktivitas", async () => {
  await gotoSettled(`${BASE}/logs`);
  const text = await bodyText();
  check("berada di rute /logs", page.url().endsWith("/logs"), page.url());
  check("judul Log Aktivitas tampil", has(text, "Log Aktivitas"));
  check("spanduk immutability log tampil", has(text, "Log tidak dapat diubah atau dihapus"));
  check("tabel audit trail memuat kode aksi mono", has(text, "submission.created") || has(text, "due_date.extended"));
  await page.screenshot({ path: `${SHOTS}/16-log-aktivitas.png`, fullPage: true });
});

await step("kerangka ponsel dan laci", async () => {
  await page.setViewport({ width: 390, height: 844 });
  await gotoSettled(`${BASE}/dashboard`);
  const mobile = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    const menu = document.querySelector("header button[aria-controls]");
    const cards = document.querySelector('section[aria-labelledby="kartu-utama"]');
    const columns = cards ? getComputedStyle(cards).gridTemplateColumns.split(" ").length : 0;
    return {
      sidebarHidden: aside ? getComputedStyle(aside).display === "none" : false,
      menuVisible: Boolean(menu && menu.getBoundingClientRect().width > 0),
      menuLabel: menu?.textContent?.trim() ?? "",
      columns,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  check("sidebar disembunyikan di ponsel", mobile.sidebarHidden);
  check("tombol Menu tampil di top bar ponsel", mobile.menuVisible && mobile.menuLabel === "Menu", mobile.menuLabel);
  check("kartu jadi 2 kolom di layar ponsel", mobile.columns === 2, `${mobile.columns} kolom`);
  check("tidak ada geser horizontal di layar ponsel", !mobile.overflow);

  await page.click("header button[aria-controls]");
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const drawer = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return {
      label: dialog?.getAttribute("aria-label") ?? "",
      items: [...(dialog?.querySelectorAll("nav a, nav span[aria-disabled]") ?? [])].map((node) =>
        node.textContent.trim(),
      ),
      focusInside: dialog?.contains(document.activeElement) ?? false,
      scrollLocked: getComputedStyle(document.documentElement).overflow === "hidden",
    };
  });
  check(
    "laci navigasi terbuka dari tombol Menu",
    drawer.label === "Navigasi" &&
      drawer.items.some((item) => item.startsWith("Dashboard")) &&
      drawer.items.some((item) => item.startsWith("Log Aktivitas")),
    drawer.items.join(" | "),
  );
  check("fokus pindah ke dalam laci", drawer.focusInside);
  check("latar halaman terkunci saat laci terbuka", drawer.scrollLocked);
  await page.screenshot({ path: `${SHOTS}/08-laci-ponsel.png` });

  await page.keyboard.press("Escape");
  await new Promise((resolve) => setTimeout(resolve, 250));
  check("Escape menutup laci", (await page.$('[role="dialog"]')) === null);
  await page.screenshot({ path: `${SHOTS}/06-dashboard-ponsel.png`, fullPage: true });
  await page.setViewport({ width: 1280, height: 900 });
});

await step("keluar", async () => {
  await gotoSettled(`${BASE}/dashboard`);
  await page.click('header button[aria-haspopup="true"]');
  await page.waitForSelector("header form[action] button", { timeout: 5000 });
  await Promise.all([
    page.waitForFunction(() => location.pathname === "/login", { timeout: 15000 }).catch(() => {}),
    page.click('header form[action] button[type="submit"]'),
  ]);
  check("keluar kembali ke halaman login", page.url().endsWith("/login"), page.url());
});

await step("staf pelaksana", async () => {
  await login("staf.hukum", PASSWORD);
  const text = await bodyText();
  check("staf melihat cakupan pribadi", has(text, "Staf Pelaksana") && has(text, "Penugasan Anda"));
  check("staf tidak melihat antrean review", !has(text, "Antrean menunggu verifikasi"));
  check("staf tidak melihat menu Laporan", !has(text, "Laporan"));
  check("sidebar staf memuat Tugas Saya dan Akun Saya", has(text, "Tugas Saya") && has(text, "Akun Saya"));
  check("staf tidak melihat menu Log Aktivitas", !has(text, "Log Aktivitas"));
  await page.screenshot({ path: `${SHOTS}/04-dashboard-staf.png`, fullPage: true });

  // Pengujian rute /tasks dan modal kumpulkan tugas L08
  await gotoSettled(`${BASE}/tasks`);
  const taskText = await bodyText();
  check("judul Tugas Saya tampil untuk staf", has(taskText, "Tugas Saya"));
  check("tabel menampilkan tugas yang ditugaskan", has(taskText, "HUK/2026/10/001"));

  // Klik tombol Kumpulkan Tugas untuk membuka modal
  const submitBtn = await page.$('button ::-p-text(Kumpulkan Tugas)');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const modalText = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return dlg?.textContent ?? "";
    });
    check("modal pengumpulan tugas terbuka", has(modalText, "Kumpulkan Tugas") && has(modalText, "HUK/2026/10/001"));
    check("dropzone dan batas berkas tampil di modal", has(modalText, "Seret berkas ke sini") && has(modalText, "10 MB per berkas"));
    check("textarea catatan opsional tampil", has(modalText, "Catatan (opsional)"));
    await page.screenshot({ path: `${SHOTS}/07-modal-kumpulkan.png`, fullPage: true });

    // Tutup modal via tombol Batal
    const cancelBtn = await page.$('[role="dialog"] button ::-p-text(Batal)');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 }).catch(() => {});
    }
    check("modal tertutup setelah klik Batal", (await page.$('[role="dialog"]')) === null);
  }

  // Pengujian rute detail tugas L07 /tasks/[id]
  await gotoSettled(`${BASE}/tasks/tsk_huk_1`);
  const detailText = await bodyText();
  check("berada di rute detail tugas", page.url().includes("/tasks/tsk_huk_1"), page.url());
  check("judul tugas tampil di halaman detail", has(detailText, "Laporan Hasil Pengawasan Wilayah A"));
  check("nomor tugas mono tampil", has(detailText, "HUK/2026/10/007"));
  check("riwayat pengumpulan memuat Versi 1", has(detailText, "Riwayat Pengumpulan") && has(detailText, "Versi 1"));
  check("berkas lampiran dan checksum tampil", has(detailText, "laporan-pengawasan-wilayah-a.pdf") && has(detailText, "a91f4c0e"));
  check("catatan revisi admin tampil", has(detailText, "Catatan admin:") && has(detailText, "Tanda tangan saksi belum lengkap"));
  check("ketentuan berkas tampil di panel samping", has(detailText, "Ketentuan Berkas") && has(detailText, "10 MB per berkas"));
  check("tautan kembali ke Tugas Saya ada", has(detailText, "Kembali ke Tugas Saya"));
  await page.screenshot({ path: `${SHOTS}/08-detail-tugas.png`, fullPage: true });

  // Akses /reports oleh staf pelaksana wajib ditolak (Forbidden)
  await gotoSettled(`${BASE}/reports`);
  const forbiddenText = await bodyText();
  check("akses laporan ditolak untuk staf", has(forbiddenText, "Akses Laporan Ditolak"));
  // Akses /logs oleh staf pelaksana wajib ditolak (Forbidden)
  await gotoSettled(`${BASE}/logs`);
  const forbiddenLogText = await bodyText();
  check("akses log aktivitas ditolak untuk staf", has(forbiddenLogText, "Akses Log Aktivitas Ditolak"));
  // Akses /master oleh staf pelaksana wajib ditolak (Forbidden)
  await gotoSettled(`${BASE}/master`);
  const forbiddenMasterText = await bodyText();
  check("akses kelola master ditolak untuk staf", has(forbiddenMasterText, "Akses Kelola Master Ditolak"));
});

await step("super admin", async () => {
  await login("super.admin", PASSWORD);
  const text = await bodyText();
  check("super admin melihat seluruh divisi", has(text, "Super Admin") && has(text, "Seluruh divisi"));
  check("super admin melihat Kelola Master dan Semua Tugas", has(text, "Kelola Master") && has(text, "Semua Tugas"));
  check("super admin tidak melihat Tugas Divisi", !has(text, "Tugas Divisi"));
  check("super admin membaca peringatan baca-saja", has(text, "tidak diubah dari akun ini"));
  await page.screenshot({ path: `${SHOTS}/05-dashboard-superadmin.png`, fullPage: true });

  // Uji L12 Semua Tugas (Super Admin) - Akses Baca-Saja
  await gotoSettled(`${BASE}/tasks`);
  const saTaskText = await bodyText();
  check("judul Semua Tugas tampil untuk Super Admin", has(saTaskText, "Semua Tugas"));
  check("super admin tidak melihat tombol Buat Tugas", !has(saTaskText, "Buat Tugas"));
  check("super admin melihat tautan Lihat pada baris tabel", has(saTaskText, "Lihat"));
  const saActions = await page.$$eval("tbody tr td:last-child", (tds) =>
    tds.map((td) => td.textContent.trim()),
  );
  check("super admin hanya memiliki aksi Lihat", saActions.length > 0 && saActions.every((act) => act === "Lihat"));
  check("super admin tidak memiliki aksi Ubah", !has(saTaskText, "Ubah"));

  // Uji L14 Laporan (Super Admin) - Pemilih Seluruh Divisi
  await gotoSettled(`${BASE}/reports`);
  const saReportText = await bodyText();
  check("super admin melihat filter seluruh divisi pada laporan", has(saReportText, "Divisi: Semua") || has(saReportText, "seluruh divisi"));
  // Uji L15 Log Aktivitas (Super Admin)
  await gotoSettled(`${BASE}/logs`);
  const saLogText = await bodyText();
  check("super admin dapat membuka log aktivitas", has(saLogText, "Log Aktivitas"));
  // Uji L17 Kelola Master (Super Admin)
  await gotoSettled(`${BASE}/master`);
  const masterText = await bodyText();
  check("berada di rute /master", page.url().endsWith("/master"), page.url());
  check("judul Kelola Master tampil", has(masterText, "Kelola Master"));
  check("tab Pengguna, Divisi, Kategori ada", has(masterText, "Pengguna") && has(masterText, "Divisi") && has(masterText, "Kategori"));
  check("tombol Tambah Pengguna ada", has(masterText, "Tambah Pengguna"));
  check("akun seed terdaftar di tabel master", has(masterText, "super.admin") && has(masterText, "admin.hukum") && has(masterText, "staf.hukum"));
  check("aksi master Ubah, Reset, Nonaktifkan ada", has(masterText, "Ubah") && has(masterText, "Reset") && has(masterText, "Nonaktifkan"));

  // Uji dialog reset kata sandi
  const resetBtn = await page.$('button ::-p-text(Reset)');
  if (resetBtn) {
    await resetBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    const resetModalText = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
    check("dialog reset kata sandi terbuka", has(resetModalText, "Reset Kata Sandi") && has(resetModalText, "Sesi pengguna akan diakhiri"));
    const cancelResetBtn = await page.$('[role="dialog"] button ::-p-text(Batal)');
    if (cancelResetBtn) {
      await cancelResetBtn.click();
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 }).catch(() => {});
    }
    check("dialog reset kata sandi tertutup", (await page.$('[role="dialog"]')) === null);
  }
  await page.screenshot({ path: `${SHOTS}/17-kelola-master.png`, fullPage: true });
});

await step("akun nonaktif", async () => {
  await login("staf.pengawasan", PASSWORD);
  check("akun aktif lain tetap bisa masuk", page.url().endsWith("/dashboard"), page.url());
});

await step("pembatasan percobaan masuk", async () => {
  await cdp.send("Network.clearBrowserCookies");
  let last = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await gotoSettled(`${BASE}/login`);
    await page.waitForSelector("#username", { timeout: 15000 });
    await page.type("#username", "uji.batas.percobaan");
    await page.type("#password", "salah-sekali");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.querySelector("[role=alert]")?.textContent?.length > 0, { timeout: 15000 }).catch(() => {});
    last = await bodyText();
  }
  check("percobaan keenam ditahan sementara", has(last, "Terlalu banyak percobaan masuk"), last.split("\n").slice(0, 3).join(" | "));
  await page.screenshot({ path: `${SHOTS}/07-login-ditahan.png` });
});

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} pemeriksaan lulus`);
if (failed.length > 0) {
  for (const item of failed) console.log(`GAGAL: ${item.name} ${item.detail}`);
}
process.exit(failed.length === 0 ? 0 : 1);
