PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_task_submissions` (
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
	CONSTRAINT "task_submissions_state_ck" CHECK("__new_task_submissions"."state" in ('PENDING','COMMITTED')),
	CONSTRAINT "task_submissions_version_ck" CHECK("__new_task_submissions"."version" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_task_submissions`("id", "assignment_id", "version", "notes", "state", "idempotency_key", "submitted_by", "created_at") SELECT "id", "assignment_id", "version", "notes", "state", "idempotency_key", "submitted_by", "created_at" FROM `task_submissions`;--> statement-breakpoint
DROP TABLE `task_submissions`;--> statement-breakpoint
ALTER TABLE `__new_task_submissions` RENAME TO `task_submissions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `task_submissions_assignment_version_uq` ON `task_submissions` (`assignment_id`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_submissions_idempotency_uq` ON `task_submissions` (`idempotency_key`);