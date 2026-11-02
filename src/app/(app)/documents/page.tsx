import { eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import { getActiveCategories } from "@/db/queries/form-data";
import {
  CATALOG_AGE_PRESETS,
  getDocumentCatalog,
} from "@/db/queries/documents";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import DocumentsClient from "./documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage(props: {
  searchParams: Promise<{
    q?: string;
    kategori?: string;
    umur?: string;
    divisi?: string;
    page?: string;
  }>;
}) {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  const { db } = appContext();

  const params = await props.searchParams;
  const q = params.q?.trim() || undefined;
  const categoryId = params.kategori?.trim() || undefined;
  const umurRaw = Number(params.umur);
  const umurHari = (CATALOG_AGE_PRESETS as readonly number[]).includes(umurRaw)
    ? umurRaw
    : undefined;
  // Hanya Super Admin yang boleh memilih divisi selain miliknya (nilai lain
  // diabaikan di kueri untuk role lain).
  const divisionId = scope.allDivisions ? (params.divisi?.trim() || undefined) : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [catalog, categoryOptions, divisionOptions, ownDivision] = await Promise.all([
    getDocumentCatalog(db, scope, { q, categoryId, umurHari, divisionId, page }),
    getActiveCategories(db),
    scope.allDivisions
      ? db.select({ id: divisions.id, name: divisions.name }).from(divisions).orderBy(divisions.name)
      : Promise.resolve([] as { id: string; name: string }[]),
    scope.allDivisions
      ? Promise.resolve(null)
      : db
          .select({ name: divisions.name })
          .from(divisions)
          .where(eq(divisions.id, scope.divisionId))
          .limit(1)
          .then((rows) => rows[0] ?? null),
  ]);

  return (
    <DocumentsClient
      role={scope.role}
      items={catalog.items}
      total={catalog.total}
      page={catalog.page}
      pageSize={catalog.pageSize}
      totalPages={catalog.totalPages}
      filters={{
        q: q ?? "",
        categoryId: categoryId ?? "",
        umur: umurHari ? String(umurHari) : "",
        divisionId: divisionId ?? "",
      }}
      categoryOptions={categoryOptions}
      divisionOptions={divisionOptions}
      userDivisionName={ownDivision?.name ?? "divisi Anda"}
    />
  );
}
