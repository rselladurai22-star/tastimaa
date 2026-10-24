import Link from "next/link";
import { AtlasMark } from "./brand";
import { ArrowLink } from "./kit";

const COLUMNS: [string, [string, string][]][] = [
  ["Discover", [["/grammar-schools", "All grammar schools"], ["/grammar-schools?view=map", "Schools near a postcode"], ["/grammar-schools/northern-ireland", "Northern Ireland"], ["/compare", "Compare schools"]]],
  ["Understand", [["/admissions", "How admissions work"], ["/admissions/qualifying-is-not-an-offer", "Qualifying isn't an offer"], ["/admissions/oversubscription", "Oversubscription criteria"], ["/admissions/appeals", "Appeals"]]],
  ["11+ exams", [["/11-plus", "The 11+ explained"], ["/11-plus/exam-providers", "Tests and providers"], ["/11-plus/preparation", "Practice questions"]]],
  ["Tools", [["/tools/eligibility-checker", "Eligibility checker"], ["/tools/catchment-checker", "Catchment checker"], ["/tools/planner", "Admissions planner"], ["/assistant", "Research assistant"], ["/calendar", "Admissions calendar"]]],
  ["The atlas", [["/about", "About"], ["/methodology", "Methodology"], ["/data-sources", "Data sources"], ["/privacy", "Privacy"], ["/accessibility", "Accessibility"], ["/terms", "Terms"], ["/account", "Your account"]]],
];

export function SiteFooter() {
  return (
    <footer data-site-footer className="mt-24 border-t border-rule bg-sage/60">
      <div className="container-page grid gap-12 pt-14 pb-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div>
          <AtlasMark size={40} />
          <p className="mt-5 font-display text-[1.6rem] leading-[1.2] text-ink [font-variation-settings:'opsz'_48]">Every fact here carries its source. If one is wrong, we want to know.</p>
          <div className="mt-5 flex flex-col items-start gap-2">
            <ArrowLink href="/corrections">Report a correction</ArrowLink>
            <ArrowLink href="/methodology">How we verify information</ArrowLink>
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <p className="label mb-3">{title}</p>
              <ul className="grid gap-2">
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-[0.98rem] text-ink no-underline decoration-green/40 underline-offset-4 hover:text-green hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-rule">
        <div className="container-page grid gap-3 py-6 text-small leading-relaxed text-ink-2 md:grid-cols-[1fr_auto] md:items-start">
          <p className="max-w-[78ch]">
            Grammar Atlas is independent: not a school, council or exam board. We can&apos;t submit applications or guarantee places — each school&apos;s admission authority decides. Contains public sector information licensed under the Open
            Government Licence v3.0 (Department for Education, Ofsted, Department of Education Northern Ireland, Office for National Statistics). Postcode data © Royal Mail and Crown copyright.
          </p>
          <p className="font-mono text-[0.82rem]">© {new Date().getFullYear()} Grammar Atlas</p>
        </div>
      </div>
    </footer>
  );
}
