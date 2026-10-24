"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="grid gap-4">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-white disabled:opacity-60 dark:text-[#0f1112]">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
