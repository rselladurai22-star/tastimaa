"use client";

import { useId, useState } from "react";
import { clsx } from "clsx";
import { IconPin } from "../icons";
import { SearchField } from "../search";

/** The homepage's one starting point: search by name or town, or list schools near a postcode. */
export function HomeFinder() {
  const [tab, setTab] = useState<"name" | "postcode">("name");
  const id = useId();
  const tabs = [
    { key: "name", label: "School or town" },
    { key: "postcode", label: "Near a postcode" },
  ] as const;
  return (
    <div className="rounded-[16px] border border-rule bg-card p-5 text-ink shadow-[0_24px_48px_-32px_rgb(33_51_67/0.35)] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="label eyebrow">School finder</p>
          <h2 className="mt-1 font-sans text-[1.375rem] leading-snug font-semibold text-ink">Where would you like to start?</h2>
        </div>
        <p className="inline-flex items-center gap-2 text-small text-ink-2">
          <span aria-hidden className="size-2 rounded-full bg-[var(--ok)]" />
          Official school records
        </p>
      </div>
      <div role="tablist" aria-label="Ways to search" className="mt-5 flex gap-6 border-b border-rule">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`${id}-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`${id}-panel`}
            onClick={() => setTab(t.key)}
            className={clsx("-mb-px min-h-11 border-b-2 text-[1rem] font-semibold transition-colors", tab === t.key ? "border-green text-green" : "border-transparent text-ink-2 hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className="pt-5">
        {tab === "name" ? (
          <>
            <SearchField size="lg" placeholder="e.g. Aylesbury, Kent or a school name" />
            <p className="mt-3 text-small text-ink-2">Searches every listed school, town and council area, plus our guides.</p>
          </>
        ) : (
          <form action="/grammar-schools" method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
            <input type="hidden" name="sort" value="distance" />
            <label className="grid gap-1.5">
              <span className="text-[0.9375rem] font-semibold text-ink">Postcode</span>
              <span className="relative">
                <IconPin size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
                <input name="postcode" required autoComplete="postal-code" placeholder="e.g. HP21 7RP" className="min-h-12 w-full rounded-[8px] border border-control bg-card pr-3 pl-11 text-[1.0625rem] uppercase placeholder:normal-case focus:border-green focus:outline-none" />
              </span>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[0.9375rem] font-semibold text-ink">Within</span>
              <select name="radius" defaultValue="15" className="min-h-12 rounded-[8px] border border-control bg-card px-3 text-[1rem] focus:border-green focus:outline-none">
                {[5, 10, 15, 25, 40].map((r) => (
                  <option key={r} value={r}>
                    {r} miles
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="min-h-12 self-end rounded-[8px] bg-green px-6 text-[1rem] font-medium text-white hover:bg-green-deep">
              Find schools
            </button>
            <p className="text-small text-ink-2 sm:col-span-3">Straight-line distance from the postcode&apos;s centre. Schools measure from your home address, by their own method.</p>
          </form>
        )}
      </div>
    </div>
  );
}
