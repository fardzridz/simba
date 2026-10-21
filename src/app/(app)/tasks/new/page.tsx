import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import { appContext } from "@/env";
import { divisions } from "@/db/schema";
import { eq } from "drizzle-orm";
import TaskFormClient from "./task-form-client";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  const { db } = appContext();

  const [division] = await db
    .select({ name: divisions.name, code: divisions.code })
    .from(divisions)
    .where(eq(divisions.id, actor.divisionId))
    .limit(1);

  return (
    <TaskFormClient
      divisionCode={division?.code ?? "HUK"}
      divisionName={division?.name ?? "Hukum & Sengketa"}
    />
  );
}
