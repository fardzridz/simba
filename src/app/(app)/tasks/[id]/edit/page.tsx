import { notFound } from "next/navigation";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import { getTaskEditData } from "@/db/queries/form-data";
import { getActiveCategories, getDivisionMembers } from "@/db/queries/form-data";
import ForbiddenState from "../../../forbidden-state";
import TaskEditClient from "./task-edit-client";

export const dynamic = "force-dynamic";

interface TaskEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskEditPage(props: TaskEditPageProps) {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  const { id } = await props.params;

  // Mengubah tugas adalah kewenangan Admin divisi (§2); Super Admin baca-saja.
  if (scope.role !== "ADMIN") {
    return (
      <ForbiddenState
        title="Hanya Admin Divisi"
        message="Mengubah rincian penugasan adalah tugas Admin Divisi. Super Admin bersifat pemantau, dan Staf Pelaksana menerima penugasan."
        supportHint="Hubungi Admin Divisi Anda bila ada rincian tugas yang perlu dikoreksi."
        backHref="/tasks"
        backLabel="Kembali ke Daftar Tugas"
      />
    );
  }

  const { db } = appContext();
  const task = await getTaskEditData(db, scope, id);

  if (!task) notFound();

  const [members, categories] = await Promise.all([
    getDivisionMembers(db, scope.divisionId),
    getActiveCategories(db),
  ]);

  return (
    <TaskEditClient task={task} members={members} categories={categories} />
  );
}
