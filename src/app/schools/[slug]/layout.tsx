import Link from "next/link";
import { notFound } from "next/navigation";
import { GENDER_LABEL, NATION_LABEL, SELECTIVITY_LABEL, SELECTIVITY_SHORT } from "@/domain/labels";
import { formatNumber, relativeAge } from "@/lib/format";
import { getSchoolCore } from "@/server/profile";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { IconCompare, IconExternal, IconPin } from "@/ui/icons";
import { Page, Tag } from "@/ui/kit";
import { ChapterNav, PrintButton } from "@/ui/report/chrome";
import { CompareTray, SaveButton } from "@/ui/shortlist";
import { Status } from "@/ui/status";

const CHAPTERS = [
  { href: "", label: "Overview" },
  { href: "/admissions", label: "Admissions" },
  { href: "/11-plus", label: "Entrance test" },
  { href: "/catchment", label: "Catchment & distance" },
  { href: "/results", label: "Results" },
  { href: "/inspection", label: "Inspection" },
  { href: "/historical-admissions", label: "Applications & offers" },
];

export default async function SchoolLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const core = await getSchoolCore(slug);
  if (!core) notFound();
  const { school, location, contact, la, region, census, identifiers } = core;
  const isNI = school.nation === "northern_ireland";
  const areaCrumb = isNI ? { href: "/grammar-schools/northern-ireland", label: "Northern Ireland" } : la ? { href: `/grammar-schools/${la.slug}`, label: la.name } : null;
  const urn = identifiers.find((i) => i.scheme === "urn" && i.isCurrent)?.value;
  const deni = identifiers.find((i) => i.scheme === "deni")?.value;
  const place = [location?.town, location?.postcode, isNI ? region?.name : la?.name, NATION_LABEL[school.nation]].filter(Boolean).join(" · ");

  return (
    <>
      <header className="relative overflow-hidden">
        <Page className="relative pt-6 pb-8 sm:pb-10">
          <Breadcrumbs items={[{ href: "/grammar-schools", label: "Grammar schools" }, ...(areaCrumb ? [areaCrumb] : []), { href: `/schools/${slug}`, label: school.name }]} />
          <div className="mt-7 grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div className="min-w-0">
              <p className="label">
                School report
                {urn ? <span className="text-ink-3"> · URN {urn}</span> : null}
                {deni ? <span className="text-ink-3"> · DENI {deni}</span> : null}
              </p>
              <h1 className="mt-3 max-w-[22ch] text-h1 leading-[1.04] [font-variation-settings:'opsz'_72] sm:text-display">{school.name}</h1>
              <p className="mt-4 flex items-start gap-2 text-[1.08rem] text-ink-2">
                <IconPin size={18} className="mt-1 shrink-0 text-copper-ink" />
                {place}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Tag tone="green">{SELECTIVITY_LABEL[school.selectivity]}</Tag>
                {school.gender !== "unknown" ? <Tag>{GENDER_LABEL[school.gender]}</Tag> : null}
                {school.hasSixthForm ? <Tag>Sixth form</Tag> : school.hasSixthForm === false ? <Tag>11–16</Tag> : null}
                {school.boarding === "boarding" ? <Tag>Boarding places</Tag> : null}
                {school.selectivity === "partially_selective" ? <Status status={school.verificationStatus} /> : null}
                {!school.isOpen ? <Tag tone="bad">{school.status}</Tag> : null}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2" data-no-print>
                <SaveButton slug={slug} name={school.name} />
                <Link href={`/compare?schools=${slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-[5px] border border-control bg-card px-3.5 text-[0.95rem] font-semibold text-ink no-underline hover:border-ink">
                  <IconCompare size={17} /> Compare
                </Link>
                {contact?.website ? (
                  <a href={contact.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-[5px] border border-control bg-card px-3.5 text-[0.95rem] font-semibold text-ink no-underline hover:border-ink">
                    School website <IconExternal size={15} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : null}
                <PrintButton />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-rule bg-rule lg:grid-cols-1">
              {[
                ["Type", SELECTIVITY_SHORT[school.selectivity]],
                ["Admits", school.gender === "unknown" ? "Not recorded" : GENDER_LABEL[school.gender]],
                ["Ages", school.ageLow && school.ageHigh ? `${school.ageLow}–${school.ageHigh}` : "Not recorded"],
                ["Pupils", census?.pupils ? formatNumber(census.pupils) : "Not recorded"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 bg-card px-4 py-2.5">
                  <dt className="label text-[0.72rem]">{k}</dt>
                  <dd className="text-right font-semibold text-ink num">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-6 text-small text-ink-2">
            Record last checked {relativeAge(school.lastCheckedAt)} against {school.nation === "england" ? "Get Information about Schools (DfE)" : "the Department of Education (NI) school census"}.
          </p>
        </Page>
      </header>
      <ChapterNav slug={slug} chapters={CHAPTERS} />
      {children}
      <CompareTray />
    </>
  );
}
