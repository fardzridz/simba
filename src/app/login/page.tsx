import { redirect } from "next/navigation";
import { version } from "../../../package.json";
import { loadActor } from "@/lib/auth/current";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const actor = await loadActor();
  if (actor) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="card p-6">
          <div className="text-center">
            <p className="mx-auto inline-flex h-8 items-center rounded-md border border-border-strong bg-neutral-surface px-3 text-body-sm text-ink-2">
              [LOGO]
            </p>
            <h1 className="mt-4 text-h1">Portal Manajemen Penugasan &amp; Dokumen Divisi</h1>
            <p className="mt-1 text-body-sm text-ink-3">Bawaslu Kota Pasuruan. Akses terbatas untuk pegawai.</p>
          </div>

          <LoginForm />

          <div className="mt-5 space-y-1 text-body-sm text-ink-3">
            <p>5 percobaan gagal dalam 1 menit akan ditahan sementara.</p>
            <p>Sesi berakhir otomatis setelah 8 jam tanpa aktivitas.</p>
          </div>

          <hr className="mt-4 border-t border-border" />

          <p className="mt-4 text-body-sm text-ink-2">Lupa kata sandi? Hubungi Super Admin untuk pengaturan ulang.</p>
        </div>

        <p className="mt-4 text-center text-body-sm text-ink-3">Versi {version}</p>
      </div>
    </main>
  );
}
