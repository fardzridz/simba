import { requireActor } from "@/lib/auth/current";
import { resolveScope } from "@/lib/auth/scope";
import { appContext } from "@/env";
import { externalChannelsAllowed } from "@/lib/jobs/deliveries";
import {
  getAppSettingsView,
  getDivisionSettingsList,
} from "@/db/queries/settings";
import { getActiveCategories } from "@/db/queries/form-data";
import ForbiddenState from "../forbidden-state";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const actor = await requireActor();
  const scope = resolveScope(actor);

  // Staf Pelaksana tidak memiliki hak akses ke layar Pengaturan
  if (scope.role === "USER") {
    return (
      <ForbiddenState
        title="Akses Pengaturan Ditolak"
        message="Pengaturan operasional divisi dan sistem hanya dapat diakses oleh Admin Divisi dan Super Admin."
        supportHint="Hubungi Admin Divisi atau Super Admin bila Anda memerlukan penyesuaian batas berkas atau nilai awal formulir."
        backHref="/tasks"
        backLabel="Kembali ke Daftar Tugas"
      />
    );
  }

  const { db, env } = appContext();
  const [appSettings, divisions, categories] = await Promise.all([
    getAppSettingsView(db),
    getDivisionSettingsList(db, scope),
    getActiveCategories(db),
  ]);

  return (
    <SettingsClient
      role={scope.role}
      userDivisionId={actor.divisionId}
      appSettings={appSettings}
      divisions={divisions}
      categories={categories}
      externalChannelsEnabled={externalChannelsAllowed(env)}
    />
  );
}
