import { getMockTaskDetail } from "@/lib/mock-task-detail";
import TaskEditClient from "./task-edit-client";

export const dynamic = "force-dynamic";

interface TaskEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskEditPage(props: TaskEditPageProps) {
  const { id } = await props.params;
  const task = getMockTaskDetail(id);

  return (
    <TaskEditClient
      initialTask={task}
      divisionName={task.divisionName}
    />
  );
}
