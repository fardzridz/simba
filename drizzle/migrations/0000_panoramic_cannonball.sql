CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`prev_value` text,
	`new_value` text,
	`ip_address` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_logs_entity_idx` ON `activity_logs` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`original_name` text NOT NULL,
	`stored_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`checksum_sha256` text NOT NULL,
	`state` text DEFAULT 'PENDING' NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `task_submissions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "attachments_state_ck" CHECK("attachments"."state" in ('PENDING','COMMITTED')),
	CONSTRAINT "attachments_size_ck" CHECK("attachments"."size_bytes" > 0 and "attachments"."size_bytes" <= 10485760)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attachments_stored_key_uq` ON `attachments` (`stored_key`);--> statement-breakpoint
CREATE INDEX `attachments_submission_state_idx` ON `attachments` (`submission_id`,`state`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_uq` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `divisions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_name_uq` ON `divisions` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_code_uq` ON `divisions` (`code`);--> statement-breakpoint
CREATE TABLE `document_archive` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`task_id` text NOT NULL,
	`division_id` text NOT NULL,
	`title` text NOT NULL,
	`archived_at` integer NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `task_assignments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submission_id`) REFERENCES `task_submissions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_archive_assignment_uq` ON `document_archive` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `document_archive_division_archived_idx` ON `document_archive` (`division_id`,`archived_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`message` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `task_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'BELUM_DIKERJAKAN' NOT NULL,
	`needs_revision` integer DEFAULT false NOT NULL,
	`revision_count` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`submitted_at` integer,
	`completed_at` integer,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_assignments_status_ck" CHECK("task_assignments"."status" in ('BELUM_DIKERJAKAN','SEDANG_DIKERJAKAN','MENUNGGU_VERIFIKASI','SELESAI','DIBATALKAN'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_assignments_task_user_uq` ON `task_assignments` (`task_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `task_assignments_user_status_idx` ON `task_assignments` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `task_assignments_status_updated_idx` ON `task_assignments` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `task_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`decision` text NOT NULL,
	`feedback` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `task_submissions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_reviews_decision_ck" CHECK("task_reviews"."decision" in ('APPROVED','REVISION_REQUIRED')),
	CONSTRAINT "task_reviews_feedback_ck" CHECK("task_reviews"."decision" = 'APPROVED' or ("task_reviews"."feedback" is not null and length(trim("task_reviews"."feedback")) > 0))
);
--> statement-breakpoint
CREATE INDEX `task_reviews_submission_idx` ON `task_reviews` (`submission_id`);--> statement-breakpoint
CREATE TABLE `task_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`version` integer NOT NULL,
	`notes` text,
	`state` text DEFAULT 'PENDING' NOT NULL,
	`idempotency_key` text NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `task_assignments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_submissions_state_ck" CHECK("task_submissions"."state" in ('PENDING','COMMITTED')),
	CONSTRAINT "task_submissions_version_ck" CHECK("task_submissions"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_submissions_assignment_version_uq` ON `task_submissions` (`assignment_id`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_submissions_idempotency_uq` ON `task_submissions` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`division_id` text NOT NULL,
	`category_id` text NOT NULL,
	`task_number` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'SEDANG' NOT NULL,
	`created_by` text NOT NULL,
	`start_at` integer NOT NULL,
	`due_at` integer NOT NULL,
	`cancelled_at` integer,
	`cancel_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "tasks_priority_ck" CHECK("tasks"."priority" in ('RENDAH','SEDANG','TINGGI','MENDESAK')),
	CONSTRAINT "tasks_due_after_start_ck" CHECK("tasks"."due_at" >= "tasks"."start_at"),
	CONSTRAINT "tasks_cancel_ck" CHECK(("tasks"."cancelled_at" is null) or ("tasks"."cancel_reason" is not null and length(trim("tasks"."cancel_reason")) > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_task_number_uq` ON `tasks` (`task_number`);--> statement-breakpoint
CREATE INDEX `tasks_division_status_due_idx` ON `tasks` (`division_id`,`due_at`);--> statement-breakpoint
CREATE INDEX `tasks_division_created_idx` ON `tasks` (`division_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`division_id` text NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`full_name` text NOT NULL,
	`nip` text,
	`position` text,
	`password_hash` text NOT NULL,
	`password_changed_at` integer NOT NULL,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "users_role_ck" CHECK("users"."role" in ('USER','ADMIN','SUPER_ADMIN')),
	CONSTRAINT "users_username_trim_ck" CHECK(length(trim("users"."username")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_uq` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_nip_uq` ON `users` (`nip`);--> statement-breakpoint
CREATE INDEX `users_division_role_idx` ON `users` (`division_id`,`role`);