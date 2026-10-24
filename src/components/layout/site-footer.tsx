import Link from "next/link";
import { SITE } from "@/lib/site";
import { Container } from "@/components/ui/primitives";

const GROUPS = [
  {
    title: "Schools",
    links: [
      { href: "/grammar-schools", label: "All grammar schools" },
      { href: "/grammar-schools/england", label: "England" },
      { href: "/grammar-schools/northern-ireland", label: "Northern Ireland" },
      { href: "/grammar-schools/kent", label: "Kent" },
      { href: "/grammar-schools/buckinghamshire", label: "Buckinghamshire" },
      { href: "/compare", label: "Compare schools" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/tools/catchment-checker", label: "Postcode & catchment checker" },
      { href: "/tools/eligibility-checker", label: "Eligibility checker" },
      { href: "/tools/planner", label: "Admissions planner" },
      { href: "/assistant", label: "Research assistant" },
      { href: "/calendar", label: "Key dates" },
    ],
  },
  {
    title: "Guides",
    links: [
      { href: "/admissions", label: "How grammar school admissions work" },
      { href: "/admissions/qualifying-is-not-an-offer", label: "Qualifying is not an offer" },
      { href: "/admissions/appeals", label: "Appeals" },
      { href: "/11-plus", label: "The 11+ explained" },
      { href: "/admissions/northern-ireland", label: "Northern Ireland transfer" },
      { href: "/admissions/wales-and-scotland", label: "Wales and Scotland" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/methodology", label: "Methodology" },
      { href: "/data-sources", label: "Data sources & freshness" },
      { href: "/corrections", label: "Report a correction" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer data-site-footer className="mt-24 border-t border-line bg-surface-2/60">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <p className="font-serif text-lg font-semibold">{SITE.name}</p>
            <p className="mt-2 text-sm text-ink-2">An independent guide to UK grammar schools. Every fact has a source.</p>
          </div>
          {GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="text-sm font-semibold text-ink">{g.title}</p>
              <ul className="mt-3 grid gap-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-2 hover:text-ink hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-ink-3">
          <p>
            We are independent. We are not a school, council or exam board, and we cannot submit applications or guarantee places. Admissions decisions are made by each school&apos;s
            admission authority under its published arrangements — always confirm details with the school or your local council.
          </p>
          <p className="mt-2">
            Contains public sector information licensed under the Open Government Licence v3.0 (Department for Education, Ofsted, Department of Education Northern Ireland, Office for
            National Statistics). Postcode data © Royal Mail and Crown copyright.
          </p>
        </div>
      </Container>
    </footer>
  );
}
