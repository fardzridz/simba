CREATE TABLE `email_change_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`new_email` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_change_requests_token_uq` ON `email_change_requests` (`token_hash`);--> statement-breakpoint
CREATE INDEX `email_change_requests_user_created_idx` ON `email_change_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `channel`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notification_preferences_channel_ck" CHECK("notification_preferences"."channel" in ('EMAIL','WHATSAPP'))
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target` text NOT NULL,
	`purpose` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "otp_codes_purpose_ck" CHECK("otp_codes"."purpose" in ('WA_VERIFY')),
	CONSTRAINT "otp_codes_attempts_ck" CHECK("otp_codes"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `otp_codes_user_purpose_created_idx` ON `otp_codes` (`user_id`,`purpose`,`created_at`);--> statement-breakpoint
CREATE INDEX `otp_codes_target_created_idx` ON `otp_codes` (`target`,`created_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `wa_number` text;--> statement-breakpoint
ALTER TABLE `users` ADD `wa_verified_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_wa_number_uq` ON `users` (`wa_number`);