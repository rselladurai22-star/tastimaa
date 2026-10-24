"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search, School } from "lucide-react";
import { clsx } from "clsx";

interface Suggestion {
  type: "school" | "area";
  label: string;
  sublabel: string;
  href: string;
}

/**
 * Accessible combobox (WAI-ARIA 1.2 list autocomplete). Works without
 * JavaScript as a plain GET form to the directory.
 */
export function SearchBox({
  size = "md",
  placeholder = "Search by school, town or postcode",
  defaultValue = "",
  autoFocus = false,
  shortcut = false,
}: {
  size?: "md" | "lg";
  placeholder?: string;
  defaultValue?: string;
  autoFocus?: boolean;
  shortcut?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && t && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const json = (await res.json()) as { suggestions: Suggestion[] };
          setItems(json.suggestions);
          setActive(-1);
        }
      } catch {
        /* aborted or offline: keep the previous suggestions */
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  function go(s: Suggestion) {
    setOpen(false);
    router.push(s.href);
  }

  const showList = open && items.length > 0;

  return (
    <form
      action="/grammar-schools"
      method="get"
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        if (showList && active >= 0 && items[active]) {
          e.preventDefault();
          go(items[active]!);
        }
      }}
    >
      <label htmlFor={`${id}-input`} className="sr-only">
        Search grammar schools by name, town or postcode
      </label>
      <div className="relative">
        <Search aria-hidden className={clsx("pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3", size === "lg" ? "size-5" : "size-4")} />
        <input
          ref={inputRef}
          id={`${id}-input`}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % items.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
          className={clsx(
            "w-full rounded-xl border border-line-strong bg-surface text-ink shadow-[var(--shadow-sm)] placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none",
            size === "lg" ? "py-4 pr-28 pl-11 text-base sm:text-lg" : "py-2.5 pr-20 pl-10 text-sm",
          )}
        />
        <button
          type="submit"
          className={clsx(
            "absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg bg-accent font-semibold text-white hover:bg-accent-hover dark:text-[#0f1112]",
            size === "lg" ? "px-5 py-2.5 text-sm" : "px-3 py-1.5 text-xs",
          )}
        >
          Search
        </button>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        className={clsx("absolute z-50 mt-1.5 max-h-96 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-md)]", !showList && "hidden")}
      >
        {items.map((s, i) => (
          <li
            key={s.href}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              go(s);
            }}
            onMouseEnter={() => setActive(i)}
            className={clsx("flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2", i === active && "bg-surface-2")}
          >
            {s.type === "area" ? <MapPin aria-hidden className="mt-0.5 size-4 text-ink-3" /> : <School aria-hidden className="mt-0.5 size-4 text-ink-3" />}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{s.label}</span>
              <span className="block truncate text-xs text-ink-3">{s.sublabel}</span>
            </span>
          </li>
        ))}
      </ul>
      <span className="sr-only" aria-live="polite">
        {loading ? "Searching" : showList ? `${items.length} suggestions available` : ""}
      </span>
    </form>
  );
}
