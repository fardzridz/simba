CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`max_file_bytes` integer DEFAULT 10485760 NOT NULL,
	`max_files_per_submission` integer DEFAULT 5 NOT NULL,
	`allowed_types` text DEFAULT '["pdf","doc","docx","xls","xlsx","jpg","jpeg","png"]' NOT NULL,
	`due_soon_days` integer DEFAULT 3 NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "app_settings_singleton_ck" CHECK("app_settings"."id" = 1),
	CONSTRAINT "app_settings_max_file_bytes_ck" CHECK("app_settings"."max_file_bytes" between 1048576 and 10485760),
	CONSTRAINT "app_settings_max_files_ck" CHECK("app_settings"."max_files_per_submission" between 1 and 5),
	CONSTRAINT "app_settings_due_soon_ck" CHECK("app_settings"."due_soon_days" between 1 and 30)
);
--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`id`, `updated_at`) VALUES (1, unixepoch());
