import Link from "next/link";
import { notFound } from "next/navigation";
import { GENDER_LABEL, NATION_LABEL, SELECTIVITY_LABEL } from "@/domain/labels";
import { defaultEntryYear } from "@/lib/academic-year";
import { formatNumber, relativeAge } from "@/lib/format";
import { getAllocations, getEntranceTests, getPolicies, getSchoolCore, policyForYear } from "@/server/profile";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { IconCompare, IconExternal, IconPin } from "@/ui/icons";
import { Hero, HeroFigures } from "@/ui/hero";
import { Tag } from "@/ui/kit";
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
  const entryYear = defaultEntryYear();
  const [policies, tests, allocations] = await Promise.all([getPolicies(school.id), getEntranceTests(school.id, entryYear), getAllocations(school.id)]);
  const policy = policyForYear(policies, entryYear);
  const test = tests[0]?.test ?? null;
  const lastYear = allocations.map((a) => a.entryYear).sort().at(-1);
  const lastGet = (m: string) => allocations.find((a) => a.entryYear === lastYear && a.metric === m)?.value ?? null;
  const figures: [React.ReactNode, React.ReactNode][] = [
    [policy?.publishedAdmissionNumber ? formatNumber(policy.publishedAdmissionNumber) : "—", `places for September ${entryYear}`],
    ...(lastYear && lastGet("times_first_preference") !== null
      ? ([
          [formatNumber(lastGet("times_first_preference")), `first choices, Sept ${lastYear}`],
          [formatNumber(lastGet("offers_made")), `offers made, Sept ${lastYear}`],
        ] as [React.ReactNode, React.ReactNode][])
      : ([[census?.pupils ? formatNumber(census.pupils) : "—", "pupils on roll"]] as [React.ReactNode, React.ReactNode][])),
  ];
  const place = [location?.town, location?.postcode, isNI ? region?.name : la?.name, NATION_LABEL[school.nation]].filter(Boolean).join(" · ");

  return (
    <>
      <Hero className="pb-20 sm:pb-24">
        <Breadcrumbs items={[{ href: "/grammar-schools", label: "Grammar schools" }, ...(areaCrumb ? [areaCrumb] : []), { href: `/schools/${slug}`, label: school.name }]} />
        <div className="mt-8 grid gap-x-16 gap-y-8 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)] lg:items-end">
          <div className="anim-rise min-w-0">
            <p className="label text-[#a9bcff]">
              School report
              {urn ? <span className="text-ink-3"> · URN {urn}</span> : null}
              {deni ? <span className="text-ink-3"> · DENI {deni}</span> : null}
            </p>
            <h1 className="mt-3 max-w-[24ch] text-[clamp(2.1rem,1.6rem+2vw,2.9rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-white">{school.name}</h1>
            <p className="mt-4 flex items-start gap-2 text-[1.0625rem] text-ink-2">
              <IconPin size={18} className="mt-1 shrink-0 text-copper" />
              {place}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <Tag tone="green">{SELECTIVITY_LABEL[school.selectivity]}</Tag>
              {school.gender !== "unknown" ? <Tag>{GENDER_LABEL[school.gender]}</Tag> : null}
              {school.hasSixthForm ? <Tag>Sixth form</Tag> : school.hasSixthForm === false ? <Tag>11–16</Tag> : null}
              {school.boarding === "boarding" ? <Tag>Boarding places</Tag> : null}
              {test ? (
                <Link href={`/11-plus/${test.slug}`} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[0.8125rem] font-semibold text-white no-underline shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] hover:bg-white/20">
                  Test: {test.name}
                </Link>
              ) : null}
              {school.selectivity === "partially_selective" ? <Status status={school.verificationStatus} /> : null}
              {!school.isOpen ? <Tag tone="bad">{school.status}</Tag> : null}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2" data-no-print>
              <SaveButton slug={slug} name={school.name} />
              <Link href={`/compare?schools=${slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-control bg-card px-3.5 text-[0.95rem] font-semibold text-ink no-underline hover:border-ink">
                <IconCompare size={17} /> Compare
              </Link>
              {contact?.website ? (
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-control bg-card px-3.5 text-[0.95rem] font-semibold text-ink no-underline hover:border-ink">
                  School website <IconExternal size={15} />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
              <PrintButton />
            </div>
          </div>
          <HeroFigures items={figures} footer={<>Record checked {relativeAge(school.lastCheckedAt)} against {school.nation === "england" ? "Get Information about Schools (DfE)" : "the Department of Education (NI) census"}.</>} />
        </div>
      </Hero>
      <ChapterNav slug={slug} chapters={CHAPTERS} />
      {children}
      <CompareTray />
    </>
  );
}
