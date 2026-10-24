"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function ProfileTabs({ slug, tabs }: { slug: string; tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="School sections" className="-mb-px overflow-x-auto">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const href = `/schools/${slug}${t.href}`;
          const active = pathname === href;
          return (
            <li key={t.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "block border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "border-accent text-ink" : "border-transparent text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
