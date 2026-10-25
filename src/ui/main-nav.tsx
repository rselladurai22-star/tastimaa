"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { formatDate } from "@/lib/format";
import type { NavData } from "@/server/nav";
import { IconArrow, IconChevron, IconClose, IconMenu } from "./icons";
import { Status } from "./status";

type Group = {
  key: string;
  label: string;
  short: string;
  intro: string;
  match: (path: string) => boolean;
  links: { href: string; title: string; text: string }[];
};

const GROUPS: Group[] = [
  {
    key: "discover",
    label: "Discover schools",
    short: "Schools",
    intro: "Every state grammar school in England and Northern Ireland, from official registers — searchable by name, place or postcode.",
    match: (p) => p.startsWith("/grammar-schools") || p.startsWith("/schools"),
    links: [
      { href: "/grammar-schools", title: "All grammar schools", text: "Search, filter, and switch between list, table and map" },
      { href: "/grammar-schools?view=map", title: "Schools near a postcode", text: "Straight-line distances, clearly labelled" },
      { href: "/grammar-schools/northern-ireland", title: "Northern Ireland", text: "Year 8 transfer and the SEAG assessment" },
      { href: "/compare", title: "Compare schools", text: "Up to five side by side, differences highlighted" },
    ],
  },
  {
    key: "admissions",
    label: "Understand admissions",
    short: "Admissions",
    intro: "Admission happens in three steps. Most confusion comes from treating the first step as the last.",
    match: (p) => p.startsWith("/admissions"),
    links: [
      { href: "/admissions", title: "How admissions work", text: "The whole process on one page" },
      { href: "/admissions/qualifying-is-not-an-offer", title: "Qualifying isn't an offer", text: "What passing the test does and doesn't mean" },
      { href: "/admissions/oversubscription", title: "Oversubscription criteria", text: "The order places are offered in" },
      { href: "/admissions/out-of-catchment", title: "Catchment and distance", text: "Applying from outside the area" },
      { href: "/admissions/home-address", title: "Home address rules", text: "Which address counts, and from when" },
      { href: "/admissions/appeals", title: "Appeals", text: "Deadlines, hearings and reviews" },
      { href: "/admissions/northern-ireland", title: "Northern Ireland transfer", text: "SEAG and Year 8 entry" },
    ],
  },
  {
    key: "exams",
    label: "Explore 11+ exams",
    short: "11+ exams",
    intro: "There is no single 11+. Each area sets its own test, timetable and scoring — and a score only means something for its own test.",
    match: (p) => p.startsWith("/11-plus"),
    links: [
      { href: "/11-plus", title: "The 11+ explained", text: "Subjects, standardisation and qualifying scores" },
      { href: "/11-plus/exam-providers", title: "Tests and providers", text: "Who sets each test, and where" },
      { href: "/11-plus/preparation", title: "Preparation and practice", text: "Original timed questions with feedback" },
    ],
  },
  {
    key: "tools",
    label: "Research tools",
    short: "Tools",
    intro: "Tools built on each school's published rules. None of them asks for your child's name, and none estimates a probability.",
    match: (p) => p.startsWith("/tools") || p.startsWith("/compare") || p.startsWith("/assistant"),
    links: [
      { href: "/tools/eligibility-checker", title: "Eligibility checker", text: "Which criteria your child could meet" },
      { href: "/tools/catchment-checker", title: "Catchment checker", text: "Verified boundaries only — never a circle" },
      { href: "/compare", title: "Compare schools", text: "Tests, rules, results and demand" },
      { href: "/tools/planner", title: "Admissions planner", text: "Your timeline, with reminders" },
      { href: "/assistant", title: "Research assistant", text: "Answers with numbered sources" },
    ],
  },
  {
    key: "data",
    label: "Dates & data",
    short: "Dates & data",
    intro: "Deadlines and figures straight from official publications, with how fresh each one is.",
    match: (p) => p.startsWith("/calendar") || p.startsWith("/data-sources") || p.startsWith("/methodology"),
    links: [
      { href: "/calendar", title: "Admissions calendar", text: "Verified dates, by month" },
      { href: "/data-sources", title: "Data sources and freshness", text: "Every source and its last refresh" },
      { href: "/methodology", title: "Methodology", text: "How facts are collected and verified" },
      { href: "/corrections", title: "Report a correction", text: "Help keep the atlas accurate" },
    ],
  },
];

function Feature({ group, data, onNavigate }: { group: string; data: NavData; onNavigate: () => void }) {
  if (group === "discover") {
    const max = Math.max(1, ...data.regions.map((r) => r.n), data.ni);
    const rows = [...data.regions.slice(0, 7), ...(data.ni ? [{ slug: "northern-ireland", name: "Northern Ireland", n: data.ni }] : [])];
    return (
      <div>
        <p className="label mb-2">Schools by region</p>
        <ul className="grid gap-0.5">
          {rows.map((r) => (
            <li key={r.slug}>
              <Link href={`/grammar-schools/${r.slug}`} onClick={onNavigate} className="group/r grid grid-cols-[minmax(0,8.5rem)_1fr_2rem] items-center gap-3 rounded-[3px] px-1.5 py-1 text-[0.95rem] text-ink no-underline hover:bg-sage">
                <span className="truncate">{r.name}</span>
                <span aria-hidden className="h-1.5 rounded-full bg-sage-deep">
                  <span className="block h-full rounded-full bg-green-bright transition-[width] duration-[var(--d-4)] ease-[var(--ease-out)]" style={{ width: `${(r.n / max) * 100}%` }} />
                </span>
                <span className="text-right font-mono text-[0.82rem] text-ink-2">{r.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (group === "admissions") {
    return (
      <div>
        <p className="label mb-3">The three steps</p>
        <ol className="grid gap-2.5">
          {[
            ["Qualify", "Reach the test standard"],
            ["Be ranked", "By the published criteria"],
            ["Receive an offer", "If places remain"],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-center gap-3">
              <span className={clsx("grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[0.8rem]", i === 2 ? "border-copper bg-copper-wash text-copper-ink" : "border-green/40 bg-green-wash text-green")}>{i + 1}</span>
              <span>
                <span className="block font-semibold text-ink">{t}</span>
                <span className="block text-small text-ink-2">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (group === "exams") {
    return (
      <div>
        <p className="label mb-2">Tests we hold</p>
        <ul className="grid gap-1">
          {data.tests.map((t) => (
            <li key={t.slug}>
              <Link href={`/11-plus/${t.slug}`} onClick={onNavigate} className="block rounded-[3px] px-1.5 py-1.5 no-underline hover:bg-sage">
                <span className="block font-semibold text-ink">{t.name}</span>
                <span className="block text-small text-ink-2">
                  {t.nation === "northern_ireland" ? "Northern Ireland" : "England"} · {t.schools} {t.schools === 1 ? "school" : "schools"} linked
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (group === "data") {
    return (
      <div>
        <p className="label mb-2">Coming up</p>
        <ul className="grid gap-2">
          {data.dates.map((d) => (
            <li key={d.id} className="border-l-2 border-copper pl-3">
              <p className="font-mono text-[0.82rem] text-copper-ink">{formatDate(d.startsOn)}</p>
              <p className="text-[0.95rem] leading-snug font-semibold text-ink">{d.title}</p>
              <Status status={d.status} quiet className="mt-1" />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="text-[0.95rem] leading-relaxed text-ink-2">
      <p className="label mb-2">What we never do</p>
      <ul className="grid gap-1.5">
        <li>Ask for your child&apos;s name or date of birth</li>
        <li>Estimate the chance of a place</li>
        <li>Treat a past cut-off as a catchment boundary</li>
      </ul>
    </div>
  );
}

/** Desktop navigation with mega panels. */
export function MainNav({ data }: { data: NavData }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const listRef = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeKey = GROUPS.find((g) => g.match(pathname))?.key ?? null;
  const indicated = open ?? hover ?? activeKey;

  // The copper indicator slides between triggers; it is positioned directly on the DOM node.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const el = indicated ? triggers.current[indicated] : null;
    const list = listRef.current;
    if (!bar) return;
    if (!el || !list) {
      bar.style.opacity = "0";
      return;
    }
    const lr = list.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    bar.style.transform = `translateX(${r.left - lr.left + 12}px)`;
    bar.style.width = `${r.width - 24}px`;
    bar.style.opacity = "1";
  }, [indicated]);

  const close = useCallback((focusTrigger = false) => {
    setOpen((cur) => {
      if (focusTrigger && cur) triggers.current[cur]?.focus();
      return null;
    });
  }, []);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(null);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-nav-root]")) close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  const schedule = (fn: () => void, ms: number, which: "open" | "close") => {
    const ref = which === "open" ? openTimer : closeTimer;
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(fn, ms);
  };
  const cancel = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
  };

  const group = GROUPS.find((g) => g.key === open);

  return (
    <div data-nav-root className="hidden lg:block" onPointerLeave={(e) => e.pointerType === "mouse" && open && schedule(() => setOpen(null), 220, "close")} onPointerEnter={cancel}>
      <nav aria-label="Main">
        <ul ref={listRef} className="relative flex items-center">
          {GROUPS.map((g, i) => (
            <li key={g.key}>
              <button
                ref={(el) => {
                  triggers.current[g.key] = el;
                }}
                type="button"
                aria-expanded={open === g.key}
                aria-controls={`mega-${g.key}`}
                onClick={() => setOpen((o) => (o === g.key ? null : g.key))}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "mouse") return;
                  setHover(g.key);
                  if (open) setOpen(g.key);
                  else schedule(() => setOpen(g.key), 110, "open");
                }}
                onPointerLeave={() => {
                  setHover(null);
                  if (openTimer.current) clearTimeout(openTimer.current);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = GROUPS[(i + (e.key === "ArrowRight" ? 1 : GROUPS.length - 1)) % GROUPS.length]!;
                    triggers.current[next.key]?.focus();
                    if (open) setOpen(next.key);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(g.key);
                    requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#mega-${g.key} a`)?.focus());
                  }
                }}
                className={clsx(
                  "inline-flex h-[var(--header-h)] items-center px-4 text-[1.0625rem] font-medium text-ink transition-colors duration-[var(--d-1)] hover:text-green",
                  (open === g.key || activeKey === g.key) && "text-green",
                )}
              >
                <span className="2xl:hidden">{g.short}</span>
                <span className="hidden 2xl:inline">{g.label}</span>
              </button>
            </li>
          ))}
          <span ref={barRef} aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-0 bg-copper opacity-0 transition-[transform,width,opacity] duration-[var(--d-3)] ease-[var(--ease-out)]" />
        </ul>
      </nav>

      {group ? (
        <div
          id={`mega-${group.key}`}
          key={group.key}
          className="anim-rise absolute inset-x-0 top-full border-y border-rule bg-paper shadow-[0_24px_40px_-28px_rgb(23_35_31/0.35)]"
          onPointerEnter={cancel}
        >
          <div className="container-page grid grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,19rem)] gap-10 py-8">
            <div>
              <p className="font-display text-[1.6rem] leading-tight text-ink [font-variation-settings:'opsz'_48]">{group.label}</p>
              <p className="mt-3 text-[1rem] leading-relaxed text-ink-2">{group.intro}</p>
            </div>
            <ul className={clsx("grid content-start gap-x-6 gap-y-1", group.links.length > 4 && "grid-cols-2")}>
              {group.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={() => setOpen(null)} className="group/m -mx-2 block rounded-[4px] px-2 py-2.5 no-underline transition-colors duration-[var(--d-1)] hover:bg-card">
                    <span className="flex items-center gap-1.5 font-semibold text-ink group-hover/m:text-green">
                      {l.title}
                      <IconArrow size={14} className="-translate-x-1 opacity-0 transition-[transform,opacity] duration-[var(--d-2)] ease-[var(--ease-out)] group-hover/m:translate-x-0 group-hover/m:opacity-100 group-focus-visible/m:translate-x-0 group-focus-visible/m:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-small text-ink-2">{l.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-l border-rule pl-8">
              <Feature group={group.key} data={data} onNavigate={() => setOpen(null)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Mobile navigation sheet. */
export function MobileNav({ data }: { data: NavData }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const btnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && sheetRef.current) {
        const f = sheetRef.current.querySelectorAll<HTMLElement>("a, button, summary");
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
    const btn = btnRef.current;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      btn?.focus();
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button ref={btnRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="grid size-11 place-items-center rounded-full text-ink hover:bg-ink/5">
        <IconMenu size={21} /> <span className="sr-only">Menu</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70]" role="presentation">
          <div className="anim-fade absolute inset-0 bg-ink/35" onClick={() => setOpen(false)} aria-hidden />
          <div ref={sheetRef} role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 right-0 flex w-full max-w-[26rem] animate-[rise_var(--d-3)_var(--ease-out)_both] flex-col overflow-y-auto bg-paper">
            <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-rule px-5">
              <p className="label">Menu</p>
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-[4px] text-ink hover:bg-sage" aria-label="Close menu">
                <IconClose size={20} />
              </button>
            </div>
            <nav aria-label="Main" className="px-5 pb-10">
              {GROUPS.map((g) => (
                <details key={g.key} className="group/mg border-b border-rule" open={g.match(pathname)}>
                  <summary className="flex min-h-14 list-none items-center justify-between font-display text-[1.35rem] text-ink [font-variation-settings:'opsz'_36]">
                    {g.label}
                    <IconChevron size={18} className="text-ink-2 transition-transform duration-[var(--d-2)] group-open/mg:rotate-180" />
                  </summary>
                  <ul className="grid gap-0.5 pb-4">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="block rounded-[4px] px-2 py-2.5 no-underline hover:bg-card">
                          <span className="block font-semibold text-ink">{l.title}</span>
                          <span className="block text-small text-ink-2">{l.text}</span>
                        </Link>
                      </li>
                    ))}
                    {g.key === "exams"
                      ? data.tests.map((t) => (
                          <li key={t.slug}>
                            <Link href={`/11-plus/${t.slug}`} className="block rounded-[4px] px-2 py-2 text-ink-2 no-underline hover:bg-card">
                              {t.name}
                            </Link>
                          </li>
                        ))
                      : null}
                  </ul>
                </details>
              ))}
              <p className="mt-6 text-small text-ink-2">
                <Link href="/account" className="a">
                  Your account
                </Link>{" "}
                ·{" "}
                <Link href="/about" className="a">
                  About
                </Link>
              </p>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
