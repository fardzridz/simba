CREATE INDEX `activity_logs_created_idx` ON `activity_logs` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `document_archive_archived_idx` ON `document_archive` (`archived_at`,`id`);--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_at`);