-- Seed produksi (master data) tanpa akun pengguna: 5 divisi, 8 kategori.
-- Dihasilkan oleh scripts/build-seed.mjs --prod-master; jangan diedit manual.
-- Akun pertama (Super Admin) dibuat lewat scripts/bootstrap-admin.mjs (UC02)
-- dengan kata sandi yang tidak tersimpan di repositori ini.

INSERT OR IGNORE INTO divisions (id, name, code, is_active, created_at) VALUES ('div_hukum', 'Hukum & Sengketa', 'HUK', 1, 1793987013);
INSERT OR IGNORE INTO divisions (id, name, code, is_active, created_at) VALUES ('div_pengawasan', 'Pengawasan', 'PGS', 1, 1793987013);
INSERT OR IGNORE INTO divisions (id, name, code, is_active, created_at) VALUES ('div_sdm', 'SDM & Organisasi', 'SDM', 1, 1793987013);
INSERT OR IGNORE INTO divisions (id, name, code, is_active, created_at) VALUES ('div_sekretariat', 'Sekretariat', 'SEK', 1, 1793987013);
INSERT OR IGNORE INTO divisions (id, name, code, is_active, created_at) VALUES ('div_penindakan', 'Penindakan', 'TND', 1, 1793987013);
INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES ('cat_kepegawaian', 'Kepegawaian', 1, 1793987013);
INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES ('cat_persuratan', 'Persuratan', 1, 1793987013);
INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES ('cat_kearsipan', 'Kearsipan', 1, 1793987013);
INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES ('cat_keuangan', 'Keuangan', 1, 1793987013);
INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES ('cat_aset_bmn', 'Aset/BMN', 1, 1793987013);
INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES ('cat_kegiatan_dan_laporan', 'Kegiatan dan Laporan', 1, 1793987013);
INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES ('cat_kepatuhan', 'Kepatuhan', 1, 1793987013);
INSERT OR IGNORE INTO categories (id, name, is_active, created_at) VALUES ('cat_sdm_dan_keamanan', 'SDM dan Keamanan', 1, 1793987013);
