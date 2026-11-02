DROP INDEX `tasks_division_status_due_idx`;--> statement-breakpoint
CREATE INDEX `tasks_division_due_idx` ON `tasks` (`division_id`,`due_at`);--> statement-breakpoint
ALTER TABLE `app_settings` ADD `updated_by` text REFERENCES users(id);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_divisions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`contact_email` text,
	`default_category_id` text,
	`default_priority` text DEFAULT 'SEDANG' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`default_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "divisions_default_priority_ck" CHECK("__new_divisions"."default_priority" in ('RENDAH','SEDANG','TINGGI','MENDESAK'))
);
--> statement-breakpoint
INSERT INTO `__new_divisions`("id", "name", "code", "is_active", "created_at") SELECT "id", "name", "code", "is_active", "created_at" FROM `divisions`;--> statement-breakpoint
DROP TABLE `divisions`;--> statement-breakpoint
ALTER TABLE `__new_divisions` RENAME TO `divisions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_name_uq` ON `divisions` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_code_uq` ON `divisions` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `notification_deliveries_notification_channel_uq` ON `notification_deliveries` (`notification_id`,`channel`);--> statement-breakpoint
CREATE INDEX `task_assignments_task_status_idx` ON `task_assignments` (`task_id`,`status`);