"use client";

import { useActionState, useState } from "react";
import { changePassword, type ChangePasswordState } from "./actions";
import { LoadingButton } from "../loading-state";
import { Icon } from "@/app/icons";

const initial: ChangePasswordState = {};

const FIELD =
  "h-11 tablet:h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-body text-ink transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none";

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initial);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      {state.error ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-error bg-error-surface px-3 py-2.5 text-body-sm font-medium text-error"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-success bg-success-surface px-3 py-2.5 text-body-sm font-medium text-success"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label className="label text-ink-2" htmlFor="currentPassword">
          Kata sandi saat ini
        </label>
        <div className="relative mt-1">
          <input
            id="currentPassword"
            name="currentPassword"
            type={showCurrent ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${FIELD} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((prev) => !prev)}
            aria-label={showCurrent ? "Sembunyikan kata sandi saat ini" : "Tampilkan kata sandi saat ini"}
            title={showCurrent ? "Sembunyikan kata sandi saat ini" : "Tampilkan kata sandi saat ini"}
            aria-pressed={showCurrent}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-ink-3 transition-colors duration-[120ms] hover:bg-neutral-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            <Icon name={showCurrent ? "sembunyi" : "lihat"} size={18} />
          </button>
        </div>
      </div>

      <div>
        <label className="label text-ink-2" htmlFor="newPassword">
          Kata sandi baru
        </label>
        <div className="relative mt-1">
          <input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            required
            minLength={12}
            autoComplete="new-password"
            placeholder="Minimal 12 karakter"
            className={`${FIELD} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowNew((prev) => !prev)}
            aria-label={showNew ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
            title={showNew ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
            aria-pressed={showNew}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-ink-3 transition-colors duration-[120ms] hover:bg-neutral-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            <Icon name={showNew ? "sembunyi" : "lihat"} size={18} />
          </button>
        </div>
        <p className="mt-1 text-body-sm text-ink-3">Minimal 12 karakter</p>
      </div>

      <div>
        <label className="label text-ink-2" htmlFor="confirmPassword">
          Ulangi kata sandi baru
        </label>
        <div className="relative mt-1">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            required
            minLength={12}
            autoComplete="new-password"
            placeholder="Ulangi kata sandi baru"
            className={`${FIELD} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            aria-label={showConfirm ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
            title={showConfirm ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
            aria-pressed={showConfirm}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-ink-3 transition-colors duration-[120ms] hover:bg-neutral-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            <Icon name={showConfirm ? "sembunyi" : "lihat"} size={18} />
          </button>
        </div>
      </div>

      <div className="pt-2">
        <LoadingButton
          type="submit"
          loading={pending}
          loadingText="Menyimpan..."
          variant="primary"
          className="h-11 tablet:h-10 w-full"
        >
          Simpan Kata Sandi
        </LoadingButton>
      </div>

      <div className="space-y-1 pt-2 text-body-sm text-ink-3">
        <p>Sesi lain akan diakhiri setelah kata sandi berubah.</p>
        <p>Sesi berakhir otomatis setelah 8 jam tanpa aktivitas.</p>
      </div>
    </form>
  );
}
