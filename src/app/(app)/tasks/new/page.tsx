import { eq } from "drizzle-orm";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import {
  getActiveCategories,
  getDivisionMembers,
} from "@/db/queries/form-data";
import { categories, divisions } from "@/db/schema";
import ForbiddenState from "../../forbidden-state";
import TaskFormClient from "./task-form-client";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);
  const { db } = appContext();

  // Saat ini pembuatan tugas hanya dapat Admin divisi; UI mengikuti aturan §2.
  if (scope.role !== "ADMIN") {
    return (
      <ForbiddenState
        title="Hanya Admin Divisi"
        message="Menerbitkan surat perintah tugas adalah tugas Admin Divisi. Super Admin bersifat pemantau, dan Staf Pelaksana menerima penugasan."
        supportHint="Hubungi Admin Divisi Anda bila ada pekerjaan yang perlu diterbitkan."
        backHref="/tasks"
        backLabel="Kembali ke Daftar Tugas"
      />
    );
  }

  const [division] = await db
    .select({
      name: divisions.name,
      code: divisions.code,
      defaultCategoryId: divisions.defaultCategoryId,
      defaultPriority: divisions.defaultPriority,
    })
    .from(divisions)
    .where(eq(divisions.id, scope.divisionId))
    .limit(1);

  if (!division) {
    return (
      <ForbiddenState
        title="Divisi tidak ditemukan"
        message="Divisi akun Anda tidak tersedia di data master sehingga formulir tugas tidak dapat dibuka."
        supportHint="Periksa pengaturan divisi bersama Super Admin."
        backHref="/tasks"
        backLabel="Kembali ke Daftar Tugas"
      />
    );
  }

  const [members, activeCategories] = await Promise.all([
    getDivisionMembers(db, scope.divisionId),
    getActiveCategories(db),
  ]);

  // Kategori default mungkin sudah nonaktif atau terhapus. Form tidak memakainya
  // diam-diam; keduanya diberi penjelasan lewat prop di bawah.
  let defaultCategoryName: string | null = null;
  let defaultCategoryInactive: boolean | null = null;
  if (division.defaultCategoryId) {
    const rows = await db
      .select({ name: categories.name, isActive: categories.isActive })
      .from(categories)
      .where(eq(categories.id, division.defaultCategoryId))
      .limit(1);
    const row = rows[0];
    if (row) {
      defaultCategoryName = row.name;
      defaultCategoryInactive = !row.isActive;
    } else {
      defaultCategoryName = null;
      defaultCategoryInactive = true;
    }
  }

  return (
    <TaskFormClient
      divisionName={division.name}
      divisionCode={division.code}
      members={members}
      categories={activeCategories}
      defaultCategoryId={division.defaultCategoryId}
      defaultCategoryName={defaultCategoryName}
      defaultCategoryInactive={defaultCategoryInactive}
      defaultPriority={division.defaultPriority}
    />
  );
}
