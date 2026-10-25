"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { IconArrow, IconBook, IconClose, IconDocument, IconPin, IconRoute, IconSearch, IconTarget } from "./icons";

export interface Suggestion {
  type: "school" | "area" | "postcode" | "test" | "guide" | "tool" | "page";
  label: string;
  sublabel: string;
  href: string;
}

const GROUPS: { type: Suggestion["type"]; title: string; tag: string; Icon: typeof IconPin }[] = [
  { type: "postcode", title: "Near a postcode", tag: "Postcode", Icon: IconPin },
  { type: "school", title: "Schools", tag: "School", Icon: IconBook },
  { type: "area", title: "Areas", tag: "Area", Icon: IconRoute },
  { type: "test", title: "11+ tests", tag: "11+ test", Icon: IconTarget },
  { type: "guide", title: "Guides", tag: "Guide", Icon: IconDocument },
  { type: "tool", title: "Tools", tag: "Tool", Icon: IconTarget },
  { type: "page", title: "Pages", tag: "Page", Icon: IconDocument },
];

const SUGGESTED: Suggestion[] = [
  { type: "page", label: "All grammar schools", sublabel: "Search, filter, map and table", href: "/grammar-schools" },
  { type: "guide", label: "Qualifying is not the same as getting a place", sublabel: "Start here if you're new to the 11+", href: "/admissions/qualifying-is-not-an-offer" },
  { type: "tool", label: "Eligibility checker", sublabel: "How each school's rules apply to your child", href: "/tools/eligibility-checker" },
  { type: "page", label: "Admissions calendar", sublabel: "Verified key dates", href: "/calendar" },
];

function useSuggestions(q: string) {
  const [state, setState] = useState<{ q: string; items: Suggestion[] }>({ q: "", items: [] });
  const [loading, setLoading] = useState(false);
  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) setState({ q: term, items: ((await res.json()) as { suggestions: Suggestion[] }).suggestions });
      } catch {
        /* aborted or offline: keep the previous results */
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);
  return { items: term.length < 2 ? [] : state.items, loading: term.length >= 2 && loading };
}

/** Shared combobox: input + grouped listbox with full keyboard support. */
function Combobox({ size = "md", autoFocus = false, onNavigate, placeholder, showSuggested = false, label }: { size?: "md" | "lg"; autoFocus?: boolean; onNavigate?: () => void; placeholder: string; showSuggested?: boolean; label: string }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { items, loading } = useSuggestions(value);
  const short = value.trim().length < 2;
  const grouped = useMemo(() => {
    const shown = short ? (showSuggested ? SUGGESTED : []) : items;
    return GROUPS.map((g) => ({ ...g, items: shown.filter((s) => s.type === g.type) })).filter((g) => g.items.length);
  }, [short, showSuggested, items]);
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);
  const expanded = (open || showSuggested) && flat.length > 0;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(s: Suggestion) {
    setOpen(false);
    onNavigate?.();
    router.push(s.href);
  }

  function submit() {
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/grammar-schools?q=${encodeURIComponent(q)}`);
  }

  return (
    <div ref={wrapRef} className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (expanded && active >= 0 && flat[active]) go(flat[active]!);
          else submit();
        }}
        className={clsx(
          "group/s relative flex items-center rounded-[6px] border bg-card transition-[border-color,box-shadow] duration-[var(--d-2)] ease-[var(--ease-out)] focus-within:border-green focus-within:shadow-[0_0_0_4px_rgb(28_80_64/0.14)]",
          size === "lg" ? "border-ink/80" : "border-control",
        )}
      >
        <label htmlFor={`${id}-input`} className="sr-only">
          {label}
        </label>
        <IconSearch size={size === "lg" ? 22 : 18} className={clsx("pointer-events-none absolute text-ink-2", size === "lg" ? "left-4" : "left-3")} />
        <input
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && flat.length) {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (a + 1) % flat.length);
            } else if (e.key === "ArrowUp" && flat.length) {
              e.preventDefault();
              setActive((a) => (a <= 0 ? flat.length - 1 : a - 1));
            } else if (e.key === "Escape" && !showSuggested) {
              setOpen(false);
              setActive(-1);
            }
          }}
          className={clsx(
            "w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden",
            size === "lg" ? "h-[3.75rem] pr-36 pl-13 text-[1.15rem]" : "h-12 pr-24 pl-10 text-[1.02rem]",
          )}
        />
        <button
          type="submit"
          className={clsx(
            "absolute inline-flex items-center gap-1.5 rounded-[4px] bg-green font-semibold text-paper transition-[background-color,transform] duration-[var(--d-1)] hover:bg-green-deep active:scale-[0.97]",
            size === "lg" ? "right-2 h-11 px-4 text-[1rem]" : "right-1.5 h-9 px-3 text-[0.95rem]",
          )}
        >
          Search
          <IconArrow size={16} />
        </button>
        <span aria-hidden className={clsx("absolute right-0 bottom-0 left-0 h-[2px] origin-left bg-copper transition-transform duration-[var(--d-3)] ease-[var(--ease-out)]", loading ? "scale-x-100 animate-pulse" : "scale-x-0")} />
      </form>

      {expanded ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className={clsx("anim-rise z-50 overflow-auto rounded-[6px] border border-rule bg-card", showSuggested ? "mt-3 max-h-[min(60vh,32rem)]" : "absolute mt-2 max-h-[26rem] w-full shadow-lift")}
        >
          {value.trim().length < 2 && showSuggested ? <p className="label px-4 pt-3 pb-1">Suggested starting points</p> : null}
          {grouped.map((g) => (
            <div key={g.type} role="group" aria-labelledby={`${id}-g-${g.type}`} className="border-b border-rule py-1.5 last:border-0">
              {value.trim().length >= 2 ? (
                <p id={`${id}-g-${g.type}`} className="label px-4 pt-1.5 pb-1">
                  {g.title}
                </p>
              ) : (
                <span id={`${id}-g-${g.type}`} className="sr-only">
                  {g.title}
                </span>
              )}
              {g.items.map((s) => {
                const i = flat.indexOf(s);
                return (
                  <div
                    key={s.href + s.label}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(s)}
                    className={clsx("mx-1.5 flex cursor-pointer items-start gap-3 rounded-[4px] px-2.5 py-2 transition-colors duration-[var(--d-1)]", i === active ? "bg-green-wash" : "hover:bg-paper")}
                  >
                    <g.Icon size={17} className={clsx("mt-[3px] shrink-0", i === active ? "text-green" : "text-ink-3")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{s.label}</span>
                      <span className="block truncate text-small text-ink-2">{s.sublabel}</span>
                    </span>
                    <span className="mt-0.5 shrink-0 rounded-[3px] border border-rule px-1.5 py-0.5 font-mono text-[0.75rem] text-ink-2">{g.tag}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {value.trim().length >= 2 && !loading ? `${flat.length} suggestions` : ""}
      </p>
    </div>
  );
}

/** Inline search (homepage hero, 404). */
export function SearchField({ size = "md", placeholder = "School, town or postcode" }: { size?: "md" | "lg"; placeholder?: string }) {
  return <Combobox size={size} placeholder={placeholder} label="Search schools, towns, postcodes and guides" />;
}

/** Header trigger + command palette. Opens with "/" or Ctrl/⌘+K. */
export function SearchDialogTrigger() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("input, button, [href], [tabindex]:not([tabindex='-1'])");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const trigger = triggerRef.current;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Search (press /)"
        className="grid size-11 place-items-center rounded-full text-ink transition-[background-color,transform] duration-[var(--d-1)] hover:bg-ink/5 active:scale-95"
      >
        <IconSearch size={21} />
        <span className="sr-only">Search</span>
      </button>
      {open ? (
        <div className="on-light fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[9vh] sm:px-6" role="presentation">
          <div className="anim-fade absolute inset-0 bg-ink/35 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />
          <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Search Grammar Atlas" className="anim-rise relative w-full max-w-[42rem] rounded-[8px] border border-rule bg-paper p-4 shadow-lift sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="label">Search the atlas</p>
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-[4px] text-ink-2 hover:bg-sage hover:text-ink" aria-label="Close search">
                <IconClose size={18} />
              </button>
            </div>
            <Combobox autoFocus showSuggested onNavigate={() => setOpen(false)} placeholder="School, town, postcode, test or topic" label="Search schools, towns, postcodes, tests and guides" />
            <p className="mt-3 text-small text-ink-2">
              <kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close. Postcodes search by straight-line distance.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
