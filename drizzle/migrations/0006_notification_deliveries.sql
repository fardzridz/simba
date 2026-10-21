CREATE TABLE `notification_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`notification_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`last_error` text,
	`provider_ref` text,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notification_deliveries_channel_ck" CHECK("notification_deliveries"."channel" in ('EMAIL','WHATSAPP')),
	CONSTRAINT "notification_deliveries_status_ck" CHECK("notification_deliveries"."status" in ('PENDING','SENDING','SENT','FAILED')),
	CONSTRAINT "notification_deliveries_attempts_ck" CHECK("notification_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `notification_deliveries_due_idx` ON `notification_deliveries` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `notification_deliveries_notification_idx` ON `notification_deliveries` (`notification_id`);