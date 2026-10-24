import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, GitCompareArrows, MapPin } from "lucide-react";
import { GENDER_LABEL, NATION_LABEL, SELECTIVITY_LABEL } from "@/domain/labels";
import { relativeAge } from "@/lib/format";
import { getSchoolCore } from "@/server/profile";
import { CompareTray, SaveButton } from "@/components/school/shortlist";
import { ProfileTabs } from "@/components/school/profile-tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container, Pill } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/verification";

const TABS = [
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
  const { school, location, contact, la, region } = core;
  const areaCrumb = school.nation === "northern_ireland" ? { href: "/grammar-schools/northern-ireland", label: "Northern Ireland" } : la ? { href: `/grammar-schools/${la.slug}`, label: la.name } : null;

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="pt-6">
          <Breadcrumbs items={[{ href: "/grammar-schools", label: "Grammar schools" }, ...(areaCrumb ? [areaCrumb] : []), { href: `/schools/${slug}`, label: school.name }]} />
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-3xl leading-tight font-semibold sm:text-4xl">{school.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-ink-2">
                <MapPin aria-hidden className="size-4 text-ink-3" />
                {[location?.town, location?.postcode, school.nation === "northern_ireland" ? region?.name : la?.name, NATION_LABEL[school.nation]].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Pill>{SELECTIVITY_LABEL[school.selectivity]}</Pill>
                <Pill>{GENDER_LABEL[school.gender]}</Pill>
                {school.hasSixthForm ? <Pill>Sixth form</Pill> : school.hasSixthForm === false ? <Pill>11–16</Pill> : null}
                {school.boarding === "boarding" ? <Pill>Boarding places</Pill> : null}
                {school.selectivity === "partially_selective" ? <VerificationBadge status={school.verificationStatus} /> : null}
                {!school.isOpen ? <Pill className="!border-bad/40 !text-bad">{school.status}</Pill> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2" data-no-print>
              {contact?.website ? (
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2">
                  School website <ExternalLink aria-hidden className="size-3.5" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
              <SaveButton slug={slug} name={school.name} />
              <Link href={`/compare?schools=${slug}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2">
                <GitCompareArrows aria-hidden className="size-4" /> Compare
              </Link>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-3">
            School record last checked {relativeAge(school.lastCheckedAt)} against{" "}
            {school.nation === "england" ? "Get Information about Schools (DfE)" : "the Department of Education (NI) school census"}.
          </p>
          <div className="mt-4">
            <ProfileTabs slug={slug} tabs={TABS} />
          </div>
        </Container>
      </div>
      <Container className="py-8">{children}</Container>
      <CompareTray />
    </>
  );
}
