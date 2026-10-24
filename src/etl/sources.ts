import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Registry of every data source the platform uses. Licences are recorded so
 * that every published figure can be traced back to its terms of use.
 */
export const SOURCE_DEFINITIONS = {
  gias: {
    name: "Get Information about Schools (GIAS) — all establishment data",
    publisher: "Department for Education",
    homepageUrl: "https://get-information-schools.service.gov.uk/Downloads",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    method: "bulk_download",
    refreshCadence: "daily (GIAS publishes a new extract each day; we refresh weekly)",
    notes: "Bulk CSV download. The GIAS public search interface is never scraped.",
  },
  gias_links: {
    name: "GIAS — establishment links (predecessors and successors)",
    publisher: "Department for Education",
    homepageUrl: "https://get-information-schools.service.gov.uk/Downloads",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    method: "bulk_download",
    refreshCadence: "weekly",
    notes: "Used for school identity resolution and former names.",
  },
  deni_census: {
    name: "School enrolments — post-primary school level data",
    publisher: "Department of Education (Northern Ireland)",
    homepageUrl: "https://www.education-ni.gov.uk/articles/school-enrolments-school-level-data",
    licence: "Crown copyright — Open Government Licence v3.0",
    licenceUrl: "https://www.education-ni.gov.uk/articles/crown-copyright-education",
    method: "bulk_download",
    refreshCadence: "annual (school census, published each spring)",
    notes: "Reference data identifies grammar schools (School Type = Grammar).",
  },
  ees_ks4: {
    name: "Key stage 4 performance — performance tables schools data",
    publisher: "Department for Education (Explore Education Statistics)",
    homepageUrl: "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    method: "api",
    refreshCadence: "annual (provisional in October, revised in February)",
    notes: "EES public API data set 'Performance tables schools data'.",
  },
  ees_ks4_la: {
    name: "Key stage 4 performance — local authority district data",
    publisher: "Department for Education (Explore Education Statistics)",
    homepageUrl: "https://explore-education-statistics.service.gov.uk/find-statistics/key-stage-4-performance",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    method: "api",
    refreshCadence: "annual",
    notes: "Comparator values for local authorities and England.",
  },
  ees_1618: {
    name: "16 to 18 performance — schools and colleges performance",
    publisher: "Department for Education (Explore Education Statistics)",
    homepageUrl: "https://explore-education-statistics.service.gov.uk/find-statistics/16-to-19-performance",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    method: "api",
    refreshCadence: "annual (provisional in November, revised in spring)",
    notes: "EES public API data set 'Schools and colleges - performance'.",
  },
  ees_apps_offers: {
    name: "Secondary and primary school applications and offers — school level",
    publisher: "Department for Education (Explore Education Statistics)",
    homepageUrl: "https://explore-education-statistics.service.gov.uk/find-statistics/secondary-and-primary-school-applications-and-offers",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    method: "bulk_download",
    refreshCadence: "annual (June)",
    notes: "School-level supporting file from the release download bundle.",
  },
  ofsted_mi: {
    name: "State-funded school inspections and outcomes: management information",
    publisher: "Ofsted",
    homepageUrl: "https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    method: "bulk_download",
    refreshCadence: "monthly",
    notes: "Latest inspections CSV. Report card (Nov 2025+) and EIF graded/ungraded outcomes kept separate.",
  },
  postcodes_io: {
    name: "Postcodes.io (ONS Postcode Directory)",
    publisher: "Ideal Postcodes / Office for National Statistics",
    homepageUrl: "https://postcodes.io/",
    licence: "Open Government Licence v3.0 (GB); Northern Ireland postcodes subject to LPS terms",
    licenceUrl: "https://postcodes.io/about",
    method: "api",
    refreshCadence: "on demand (cached 30 days)",
    notes: "Postcode centroids only — never treated as an exact home address.",
  },
  school_admissions_documents: {
    name: "School and local authority admissions arrangements",
    publisher: "Individual admission authorities",
    homepageUrl: "https://www.gov.uk/government/publications/school-admissions-code--2",
    licence: "Varies by publisher — stored for reference and citation; quotes kept short",
    method: "web_document",
    refreshCadence: "annual (arrangements determined by 28 February each year in England)",
    notes: "Fetched only where robots.txt permits, at low request rates; otherwise uploaded by an administrator.",
  },
  editorial: {
    name: "Editorial research (cited official sources)",
    publisher: "Grammar Atlas editorial team",
    homepageUrl: "/methodology",
    licence: "Our own work; cites official sources",
    method: "manual_entry",
    refreshCadence: "reviewed each admission cycle",
    notes: "Every editorial fact links to the official source it was checked against.",
  },
} as const satisfies Record<
  string,
  {
    name: string;
    publisher: string;
    homepageUrl: string;
    licence: string;
    licenceUrl?: string;
    method: (typeof schema.sourceMethodEnum.enumValues)[number];
    refreshCadence: string;
    notes: string;
  }
>;

export type SourceKey = keyof typeof SOURCE_DEFINITIONS;

/** Upsert a source definition and return its id. */
export async function ensureSource(key: SourceKey): Promise<number> {
  const def = SOURCE_DEFINITIONS[key];
  const [row] = await db()
    .insert(schema.sources)
    .values({ key, ...def })
    .onConflictDoUpdate({
      target: schema.sources.key,
      set: { ...def, updatedAt: new Date() },
    })
    .returning({ id: schema.sources.id });
  if (!row) throw new Error(`Could not upsert source ${key}`);
  return row.id;
}

export async function getSourceId(key: SourceKey): Promise<number | undefined> {
  const row = await db().query.sources.findFirst({ where: eq(schema.sources.key, key), columns: { id: true } });
  return row?.id;
}
