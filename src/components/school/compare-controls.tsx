"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Link2, Plus, Printer, X } from "lucide-react";

interface Suggestion {
  type: "school" | "area";
  label: string;
  sublabel: string;
  href: string;
}

export function AddSchool({ current, entryYear }: { current: string[]; entryYear: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j: { suggestions: Suggestion[] }) => setItems(j.suggestions.filter((s) => s.type === "school")))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  if (current.length >= 5) return <p className="text-sm text-ink-3">You can compare up to five schools.</p>;
  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="add-school" className="sr-only">
        Add a school to the comparison
      </label>
      <Plus aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
      <input
        id="add-school"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Add a school…"
        autoComplete="off"
        className="w-full rounded-lg border border-line-strong bg-surface py-2.5 pr-3 pl-9 text-sm"
        aria-controls="add-school-list"
      />
      {items.length ? (
        <ul id="add-school-list" className="absolute z-30 mt-1 w-full rounded-lg border border-line bg-surface p-1 shadow-[var(--shadow-md)]">
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
                    setItems([]);
                    router.push(`/compare?schools=${[...current, slug].join(",")}&year=${entryYear}`);
                  }}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50"
                >
                  <span className="font-medium text-ink">{s.label}</span>
                  <span className="block text-xs text-ink-3">{already ? "Already in comparison" : s.sublabel}</span>
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
      className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
      aria-label={`Remove ${name} from comparison`}
    >
      <X aria-hidden className="size-4" />
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
      <button type="button" onClick={share} disabled={slugs.length < 2} className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2 disabled:opacity-50">
        {state === "copied" ? <Check aria-hidden className="size-4 text-ok" /> : <Link2 aria-hidden className="size-4" />}
        {state === "copied" ? "Link copied" : state === "saving" ? "Saving…" : "Share link"}
      </button>
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2">
        <Printer aria-hidden className="size-4" /> Print
      </button>
      {url && state === "copied" ? (
        <a href={url} className="text-xs link break-all">
          {url}
        </a>
      ) : null}
      {state === "error" ? <span className="text-xs text-bad">Couldn&apos;t create a link. Try again.</span> : null}
    </div>
  );
}
