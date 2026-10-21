import { eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import DocumentsClient from "./documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  const { db } = appContext();

  const [division] = await db
    .select({ name: divisions.name })
    .from(divisions)
    .where(eq(divisions.id, actor.divisionId))
    .limit(1);

  return (
    <DocumentsClient
      userRole={scope.role}
      userDivisionName={division?.name ?? "Hukum & Sengketa"}
    />
  );
}
