"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { formatMiles } from "@/lib/format";
import type { CatchmentCheck as Result } from "@/server/catchment";
import { IconCheck, IconCross, IconPin, IconQuestion } from "../icons";
import { controlClass } from "../kit";

const OUTCOME = {
  inside: { label: "Inside the verified boundary", Icon: IconCheck, tone: "border-ok/30 bg-ok-wash text-ok" },
  outside: { label: "Outside the verified boundary", Icon: IconCross, tone: "border-bad/30 bg-bad-wash text-bad" },
  unknown: { label: "No verified boundary to check", Icon: IconQuestion, tone: "border-rule bg-none-wash text-none" },
} as const;

/** Postcode check against official boundaries only. Nothing is stored. */
export function CatchmentCheck({ schools, entryYear, idPrefix = "cc" }: { schools: { slug: string; name: string }[]; entryYear: number; idPrefix?: string }) {
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
    <div>
      <form onSubmit={run} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor={`${idPrefix}-postcode`} className="block font-semibold text-ink">
            Your home postcode
          </label>
          <span className="relative mt-1.5 block">
            <IconPin size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
            <input id={`${idPrefix}-postcode`} value={postcode} onChange={(e) => setPostcode(e.target.value)} required autoComplete="postal-code" placeholder="e.g. HP21 7RP" className={clsx(controlClass, "pl-9 uppercase placeholder:normal-case")} />
          </span>
        </div>
        <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center rounded-[5px] bg-green px-5 font-semibold text-paper hover:bg-green-deep disabled:opacity-60">
          {busy ? "Checking…" : "Check"}
        </button>
      </form>
      <p className="mt-2 text-small text-ink-2">We use the centre point of your postcode, not your address, and we don&apos;t store it.</p>
      <div aria-live="polite">
        {error ? <p className="mt-4 rounded-[5px] border border-bad/30 bg-bad-wash px-4 py-3 font-semibold text-bad">{error}</p> : null}
        {result ? (
          <ul className="mt-5 grid gap-3">
            {result.schools.map((s) => {
              const o = OUTCOME[s.boundary.status as keyof typeof OUTCOME] ?? OUTCOME.unknown;
              return (
                <li key={s.slug} className="anim-rise rounded-[6px] border border-rule bg-card p-4">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    <span className={clsx("inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-1 text-[0.875rem]", o.tone)}>
                      <o.Icon size={15} /> {o.label}
                    </span>
                    {schools.length > 1 ? s.name : null}
                  </p>
                  <p className="mt-2 text-[1rem] leading-relaxed text-ink-2">{s.explanation}</p>
                  {s.straightLineMiles !== null ? (
                    <p className="mt-2 text-small leading-relaxed text-ink-2">
                      Straight line from the centre of {result.postcode} to the school: about <span className="font-mono text-ink">{formatMiles(s.straightLineMiles)}</span>. Schools measure from your exact home using their own published method, and a past
                      year&apos;s last-offer distance is not a boundary.
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
