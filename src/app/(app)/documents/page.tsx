import { asc, eq } from "drizzle-orm";
import { categories, divisions } from "@/db/schema";
import { getFinalDocuments } from "@/db/queries/documents";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import DocumentsClient from "./documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  const { db } = appContext();

  const [documents, divisionRows, categoryRows] = await Promise.all([
    getFinalDocuments(db, scope),
    db
      .select({ name: divisions.name })
      .from(divisions)
      .where(eq(divisions.id, actor.divisionId))
      .limit(1),
    db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.name)),
  ]);

  return (
    <DocumentsClient
      userRole={scope.role}
      userDivisionName={divisionRows[0]?.name ?? ""}
      documents={documents}
      categoryNames={categoryRows.map((row) => row.name)}
    />
  );
}
