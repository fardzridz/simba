import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import ForbiddenState from "../forbidden-state";
import MasterClient from "./master-client";

export const dynamic = "force-dynamic";

export default async function MasterPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  // Hanya Super Admin yang memiliki hak akses kelola data master
  if (scope.role !== "SUPER_ADMIN") {
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

  return <MasterClient />;
}
