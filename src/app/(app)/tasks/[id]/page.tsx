import { notFound } from "next/navigation";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import { getTaskDetail } from "@/db/queries/task-detail";
import TaskDetailClient from "./task-detail-client";
import TaskReviewClient from "./task-review-client";

export const dynamic = "force-dynamic";

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assignment?: string | string[] }>;
}

export default async function TaskDetailPage(props: TaskDetailPageProps) {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  const { id } = await props.params;
  const query = await props.searchParams;
  const assignmentId =
    typeof query.assignment === "string" ? query.assignment : undefined;

  const { db } = appContext();
  const task = await getTaskDetail(db, scope, id, assignmentId);

  if (!task) notFound();

  if (scope.role === "ADMIN" || scope.role === "SUPER_ADMIN") {
    return (
      <TaskReviewClient
        initialTask={task}
        isSuperAdmin={scope.role === "SUPER_ADMIN"}
      />
    );
  }

  return <TaskDetailClient initialTask={task} />;
}
