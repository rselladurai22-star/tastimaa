"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { IconClose, IconCompare, IconShortlist, IconShortlisted } from "./icons";

/**
 * Anonymous shortlist kept in localStorage — no account needed. Signed-in
 * parents can sync it to their account from /account.
 */
export interface ShortlistEntry {
  slug: string;
  name: string;
}

const KEY = "gsi.shortlist.v1";
export const MAX_COMPARE = 5;
const listeners = new Set<() => void>();
let cache: ShortlistEntry[] | null = null;

function read(): ShortlistEntry[] {
  if (cache) return cache;
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ShortlistEntry[]) : [];
    cache = Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.slug === "string").slice(0, 20) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: ShortlistEntry[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode): keep in memory for this visit */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: ShortlistEntry[] = [];
export function useShortlist() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    list,
    has: (slug: string) => list.some((e) => e.slug === slug),
    toggle: (entry: ShortlistEntry) => write(list.some((e) => e.slug === entry.slug) ? list.filter((e) => e.slug !== entry.slug) : [...list, entry]),
    remove: (slug: string) => write(list.filter((e) => e.slug !== slug)),
    clear: () => write([]),
  };
}

export function compareHref(list: ShortlistEntry[]) {
  return `/compare?schools=${list
    .slice(0, MAX_COMPARE)
    .map((e) => e.slug)
    .join(",")}`;
}

/** Shortlist toggle. The ribbon fills with a short spring when a school is added. */
export function SaveButton({ slug, name, variant = "full", className }: { slug: string; name: string; variant?: "full" | "icon"; className?: string }) {
  const { has, toggle } = useShortlist();
  const saved = has(slug);
  const [bump, setBump] = useState(0);
  const Icon = saved ? IconShortlisted : IconShortlist;
  return (
    <button
      type="button"
      onClick={() => {
        if (!saved) setBump((b) => b + 1);
        toggle({ slug, name });
      }}
      aria-pressed={saved}
      className={clsx(
        "inline-flex min-h-11 items-center gap-2 rounded-[5px] border text-[0.95rem] font-semibold transition-[background-color,border-color,color,transform] duration-[var(--d-1)] ease-[var(--ease-out)] active:scale-[0.97]",
        variant === "full" ? "px-3.5" : "w-11 justify-center",
        saved ? "border-green bg-green-wash text-green" : "border-control bg-card text-ink hover:border-ink",
        className,
      )}
    >
      <Icon key={bump} size={17} className={clsx("shrink-0", bump && saved ? "animate-[pop_var(--d-3)_var(--ease-out)]" : null)} />
      {variant === "full" ? <span>{saved ? "Shortlisted" : "Shortlist"}</span> : null}
      <span className="sr-only">
        {variant === "icon" ? (saved ? "Remove from shortlist: " : "Add to shortlist: ") : " "}
        {name}
      </span>
    </button>
  );
}

/** Header counter: appears once something is shortlisted. */
export function ShortlistCount() {
  const { list } = useShortlist();
  if (!list.length) return null;
  return (
    <Link
      href={compareHref(list)}
      className="anim-fade inline-flex min-h-10 items-center gap-1.5 rounded-[5px] border border-rule-strong bg-card px-2.5 text-[0.95rem] font-semibold text-ink no-underline hover:border-ink"
    >
      <IconShortlisted size={15} className="text-green" />
      <span className="num">{list.length}</span>
      <span className="sr-only">shortlisted {list.length === 1 ? "school" : "schools"} — open comparison</span>
    </Link>
  );
}

/** Floating shortlist bar on research pages. */
export function CompareTray() {
  const { list, remove, clear } = useShortlist();
  if (!list.length) return null;
  return (
    <div data-no-print className="pointer-events-none fixed inset-x-0 bottom-3 z-30 px-3 sm:bottom-5">
      <div className="anim-rise pointer-events-auto mx-auto flex max-w-[60rem] flex-wrap items-center gap-x-3 gap-y-2 rounded-[8px] border border-green/25 bg-card/95 px-4 py-2.5 shadow-lift backdrop-blur-sm">
        <p className="label shrink-0 text-green">Shortlist · {list.length}</p>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {list.map((e) => (
            <li key={e.slug} className="anim-fade flex items-center gap-0.5 rounded-[3px] border border-rule bg-paper py-0.5 pl-2.5 text-[0.9rem]">
              <Link href={`/schools/${e.slug}`} className="max-w-[13rem] truncate text-ink no-underline hover:underline">
                {e.name}
              </Link>
              <button type="button" onClick={() => remove(e.slug)} className="grid size-8 place-items-center rounded-[3px] text-ink-2 hover:bg-sage hover:text-ink" aria-label={`Remove ${e.name} from shortlist`}>
                <IconClose size={14} />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={clear} className="min-h-10 px-1 text-[0.9rem] font-semibold text-ink-2 underline-offset-2 hover:text-ink hover:underline">
          Clear
        </button>
        {list.length >= 2 ? (
          <Link
            href={compareHref(list)}
            className="inline-flex min-h-10 items-center gap-2 rounded-[5px] bg-green px-3.5 text-[0.95rem] font-semibold text-paper no-underline transition-colors hover:bg-green-deep"
          >
            <IconCompare size={16} /> Compare {Math.min(list.length, MAX_COMPARE)}
          </Link>
        ) : (
          <span className="text-[0.9rem] text-ink-2">Add one more to compare</span>
        )}
      </div>
    </div>
  );
}
