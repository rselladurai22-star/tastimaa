import Link from "next/link";
import { Menu } from "lucide-react";
import { PRIMARY_NAV, SITE } from "@/lib/site";
import { SearchBox } from "@/components/search/search-box";
import { ShortlistIndicator } from "@/components/school/shortlist";
import { Container } from "@/components/ui/primitives";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label={`${SITE.name} home`}>
      <svg viewBox="0 0 32 32" aria-hidden className="size-7 shrink-0">
        <rect width="32" height="32" rx="7" fill="var(--accent)" />
        <path d="M9 22.5V11.8L16 8l7 3.8v10.7" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <path d="M13 22.5v-5.5h6v5.5M7.5 22.5h17" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-[1.2rem] font-semibold tracking-tight text-ink">{SITE.name}</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header data-site-header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <Container className="flex h-16 items-center gap-4">
        <Logo />
        <nav aria-label="Primary" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded-md px-2.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto hidden w-72 md:block xl:w-80">
          <SearchBox shortcut placeholder="School, town or postcode" />
        </div>
        <ShortlistIndicator />
        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden className="size-4" /> Menu
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-md)]">
            <div className="mb-3 md:hidden">
              <SearchBox />
            </div>
            <nav aria-label="Primary (mobile)">
              <ul className="grid gap-0.5">
                {PRIMARY_NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="block rounded-md px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                      {n.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/assistant" className="block rounded-md px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2">
                    Research assistant
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </details>
      </Container>
    </header>
  );
}
