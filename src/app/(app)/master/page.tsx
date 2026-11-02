import { getMasterCategories, getMasterDivisions, getMasterUsers } from "@/db/queries/master";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { canManageMasterData, resolveScope } from "@/lib/auth/scope";
import ForbiddenState from "../forbidden-state";
import MasterClient from "./master-client";

export const dynamic = "force-dynamic";

export default async function MasterPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  // Hanya Super Admin yang memiliki hak akses kelola data master
  if (!canManageMasterData(scope)) {
    return (
      <ForbiddenState
        title="Akses Kelola Master Ditolak"
        message="Kelola data master pengguna, divisi, dan kategori hanya dapat diakses oleh Super Admin."
        supportHint="Hubungi administrator sistem bila Anda memerlukan pembaruan data master."
        backHref="/tasks"
        backLabel="Kembali ke Daftar Tugas"
      />
    );
  }

  const { db } = appContext();
  const [users, divisions, categories] = await Promise.all([
    getMasterUsers(db, scope),
    getMasterDivisions(db, scope),
    getMasterCategories(db, scope),
  ]);

  return (
    <MasterClient
      currentUserId={actor.id}
      users={users}
      divisions={divisions}
      categories={categories}
    />
  );
}
