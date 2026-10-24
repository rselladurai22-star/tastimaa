"use client";

import { useState } from "react";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { formatMiles } from "@/lib/format";
import type { CatchmentCheck as Result } from "@/server/catchment";

export function CatchmentCheck({ schools, entryYear }: { schools: { slug: string; name: string }[]; entryYear: number }) {
  const [postcode, setPostcode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/catchment?postcode=${encodeURIComponent(postcode)}&schools=${schools.map((s) => s.slug).join(",")}&year=${entryYear}`);
      const json = await res.json();
      if (!res.ok) {
        setResult(null);
        setError(json.error ?? "Something went wrong.");
      } else setResult(json as Result);
    } catch {
      setError("The check couldn't be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <form onSubmit={run} className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="cc-postcode" className="block text-sm font-semibold text-ink">
            Your home postcode
          </label>
          <input
            id="cc-postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            required
            autoComplete="postal-code"
            placeholder="e.g. HP21 7RP"
            className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 uppercase placeholder:normal-case"
          />
        </div>
        <button type="submit" disabled={busy} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 dark:text-[#0f1112]">
          {busy ? "Checking…" : "Check"}
        </button>
      </form>
      <p className="mt-2 text-xs text-ink-3">We use the centre point of your postcode, not your address, and we don&apos;t store it.</p>
      <div aria-live="polite">
        {error ? <p className="mt-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p> : null}
        {result ? (
          <ul className="mt-5 grid gap-3">
            {result.schools.map((s) => {
              const Icon = s.boundary.status === "inside" ? CheckCircle2 : s.boundary.status === "outside" ? XCircle : CircleHelp;
              const label = s.boundary.status === "inside" ? "Inside verified boundary" : s.boundary.status === "outside" ? "Outside verified boundary" : "No verified boundary to check";
              return (
                <li key={s.slug} className="rounded-lg border border-line bg-surface-2/50 p-4">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    <Icon aria-hidden className={s.boundary.status === "inside" ? "size-5 text-ok" : s.boundary.status === "outside" ? "size-5 text-bad" : "size-5 text-ink-3"} />
                    {s.name}: {label}
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{s.explanation}</p>
                  {s.straightLineMiles !== null ? (
                    <p className="mt-1 text-xs text-ink-3">
                      Straight line from the centre of {result.postcode} to the school: about {formatMiles(s.straightLineMiles)}. Schools measure from your exact home using their own published method, and a past year&apos;s last-offer distance is not a
                      boundary.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
