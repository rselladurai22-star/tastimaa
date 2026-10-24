"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Bookmark, BookmarkCheck, GitCompareArrows, X } from "lucide-react";
import { clsx } from "clsx";

/**
 * Anonymous shortlist kept in localStorage — no account needed. Signed-in
 * parents can sync it to their account from /account.
 */
export interface ShortlistEntry {
  slug: string;
  name: string;
}

const KEY = "gsi.shortlist.v1";
const MAX_COMPARE = 5;
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

export function SaveButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const { has, toggle } = useShortlist();
  const saved = has(slug);
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={() => toggle({ slug, name })}
      aria-pressed={saved}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        saved ? "border-accent/40 bg-accent-soft text-accent-ink" : "border-line-strong bg-surface text-ink hover:bg-surface-2",
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
      {saved ? "Shortlisted" : "Shortlist"}
      <span className="sr-only"> {name}</span>
    </button>
  );
}

export function compareHref(list: ShortlistEntry[]) {
  return `/compare?schools=${list
    .slice(0, MAX_COMPARE)
    .map((e) => e.slug)
    .join(",")}`;
}

export function ShortlistIndicator() {
  const { list } = useShortlist();
  if (!list.length) return null;
  return (
    <Link href={compareHref(list)} className="hidden items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 sm:inline-flex">
      <Bookmark aria-hidden className="size-4" />
      <span>
        {list.length} <span className="sr-only">shortlisted schools — compare</span>
      </span>
    </Link>
  );
}

/** Sticky comparison tray shown on directory and profile pages. */
export function CompareTray() {
  const { list, remove, clear } = useShortlist();
  if (!list.length) return null;
  return (
    <div data-no-print className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 shadow-[0_-4px_16px_rgb(0_0_0/0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold text-ink">Shortlist</span>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {list.map((e) => (
            <li key={e.slug} className="flex items-center gap-1 rounded-full border border-line bg-surface-2 py-0.5 pr-1 pl-3 text-xs">
              <Link href={`/schools/${e.slug}`} className="max-w-48 truncate hover:underline">
                {e.name}
              </Link>
              <button type="button" onClick={() => remove(e.slug)} className="rounded-full p-1 hover:bg-surface-3" aria-label={`Remove ${e.name} from shortlist`}>
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={clear} className="text-xs text-ink-3 hover:text-ink hover:underline">
          Clear
        </button>
        {list.length >= 2 ? (
          <Link href={compareHref(list)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:bg-accent-hover dark:text-[#0f1112]">
            <GitCompareArrows aria-hidden className="size-4" /> Compare {Math.min(list.length, MAX_COMPARE)}
          </Link>
        ) : (
          <span className="text-xs text-ink-3">Add another school to compare</span>
        )}
      </div>
    </div>
  );
}
