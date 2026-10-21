"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";
import { Icon } from "@/app/icons";

const initial: LoginState = {};

/** Tinggi 44px di ponsel dan tablet sesuai target sentuh, 40px di desktop sesuai L01. */
const FIELD = "h-11 tablet:h-10 w-full rounded-md border border-border-strong px-3 text-body";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="label text-ink-2" htmlFor="username">
          Nama pengguna
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          defaultValue={state.username ?? ""}
          className={FIELD}
        />
      </div>

      <div>
        <label className="label text-ink-2" htmlFor="password">
          Kata sandi
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${FIELD} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition-colors duration-[120ms] hover:bg-neutral-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            <Icon name={showPassword ? "sembunyi" : "lihat"} size={18} />
          </button>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-error bg-error-surface px-3 py-2 text-body text-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-11 w-full rounded-md bg-primary text-h2 text-on-dark disabled:opacity-60"
      >
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
