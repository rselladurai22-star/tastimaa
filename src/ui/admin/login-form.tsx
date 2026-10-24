"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { controlClass } from "../kit";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-1.5">
        <label htmlFor="email" className="font-semibold text-ink">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={controlClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="password" className="font-semibold text-ink">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={controlClass} />
      </div>
      {state?.error ? (
        <p role="alert" className="font-semibold text-bad">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-[5px] bg-green px-4 font-semibold text-paper hover:bg-green-deep disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
