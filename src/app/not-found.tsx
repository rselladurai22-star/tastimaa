import Link from "next/link";
import { ArrowLink, Kicker, Page } from "@/ui/kit";
import { SearchField } from "@/ui/search";

export default function NotFound() {
  return (
    <Page className="grid gap-12 pt-16 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center">
      <div className="max-w-[42rem]">
        <Kicker>404 · Off the map</Kicker>
        <h1 className="mt-4 text-h1 [font-variation-settings:'opsz'_72]">We can&apos;t find that page</h1>
        <p className="mt-4 text-lede leading-[1.5] text-ink">The school may have changed its name or closed, or the link may be mistyped. Try searching:</p>
        <div className="mt-6">
          <SearchField placeholder="School, town or postcode" />
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <ArrowLink href="/grammar-schools">Browse all grammar schools</ArrowLink>
          <ArrowLink href="/admissions">How admissions work</ArrowLink>
        </div>
      </div>
      <svg aria-hidden viewBox="0 0 240 200" className="hidden w-full max-w-[22rem] lg:block" fill="none">
        {[0, 1, 2, 3, 4].map((k) => (
          <ellipse key={k} cx="120" cy="100" rx={24 + k * 20} ry={16 + k * 15} transform={`rotate(${-12 + k * 3} 120 100)`} strokeWidth="1" style={{ stroke: "var(--rule-strong)" }} strokeDasharray={k === 4 ? "3 5" : undefined} />
        ))}
        <path d="M112 92l16 16M128 92l-16 16" strokeWidth="2.5" strokeLinecap="round" style={{ stroke: "var(--copper)" }} />
      </svg>
      <p className="sr-only">
        <Link href="/">Return to the homepage</Link>
      </p>
    </Page>
  );
}
