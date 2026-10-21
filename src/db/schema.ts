import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Enum kanonik: satu sumber untuk skema, validasi, dan UI (§6.3). */
export const ROLES = ["USER", "ADMIN", "SUPER_ADMIN"] as const;
export const PRIORITIES = ["RENDAH", "SEDANG", "TINGGI", "MENDESAK"] as const;
export const ASSIGNMENT_STATUSES = [
  "BELUM_DIKERJAKAN",
  "SEDANG_DIKERJAKAN",
  "MENUNGGU_VERIFIKASI",
  "SELESAI",
  "DIBATALKAN",
] as const;
export const REVIEW_DECISIONS = ["APPROVED", "REVISION_REQUIRED"] as const;
export const FILE_STATES = ["PENDING", "COMMITTED"] as const;
/** Kanal notifikasi eksternal (§1 D8, §9.11). Notifikasi in-app tidak punya baris preferensi. */
export const CHANNELS = ["EMAIL", "WHATSAPP"] as const;
/** Satu-satunya tujuan kode OTP saat ini: verifikasi nomor WhatsApp milik sendiri (§9.11). */
export const OTP_PURPOSES = ["WA_VERIFY"] as const;
export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "REVISION_REQUESTED",
  "SUBMISSION_RECEIVED",
  "TASK_CANCELLED",
  "DUE_SOON",
] as const;

/**
 * Setelan operasional satu baris (§6.4). Batas unggah adalah batas atas;
 * nilai aktif hanya boleh menurunkan, bukan menaikkan, batas aplikasi.
 */
export const appSettings = sqliteTable(
  "app_settings",
  {
    id: integer("id").primaryKey().default(1),
    maxFileBytes: integer("max_file_bytes").notNull().default(10 * 1024 * 1024),
    maxFilesPerSubmission: integer("max_files_per_submission").notNull().default(5),
    allowedTypes: text("allowed_types")
      .notNull()
      .default('["pdf","doc","docx","xls","xlsx","jpg","jpeg","png"]'),
    dueSoonDays: integer("due_soon_days").notNull().default(3),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    check("app_settings_singleton_ck", sql`${t.id} = 1`),
    check(
      "app_settings_max_file_bytes_ck",
      sql`${t.maxFileBytes} between 1048576 and 10485760`,
    ),
    check(
      "app_settings_max_files_ck",
      sql`${t.maxFilesPerSubmission} between 1 and 5`,
    ),
    check("app_settings_due_soon_ck", sql`${t.dueSoonDays} between 1 and 30`),
  ],
);

export const divisions = sqliteTable(
  "divisions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("divisions_name_uq").on(t.name), uniqueIndex("divisions_code_uq").on(t.code)],
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    divisionId: text("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }),
    username: text("username").notNull(),
    email: text("email"),
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),
    waNumber: text("wa_number"),
    waVerifiedAt: integer("wa_verified_at", { mode: "timestamp" }),
    fullName: text("full_name").notNull(),
    nip: text("nip"),
    position: text("position"),
    passwordHash: text("password_hash").notNull(),
    passwordChangedAt: integer("password_changed_at", { mode: "timestamp" }).notNull(),
    role: text("role", { enum: ROLES }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("users_username_uq").on(t.username),
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_nip_uq").on(t.nip),
    uniqueIndex("users_wa_number_uq").on(t.waNumber),
    index("users_division_role_idx").on(t.divisionId, t.role),
    check("users_role_ck", sql`${t.role} in ('USER','ADMIN','SUPER_ADMIN')`),
    check("users_username_trim_ck", sql`length(trim(${t.username})) > 0`),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("categories_name_uq").on(t.name)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    divisionId: text("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    taskNumber: text("task_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("SEDANG"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    startAt: integer("start_at", { mode: "timestamp" }).notNull(),
    dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
    cancelReason: text("cancel_reason"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("tasks_task_number_uq").on(t.taskNumber),
    index("tasks_division_status_due_idx").on(t.divisionId, t.dueAt),
    index("tasks_division_created_idx").on(t.divisionId, t.createdAt),
    check("tasks_priority_ck", sql`${t.priority} in ('RENDAH','SEDANG','TINGGI','MENDESAK')`),
    check("tasks_due_after_start_ck", sql`${t.dueAt} >= ${t.startAt}`),
    check("tasks_cancel_ck", sql`(${t.cancelledAt} is null) or (${t.cancelReason} is not null and length(trim(${t.cancelReason})) > 0)`),
  ],
);

export const taskAssignments = sqliteTable(
  "task_assignments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status", { enum: ASSIGNMENT_STATUSES }).notNull().default("BELUM_DIKERJAKAN"),
    needsRevision: integer("needs_revision", { mode: "boolean" }).notNull().default(false),
    revisionCount: integer("revision_count").notNull().default(0),
    startedAt: integer("started_at", { mode: "timestamp" }),
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("task_assignments_task_user_uq").on(t.taskId, t.userId),
    index("task_assignments_user_status_idx").on(t.userId, t.status),
    index("task_assignments_status_updated_idx").on(t.status, t.updatedAt),
    check(
      "task_assignments_status_ck",
      sql`${t.status} in ('BELUM_DIKERJAKAN','SEDANG_DIKERJAKAN','MENUNGGU_VERIFIKASI','SELESAI','DIBATALKAN')`,
    ),
  ],
);

export const taskSubmissions = sqliteTable(
  "task_submissions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => taskAssignments.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    notes: text("notes"),
    state: text("state", { enum: FILE_STATES }).notNull().default("PENDING"),
    idempotencyKey: text("idempotency_key").notNull(),
    submittedBy: text("submitted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("task_submissions_assignment_version_uq").on(t.assignmentId, t.version),
    uniqueIndex("task_submissions_idempotency_uq").on(t.idempotencyKey),
    check("task_submissions_state_ck", sql`${t.state} in ('PENDING','COMMITTED')`),
    check("task_submissions_version_ck", sql`${t.version} >= 1`),
  ],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => taskSubmissions.id, { onDelete: "restrict" }),
    originalName: text("original_name").notNull(),
    storedKey: text("stored_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    state: text("state", { enum: FILE_STATES }).notNull().default("PENDING"),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("attachments_stored_key_uq").on(t.storedKey),
    index("attachments_submission_state_idx").on(t.submissionId, t.state),
    check("attachments_state_ck", sql`${t.state} in ('PENDING','COMMITTED')`),
    check("attachments_size_ck", sql`${t.sizeBytes} > 0 and ${t.sizeBytes} <= 10485760`),
  ],
);

export const taskReviews = sqliteTable(
  "task_reviews",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => taskSubmissions.id, { onDelete: "restrict" }),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    decision: text("decision", { enum: REVIEW_DECISIONS }).notNull(),
    feedback: text("feedback"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("task_reviews_submission_idx").on(t.submissionId),
    check("task_reviews_decision_ck", sql`${t.decision} in ('APPROVED','REVISION_REQUIRED')`),
    check(
      "task_reviews_feedback_ck",
      sql`${t.decision} = 'APPROVED' or (${t.feedback} is not null and length(trim(${t.feedback})) > 0)`,
    ),
  ],
);

export const documentArchive = sqliteTable(
  "document_archive",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => taskAssignments.id, { onDelete: "restrict" }),
    submissionId: text("submission_id")
      .notNull()
      .references(() => taskSubmissions.id, { onDelete: "restrict" }),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "restrict" }),
    divisionId: text("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("document_archive_assignment_uq").on(t.assignmentId),
    index("document_archive_division_archived_idx").on(t.divisionId, t.archivedAt),
  ],
);

/**
 * Outbox pengiriman kanal luar (§1 D8, §9.1). Notifikasi in-app tetap sumber
 * kebenaran; baris di sini hanya ada untuk kanal yang menyala dan alamatnya
 * sudah terverifikasi. Worker cron membaca antrean ini.
 */
export const NOTIFICATION_DELIVERY_STATUSES = [
  "PENDING",
  "SENDING",
  "SENT",
  "FAILED",
] as const;

export const notificationDeliveries = sqliteTable(
  "notification_deliveries",
  {
    id: text("id").primaryKey(),
    notificationId: text("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: CHANNELS }).notNull(),
    status: text("status", { enum: NOTIFICATION_DELIVERY_STATUSES })
      .notNull()
      .default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at", { mode: "timestamp" }).notNull(),
    lastError: text("last_error"),
    providerRef: text("provider_ref"),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("notification_deliveries_due_idx").on(t.status, t.nextAttemptAt),
    index("notification_deliveries_notification_idx").on(t.notificationId),
    check(
      "notification_deliveries_channel_ck",
      sql`${t.channel} in ('EMAIL','WHATSAPP')`,
    ),
    check(
      "notification_deliveries_status_ck",
      sql`${t.status} in ('PENDING','SENDING','SENT','FAILED')`,
    ),
    check("notification_deliveries_attempts_ck", sql`${t.attempts} >= 0`),
  ],
);

export const notificationPreferences = sqliteTable(
  "notification_preferences",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: CHANNELS }).notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.channel] }),
    check("notification_preferences_channel_ck", sql`${t.channel} in ('EMAIL','WHATSAPP')`),
  ],
);

/**
 * Kode OTP disimpan sebagai hash, bukan kode mentah, dan tidak pernah masuk
 * `activity_logs` (§9.11). Batas kirim dibaca dari `created_at`, bukan dari memori isolate.
 */
export const otpCodes = sqliteTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    target: text("target").notNull(),
    purpose: text("purpose", { enum: OTP_PURPOSES }).notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("otp_codes_user_purpose_created_idx").on(t.userId, t.purpose, t.createdAt),
    index("otp_codes_target_created_idx").on(t.target, t.createdAt),
    check("otp_codes_purpose_ck", sql`${t.purpose} in ('WA_VERIFY')`),
    check("otp_codes_attempts_ck", sql`${t.attempts} >= 0`),
  ],
);

/**
 * Permintaan ubah surel: `users.email` tidak berubah sampai token dibuka, dan
 * token disimpan sebagai hash dengan masa berlaku 24 jam serta sekali pakai (§9.11).
 */
export const emailChangeRequests = sqliteTable(
  "email_change_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    newEmail: text("new_email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("email_change_requests_token_uq").on(t.tokenHash),
    index("email_change_requests_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    message: text("message").notNull(),
    readAt: integer("read_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("notifications_user_read_idx").on(t.userId, t.readAt)],
);

export const activityLogs = sqliteTable(
  "activity_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    prevValue: text("prev_value"),
    newValue: text("new_value"),
    ipAddress: text("ip_address"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("activity_logs_entity_idx").on(t.entityType, t.entityId, t.createdAt),
    index("activity_logs_action_ip_idx").on(t.action, t.ipAddress, t.createdAt),
  ],
);

export type Channel = (typeof CHANNELS)[number];
export type OtpPurpose = (typeof OTP_PURPOSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type Role = (typeof ROLES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];
export type FileState = (typeof FILE_STATES)[number];
