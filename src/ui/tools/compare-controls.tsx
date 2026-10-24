"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconCheck, IconClose, IconLink, IconPlus, IconPrint } from "../icons";
import { controlClass } from "../kit";

interface Suggestion {
  type: "school" | "area";
  label: string;
  sublabel: string;
  href: string;
}

const NO_SUGGESTIONS: Suggestion[] = [];

export function AddSchool({ current, entryYear }: { current: string[]; entryYear: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const items = q.trim().length < 2 ? NO_SUGGESTIONS : results;
  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j: { suggestions: Suggestion[] }) => setResults(j.suggestions.filter((s) => s.type === "school")))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  if (current.length >= 5) return <p className="text-ink-2">You can compare up to five schools.</p>;
  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="add-school" className="sr-only">
        Add a school to the comparison
      </label>
      <IconPlus size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
      <input id="add-school" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a school…" autoComplete="off" className={`${controlClass} pl-9`} aria-controls={items.length ? "add-school-list" : undefined} />
      {items.length ? (
        <ul id="add-school-list" className="anim-fade absolute z-30 mt-1 w-full overflow-hidden rounded-[6px] border border-rule bg-card shadow-lift">
          {items.map((s) => {
            const slug = s.href.replace("/schools/", "");
            const already = current.includes(slug);
            return (
              <li key={s.href}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => {
                    setQ("");
                    setResults([]);
                    router.push(`/compare?schools=${[...current, slug].join(",")}&year=${entryYear}`);
                  }}
                  className="block w-full px-4 py-2.5 text-left hover:bg-green-wash disabled:opacity-50"
                >
                  <span className="font-semibold text-ink">{s.label}</span>
                  <span className="block text-small text-ink-2">{already ? "Already in comparison" : s.sublabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function RemoveSchool({ slug, current, entryYear, name }: { slug: string; current: string[]; entryYear: number; name: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      data-no-print
      onClick={() => router.push(`/compare?schools=${current.filter((s) => s !== slug).join(",")}&year=${entryYear}`)}
      className="grid size-8 shrink-0 place-items-center rounded-[4px] text-ink-2 hover:bg-sage hover:text-ink"
      aria-label={`Remove ${name} from comparison`}
    >
      <IconClose size={15} />
    </button>
  );
}

export function ShareAndPrint({ slugs, entryYear, savedSlug }: { slugs: string[]; entryYear: number; savedSlug?: string }) {
  const [state, setState] = useState<"idle" | "saving" | "copied" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  async function share() {
    setState("saving");
    try {
      let link = url ?? (savedSlug ? `${window.location.origin}/compare/${savedSlug}` : null);
      if (!link) {
        const res = await fetch("/api/comparisons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schools: slugs, entryYear }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        link = `${window.location.origin}/compare/${json.slug}`;
      }
      setUrl(link);
      await navigator.clipboard?.writeText(link).catch(() => {});
      setState("copied");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2" data-no-print>
      <button type="button" onClick={share} disabled={slugs.length < 2} className="inline-flex min-h-11 items-center gap-2 rounded-[5px] border border-control bg-card px-3.5 font-semibold text-ink hover:border-ink disabled:opacity-50">
        {state === "copied" ? <IconCheck size={16} className="text-ok" /> : <IconLink size={16} />}
        {state === "copied" ? "Link copied" : state === "saving" ? "Saving…" : "Share link"}
      </button>
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-[5px] border border-control bg-card px-3.5 font-semibold text-ink hover:border-ink">
        <IconPrint size={16} /> Print
      </button>
      {url && state === "copied" ? (
        <a href={url} className="a text-small break-all">
          {url}
        </a>
      ) : null}
      {state === "error" ? <span className="text-small font-semibold text-bad">Couldn&apos;t create a link. Try again.</span> : null}
    </div>
  );
}
