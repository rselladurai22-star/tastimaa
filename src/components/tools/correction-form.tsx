"use client";

import { useState } from "react";

export function CorrectionForm({ school, schoolName, page }: { school?: string | null; schoolName?: string | null; page?: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school: school ?? null, page: page ?? undefined, field: f.get("field"), correction: f.get("correction"), sourceUrl: f.get("sourceUrl") || "", email: f.get("email") || "", website: f.get("website") || "" }),
    });
    if (res.ok) setState("sent");
    else {
      setState("error");
      setError((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
    }
  }
  if (state === "sent") return <p className="rounded-lg bg-ok-soft p-4 text-ok" role="status">Thank you. An editor will check your correction against the official source.</p>;
  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-4 rounded-xl border border-line bg-surface p-6">
      {schoolName ? <p className="text-sm text-ink-2">About: <strong className="text-ink">{schoolName}</strong></p> : null}
      <div>
        <label htmlFor="cf-field" className="block text-sm font-semibold">What is wrong or missing?</label>
        <input id="cf-field" name="field" required minLength={2} maxLength={200} placeholder="e.g. Published admission number for 2027" className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
      </div>
      <div>
        <label htmlFor="cf-correction" className="block text-sm font-semibold">What should it say?</label>
        <textarea id="cf-correction" name="correction" required minLength={10} maxLength={3000} rows={5} className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
      </div>
      <div>
        <label htmlFor="cf-source" className="block text-sm font-semibold">Link to the official source (strongly recommended)</label>
        <input id="cf-source" name="sourceUrl" type="url" placeholder="https://" className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
      </div>
      <div>
        <label htmlFor="cf-email" className="block text-sm font-semibold">Your email (optional, only to follow up)</label>
        <input id="cf-email" name="email" type="email" autoComplete="email" className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state === "error" ? <p className="text-sm text-bad" role="alert">{error}</p> : null}
      <button type="submit" disabled={state === "sending"} className="justify-self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-[#0f1112]">
        {state === "sending" ? "Sending…" : "Send correction"}
      </button>
    </form>
  );
}
