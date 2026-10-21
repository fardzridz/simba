import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/env";
import {
  attachments,
  categories,
  divisions,
  taskAssignments,
  taskReviews,
  taskSubmissions,
  tasks,
  users,
  type AssignmentStatus,
  type Priority,
} from "@/db/schema";
import type { Scope } from "@/lib/auth/scope";
import {
  formatJakartaNotification,
  humanizeElapsed,
  humanizeRemaining,
  isOverdue,
  nowSeconds,
} from "@/lib/time";

export type TaskDetailFile = {
  id: string;
  name: string;
  sizeFormatted: string;
  checksum: string;
  downloadUrl?: string;
};

export type TaskDetailSubmission = {
  version: number;
  submittedAtFormatted: string;
  reviewStatus: "REVISION_REQUIRED" | "APPROVED" | "PENDING";
  reviewStatusLabel: string;
  submitterNotes?: string;
  adminFeedback?: string;
  reviewedByName?: string;
  reviewedAtFormatted?: string;
  files: TaskDetailFile[];
};

export type TaskDetail = {
  id: string;
  assignmentId: string;
  taskNumber: string;
  title: string;
  description: string;
  divisionName: string;
  categoryName: string;
  priority: Priority;
  status: AssignmentStatus;
  needsRevision: boolean;
  isOverdue?: boolean;
  assignedStaffName?: string;
  assignedStaffInitials?: string;
  waitingDurationFormatted?: string;
  dueAtFormatted: string;
  remainingFormatted: string;
  createdByName: string;
  createdAtFormatted: string;
  cancelReason?: string | null;
  currentVersion: number;
  submissionHistory: TaskDetailSubmission[];
};

const REVIEW_LABEL = {
  APPROVED: "Disetujui",
  REVISION_REQUIRED: "Perlu Revisi",
  PENDING: "Menunggu Verifikasi",
} as const;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Detail satu tugas dengan cakupan peran:
 * - USER hanya penugasan miliknya,
 * - ADMIN hanya divisinya,
 * - SUPER_ADMIN lintas divisi (baca-saja di UI).
 * `assignmentId` opsional dipakai saat tabel menautkan baris penugasan tertentu.
 */
export async function getTaskDetail(
  db: Db,
  scope: Scope,
  taskId: string,
  assignmentId?: string,
): Promise<TaskDetail | null> {
  const taskConditions = [eq(tasks.id, taskId)];
  if (scope.role === "ADMIN" || scope.role === "USER") {
    taskConditions.push(eq(tasks.divisionId, scope.divisionId));
  }

  const [task] = await db
    .select({
      id: tasks.id,
      taskNumber: tasks.taskNumber,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
      cancelReason: tasks.cancelReason,
      createdAt: tasks.createdAt,
      divisionName: divisions.name,
      categoryName: categories.name,
      createdByName: users.fullName,
    })
    .from(tasks)
    .innerJoin(divisions, eq(divisions.id, tasks.divisionId))
    .innerJoin(categories, eq(categories.id, tasks.categoryId))
    .innerJoin(users, eq(users.id, tasks.createdBy))
    .where(and(...taskConditions))
    .limit(1);

  if (!task) return null;

  const assignmentConditions = [eq(taskAssignments.taskId, taskId)];
  if (scope.role === "USER") {
    assignmentConditions.push(eq(taskAssignments.userId, scope.userId));
  }
  if (assignmentId) {
    assignmentConditions.push(eq(taskAssignments.id, assignmentId));
  }

  const assignmentRows = await db
    .select({
      id: taskAssignments.id,
      userId: taskAssignments.userId,
      status: taskAssignments.status,
      needsRevision: taskAssignments.needsRevision,
      submittedAt: taskAssignments.submittedAt,
      assigneeName: users.fullName,
    })
    .from(taskAssignments)
    .innerJoin(users, eq(users.id, taskAssignments.userId))
    .where(and(...assignmentConditions))
    .orderBy(asc(taskAssignments.createdAt), asc(taskAssignments.id));

  if (assignmentRows.length === 0) return null;

  const selected = assignmentRows[0]!;
  const assigneeNames = assignmentRows.map((row) => row.assigneeName);

  const submissionRows = await db
    .select({
      id: taskSubmissions.id,
      version: taskSubmissions.version,
      notes: taskSubmissions.notes,
      createdAt: taskSubmissions.createdAt,
    })
    .from(taskSubmissions)
    .where(
      and(
        eq(taskSubmissions.assignmentId, selected.id),
        eq(taskSubmissions.state, "COMMITTED"),
      ),
    )
    .orderBy(desc(taskSubmissions.version));

  const submissionIds = submissionRows.map((row) => row.id);

  const attachmentRows =
    submissionIds.length > 0
      ? await db
          .select({
            id: attachments.id,
            submissionId: attachments.submissionId,
            originalName: attachments.originalName,
            sizeBytes: attachments.sizeBytes,
            checksumSha256: attachments.checksumSha256,
          })
          .from(attachments)
          .where(
            and(
              inArray(attachments.submissionId, submissionIds),
              eq(attachments.state, "COMMITTED"),
            ),
          )
          .orderBy(asc(attachments.createdAt), asc(attachments.id))
      : [];

  const reviewRows =
    submissionIds.length > 0
      ? await db
          .select({
            submissionId: taskReviews.submissionId,
            decision: taskReviews.decision,
            feedback: taskReviews.feedback,
            createdAt: taskReviews.createdAt,
            reviewerName: users.fullName,
          })
          .from(taskReviews)
          .innerJoin(users, eq(users.id, taskReviews.reviewerId))
          .where(inArray(taskReviews.submissionId, submissionIds))
          .orderBy(desc(taskReviews.createdAt), desc(taskReviews.id))
      : [];

  const filesBySubmission = new Map<string, TaskDetailFile[]>();
  for (const file of attachmentRows) {
    const list = filesBySubmission.get(file.submissionId) ?? [];
    list.push({
      id: file.id,
      name: file.originalName,
      sizeFormatted: formatBytes(file.sizeBytes),
      checksum: file.checksumSha256.slice(0, 8),
      downloadUrl: `/api/attachments/${file.id}/download`,
    });
    filesBySubmission.set(file.submissionId, list);
  }

  const latestReviewBySubmission = new Map<
    string,
    (typeof reviewRows)[number]
  >();
  for (const review of reviewRows) {
    if (!latestReviewBySubmission.has(review.submissionId)) {
      latestReviewBySubmission.set(review.submissionId, review);
    }
  }

  const submissionHistory: TaskDetailSubmission[] = submissionRows.map((submission) => {
    const review = latestReviewBySubmission.get(submission.id);
    const reviewStatus = review?.decision ?? "PENDING";
    return {
      version: submission.version,
      submittedAtFormatted: formatJakartaNotification(submission.createdAt),
      reviewStatus,
      reviewStatusLabel: REVIEW_LABEL[reviewStatus],
      submitterNotes: submission.notes ?? undefined,
      adminFeedback: review?.feedback ?? undefined,
      reviewedByName: review?.reviewerName,
      reviewedAtFormatted: review
        ? formatJakartaNotification(review.createdAt)
        : undefined,
      files: filesBySubmission.get(submission.id) ?? [],
    };
  });

  const now = nowSeconds();
  const dueEpoch = Math.floor(task.dueAt.getTime() / 1000);
  const overdue = isOverdue({ dueAt: dueEpoch, status: selected.status, now });

  let remainingFormatted: string;
  if (selected.status === "SELESAI") {
    remainingFormatted = "Selesai";
  } else if (selected.status === "DIBATALKAN") {
    remainingFormatted = "Dibatalkan";
  } else if (overdue) {
    remainingFormatted = `Terlambat ${humanizeElapsed(now - dueEpoch)}`;
  } else {
    remainingFormatted = `Sisa ${humanizeRemaining(dueEpoch, now)}`;
  }

  const waitingDurationFormatted =
    selected.status === "MENUNGGU_VERIFIKASI" && selected.submittedAt
      ? humanizeElapsed(now - Math.floor(selected.submittedAt.getTime() / 1000))
      : undefined;

  return {
    id: task.id,
    assignmentId: selected.id,
    taskNumber: task.taskNumber,
    title: task.title,
    description: task.description ?? "",
    divisionName: task.divisionName,
    categoryName: task.categoryName,
    priority: task.priority,
    status: selected.status,
    needsRevision: selected.needsRevision,
    isOverdue: overdue,
    assignedStaffName:
      assigneeNames.length > 1 ? assigneeNames.join(", ") : selected.assigneeName,
    assignedStaffInitials: initialsOf(selected.assigneeName),
    waitingDurationFormatted,
    dueAtFormatted: formatJakartaNotification(task.dueAt),
    remainingFormatted,
    createdByName: task.createdByName,
    createdAtFormatted: formatJakartaNotification(task.createdAt),
    cancelReason: task.cancelReason,
    currentVersion: submissionRows[0]?.version ?? 0,
    submissionHistory,
  };
}
