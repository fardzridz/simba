import { notFound } from "next/navigation";
import { userProfile } from "@/db/queries/account";
import { appContext } from "@/env";
import { requireActor } from "@/lib/auth/current";
import { ROLE_LABEL } from "@/lib/nav";
import PasswordForm from "./password-form";
import ContactNotificationCard from "./contact-notification-card";
export const dynamic = "force-dynamic";

export default async function AccountPage(props: {
  searchParams: Promise<{ kontak?: string | string[] }>;
}) {
  const params = await props.searchParams;
  const contactNotice =
    params.kontak === "surel-terverifikasi"
      ? { tone: "success" as const, text: "Alamat surel berhasil diperbarui dan diverifikasi." }
      : params.kontak === "gagal"
        ? {
            tone: "error" as const,
            text: "Tautan verifikasi tidak dapat dipakai. Tautan mungkin sudah kedaluwarsa atau pernah dibuka.",
          }
        : null;

  const actor = await requireActor();
  const { db } = appContext();
  const profile = await userProfile(db, actor.id);

  if (!profile) {
    notFound();
  }

  const divisionDisplay =
    profile.role === "SUPER_ADMIN"
      ? "Semua Divisi (Lintas Divisi)"
      : `${profile.divisionName} (${profile.divisionCode})`;

  const profileRows = [
    { label: "Nama Lengkap", value: profile.fullName, mono: false },
    { label: "NIP", value: profile.nip ?? "-", mono: false },
    { label: "Jabatan", value: profile.position ?? ROLE_LABEL[profile.role], mono: false },
    { label: "Divisi", value: divisionDisplay, mono: false },
    {
      label: "Peran",
      value: (
        <span className="inline-flex items-center rounded bg-neutral-surface px-2.5 py-0.5 text-body-sm font-medium text-ink-2">
          {ROLE_LABEL[profile.role]}
        </span>
      ),
      custom: true,
    },
    { label: "Nama Pengguna", value: profile.username, mono: true },
    { label: "Surel", value: profile.email ?? "-", mono: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-semibold text-ink">Akun Saya</h1>
        <p className="mt-1 text-body text-ink-3">
          Profil kepegawaian, kontak, dan keamanan akun.
        </p>
      </div>

      {contactNotice ? (
        <p
          role="status"
          className={`rounded-lg border p-3.5 text-body-sm font-medium ${
            contactNotice.tone === "success"
              ? "border-success/30 bg-success-surface text-success"
              : "border-error/30 bg-error-surface text-error"
          }`}
        >
          {contactNotice.text}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-2">
        {/* Kartu 1: Profil Kepegawaian */}
        <section aria-labelledby="profil-title" className="card flex flex-col p-4 desktop:p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 id="profil-title" className="text-h2 font-semibold text-ink">
              Profil
            </h2>
            <span className="text-body-sm text-ink-3">Diubah Super Admin</span>
          </div>

          <div className="divide-y divide-surface-sunken">
            {profileRows.map((row) => (
              <div
                key={row.label}
                className="flex flex-col py-3 tablet:flex-row tablet:items-center tablet:justify-between"
              >
                <span className="w-40 shrink-0 text-body-sm text-ink-3">{row.label}</span>
                {row.custom ? (
                  <div>{row.value}</div>
                ) : (
                  <span
                    className={`text-body text-ink ${
                      row.mono ? "font-mono" : ""
                    }`}
                  >
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto border-t border-border pt-4 space-y-1">
            <p className="text-body-sm text-ink-3">
              Data kepegawaian diubah Super Admin.
            </p>
            <p className="text-body-sm text-ink-3">
              Surel dan nomor WhatsApp diatur di kartu Kontak &amp; notifikasi.
            </p>
          </div>
        </section>

        {/* Kartu 2: Keamanan Akun */}
        <section aria-labelledby="keamanan-title" className="card flex flex-col p-4 desktop:p-6">
          <div className="border-b border-border pb-3">
            <h2 id="keamanan-title" className="text-h2 font-semibold text-ink">
              Keamanan
            </h2>
          </div>

          <PasswordForm />
        </section>

        {/* Kartu 3: Kontak & Notifikasi (Wireframe L02) */}
        <ContactNotificationCard
          initialEmail={profile.email}
          initialWaNumber={profile.waNumber}
          initialEmailVerified={profile.emailVerifiedAt !== null}
          initialWaVerified={profile.waVerifiedAt !== null}
          initialEmailEnabled={profile.notifyEmail}
          initialWaEnabled={profile.notifyWhatsapp}
        />
      </div>
    </div>
  );
}
