"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/review", "Review queue"],
  ["/admin/runs", "Ingestion runs"],
  ["/admin/documents", "Documents"],
  ["/admin/schools", "Schools"],
] as const;

export function ConsoleNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="relative flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map(([href, label], i) => {
        const on = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={clsx("flex min-h-10 shrink-0 items-center gap-3 rounded-[4px] px-3 text-[0.95rem] whitespace-nowrap no-underline transition-colors", on ? "bg-paper/10 font-semibold text-paper" : "text-paper/75 hover:bg-paper/5 hover:text-paper")}
          >
            <span aria-hidden className={clsx("font-mono text-[0.72rem]", on ? "text-copper" : "text-paper/50")}>
              {String(i + 1).padStart(2, "0")}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
