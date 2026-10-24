/**
 * Database schema.
 *
 * Design principles:
 * - Stable school identity (`schools`) is separated from identifiers, names,
 *   locations, census snapshots and contacts so that no single table becomes a
 *   dumping ground for hundreds of unrelated fields.
 * - Every data-bearing row carries row-level provenance: the source document it
 *   came from, a locator (page/section/row), a verification status and when it
 *   was last checked.
 * - Anything that varies by year is keyed by academic year ("2024/25") or by
 *   admission entry year (the September a child starts, e.g. 2027).
 * - Admissions rules are stored as structured, ordered, versioned rows rather
 *   than free text so they can be evaluated and compared.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Custom column types                                                 */
/* ------------------------------------------------------------------ */

/** WGS84 point stored as PostGIS geography. Written/read via raw SQL helpers. */
const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
});

/** WGS84 multipolygon stored as PostGIS geography. */
const geographyMultiPolygon = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(MultiPolygon,4326)";
  },
});

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const nationEnum = pgEnum("nation", ["england", "northern_ireland", "wales", "scotland"]);

/** How the school selects pupils. Only `fully_selective` comes directly from an official flag (GIAS / DE NI). */
export const selectivityEnum = pgEnum("selectivity", [
  "fully_selective",
  "partially_selective",
  "selective_stream",
  "non_selective",
]);

export const genderEnum = pgEnum("gender_policy", ["boys", "girls", "mixed", "unknown"]);

export const boardingEnum = pgEnum("boarding", ["none", "boarding", "unknown"]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "officially_verified",
  "awaiting_verification",
  "historical",
  "estimated",
  "unavailable",
  "conflicting",
]);

export const confidenceEnum = pgEnum("confidence", ["high", "medium", "low"]);

export const areaTypeEnum = pgEnum("area_type", [
  "nation",
  "region",
  "county",
  "local_authority",
  "test_area",
  "education_authority",
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", ["running", "succeeded", "partial", "failed"]);

export const documentStatusEnum = pgEnum("document_status", ["active", "superseded", "withdrawn", "unavailable"]);

export const sourceMethodEnum = pgEnum("source_method", ["bulk_download", "api", "admin_upload", "manual_entry", "web_document"]);

export const inspectionFrameworkEnum = pgEnum("inspection_framework", [
  /** Renewed framework with report cards, from 10 November 2025. */
  "report_card_2025",
  /** Education inspection framework (graded), September 2019 to November 2025. */
  "eif_2019",
  /** Ungraded (section 8) inspections under the EIF. */
  "eif_2019_ungraded",
  /** Pre-2019 frameworks. */
  "pre_2019",
]);

export const policyStatusEnum = pgEnum("policy_status", ["draft", "awaiting_verification", "published", "superseded", "rejected"]);

export const catchmentTypeEnum = pgEnum("catchment_type", [
  "none",
  "defined_area",
  "distance_only",
  "multiple_areas",
  "unknown",
]);

export const outOfAreaRouteEnum = pgEnum("out_of_area_route", ["yes", "no", "limited", "unknown"]);

export const criterionCategoryEnum = pgEnum("criterion_category", [
  "qualification_required",
  "looked_after",
  "previously_looked_after",
  "ehcp_named",
  "pupil_premium",
  "free_school_meals",
  "sibling",
  "staff_child",
  "medical_social",
  "catchment_resident",
  "distance",
  "feeder_school",
  "faith",
  "score_rank",
  "random_allocation",
  "other",
]);

export const scoreRuleKindEnum = pgEnum("score_rule_kind", [
  "qualifying_threshold",
  "automatic_qualification",
  "ranked_by_score",
  "priority_threshold",
  "reserved_places_threshold",
]);

export const eventTypeEnum = pgEnum("admission_event_type", [
  "open_event",
  "registration_opens",
  "registration_closes",
  "test_date",
  "results_released",
  "application_deadline",
  "supplementary_form_deadline",
  "national_offer_day",
  "offer_response_deadline",
  "waiting_list",
  "appeal_deadline",
  "appeal_hearings",
  "other",
]);

export const eventScopeEnum = pgEnum("event_scope", ["nation", "local_authority", "test_area", "school"]);

export const boundaryKindEnum = pgEnum("boundary_kind", ["official_catchment", "priority_area", "designated_area", "test_area"]);

export const reviewTaskTypeEnum = pgEnum("review_task_type", [
  "extracted_rule",
  "extracted_policy",
  "conflicting_sources",
  "stale_record",
  "missing_field",
  "user_correction",
  "ingestion_failure",
  "identity_match",
  "change_detected",
]);

export const reviewStatusEnum = pgEnum("review_status", ["open", "in_review", "approved", "rejected", "resolved"]);

export const userRoleEnum = pgEnum("user_role", ["parent", "editor", "admin"]);

/* ------------------------------------------------------------------ */
/* Provenance helpers                                                  */
/* ------------------------------------------------------------------ */

/** Columns added to every row that represents a sourced fact. */
const provenance = () => ({
  sourceDocumentId: integer("source_document_id").references((): AnyPgColumn => sourceDocuments.id, { onDelete: "set null" }),
  sourceLocator: text("source_locator"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("awaiting_verification"),
  confidence: confidenceEnum("confidence"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
});

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Sources & provenance                                                */
/* ------------------------------------------------------------------ */

export const sources = pgTable("sources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  publisher: text("publisher").notNull(),
  homepageUrl: text("homepage_url").notNull(),
  licence: text("licence").notNull(),
  licenceUrl: text("licence_url"),
  method: sourceMethodEnum("method").notNull(),
  refreshCadence: text("refresh_cadence"),
  notes: text("notes"),
  ...timestamps(),
});

export const sourceDocuments = pgTable(
  "source_documents",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    schoolId: integer("school_id").references((): AnyPgColumn => schools.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    publisher: text("publisher"),
    publishedAt: date("published_at"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    academicYear: text("academic_year"),
    entryYear: integer("entry_year"),
    version: text("version"),
    checksumSha256: text("checksum_sha256"),
    contentType: text("content_type"),
    byteSize: integer("byte_size"),
    storageKey: text("storage_key"),
    status: documentStatusEnum("status").notNull().default("active"),
    supersededById: integer("superseded_by_id"),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [
    index("source_documents_source_idx").on(t.sourceId),
    index("source_documents_school_idx").on(t.schoolId),
    uniqueIndex("source_documents_url_checksum_uq").on(t.url, t.checksumSha256),
  ],
);

/** Searchable passages extracted from source documents (used by the assistant for retrieval). */
export const sourceExtracts = pgTable(
  "source_extracts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    documentId: integer("document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    schoolId: integer("school_id"),
    locator: text("locator"),
    heading: text("heading"),
    text: text("text").notNull(),
    searchDocument: tsvector("search_document").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(heading, '') || ' ' || text)`,
    ),
    ...timestamps(),
  },
  (t) => [
    index("source_extracts_document_idx").on(t.documentId),
    index("source_extracts_school_idx").on(t.schoolId),
    index("source_extracts_search_idx").using("gin", t.searchDocument),
  ],
);

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sourceId: integer("source_id").references(() => sources.id, { onDelete: "set null" }),
    job: text("job").notNull(),
    status: ingestionStatusEnum("status").notNull().default("running"),
    trigger: text("trigger").notNull().default("manual"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    documentId: integer("document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
    rowsRead: integer("rows_read").notNull().default(0),
    rowsInserted: integer("rows_inserted").notNull().default(0),
    rowsUpdated: integer("rows_updated").notNull().default(0),
    rowsUnchanged: integer("rows_unchanged").notNull().default(0),
    rowsRejected: integer("rows_rejected").notNull().default(0),
    attempt: integer("attempt").notNull().default(1),
    error: text("error"),
    stats: jsonb("stats").$type<Record<string, unknown>>(),
  },
  (t) => [index("ingestion_runs_job_idx").on(t.job, t.startedAt)],
);

export const ingestionIssues = pgTable(
  "ingestion_issues",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    runId: integer("run_id")
      .notNull()
      .references(() => ingestionRuns.id, { onDelete: "cascade" }),
    severity: text("severity").notNull(),
    code: text("code").notNull(),
    message: text("message").notNull(),
    recordRef: text("record_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ingestion_issues_run_idx").on(t.runId)],
);

/* ------------------------------------------------------------------ */
/* Geography                                                           */
/* ------------------------------------------------------------------ */

export const geographicAreas = pgTable(
  "geographic_areas",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: areaTypeEnum("type").notNull(),
    nation: nationEnum("nation").notNull(),
    code: text("code"),
    legacyCode: text("legacy_code"),
    parentId: integer("parent_id"),
    summary: text("summary"),
    ...timestamps(),
  },
  (t) => [index("geographic_areas_type_idx").on(t.type, t.nation), index("geographic_areas_code_idx").on(t.code)],
);

/* ------------------------------------------------------------------ */
/* Schools                                                             */
/* ------------------------------------------------------------------ */

export const schools = pgTable(
  "schools",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nation: nationEnum("nation").notNull(),
    selectivity: selectivityEnum("selectivity").notNull(),
    /** Official establishment status, e.g. "Open", "Open, but proposed to close". */
    status: text("status").notNull(),
    isOpen: boolean("is_open").notNull().default(true),
    establishmentType: text("establishment_type"),
    establishmentGroup: text("establishment_group"),
    governance: text("governance"),
    phase: text("phase"),
    gender: genderEnum("gender").notNull().default("unknown"),
    ageLow: integer("age_low"),
    ageHigh: integer("age_high"),
    hasSixthForm: boolean("has_sixth_form"),
    boarding: boardingEnum("boarding").notNull().default("unknown"),
    religiousCharacter: text("religious_character"),
    trustName: text("trust_name"),
    trustCode: text("trust_code"),
    localAuthorityId: integer("local_authority_id").references(() => geographicAreas.id, { onDelete: "set null" }),
    regionId: integer("region_id").references(() => geographicAreas.id, { onDelete: "set null" }),
    openDate: date("open_date"),
    closeDate: date("close_date"),
    /** Normalised text used for fuzzy matching (name + former names + town + LA). */
    searchText: text("search_text"),
    searchDocument: tsvector("search_document"),
    ...provenance(),
    ...timestamps(),
  },
  (t) => [
    index("schools_nation_idx").on(t.nation, t.selectivity, t.isOpen),
    index("schools_la_idx").on(t.localAuthorityId),
    index("schools_region_idx").on(t.regionId),
    index("schools_search_idx").using("gin", t.searchDocument),
    index("schools_search_text_trgm_idx").using("gin", sql`${t.searchText} gin_trgm_ops`),
    index("schools_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
  ],
);

export const schoolIdentifiers = pgTable(
  "school_identifiers",
  {
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** urn | laestab | ukprn | uprn | deni */
    scheme: text("scheme").notNull(),
    value: text("value").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    ...provenance(),
  },
  (t) => [primaryKey({ columns: [t.scheme, t.value] }), index("school_identifiers_school_idx").on(t.schoolId)],
);

export const schoolNames = pgTable(
  "school_names",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    /** e.g. predecessor URN the name belonged to. */
    context: text("context"),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    ...provenance(),
  },
  (t) => [uniqueIndex("school_names_school_name_uq").on(t.schoolId, t.name)],
);

export const schoolLocations = pgTable(
  "school_locations",
  {
    schoolId: integer("school_id")
      .primaryKey()
      .references(() => schools.id, { onDelete: "cascade" }),
    street: text("street"),
    locality: text("locality"),
    address3: text("address3"),
    town: text("town"),
    county: text("county"),
    postcode: text("postcode"),
    easting: integer("easting"),
    northing: integer("northing"),
    location: geographyPoint("location"),
    /** How the point was derived: "gias_easting_northing" | "postcode_centroid" | "manual". */
    locationMethod: text("location_method"),
    ...provenance(),
  },
  (t) => [index("school_locations_geo_idx").using("gist", t.location), index("school_locations_postcode_idx").on(t.postcode)],
);

export const schoolContacts = pgTable("school_contacts", {
  schoolId: integer("school_id")
    .primaryKey()
    .references(() => schools.id, { onDelete: "cascade" }),
  website: text("website"),
  telephone: text("telephone"),
  headTitle: text("head_title"),
  headName: text("head_name"),
  headJobTitle: text("head_job_title"),
  admissionsEmail: text("admissions_email"),
  admissionsUrl: text("admissions_url"),
  ...provenance(),
});

/** Annual census/capacity snapshot. */
export const schoolCensus = pgTable(
  "school_census",
  {
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    censusDate: date("census_date").notNull(),
    pupils: integer("pupils"),
    boys: integer("boys"),
    girls: integer("girls"),
    capacity: integer("capacity"),
    percentFsm: numeric("percent_fsm", { precision: 5, scale: 2 }),
    yearGroupCounts: jsonb("year_group_counts").$type<Record<string, number>>(),
    ...provenance(),
  },
  (t) => [primaryKey({ columns: [t.schoolId, t.censusDate] })],
);

/** Facilities, subjects, sports, clubs — only ever from a cited source. */
export const schoolFeatures = pgTable(
  "school_features",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ...provenance(),
    ...timestamps(),
  },
  (t) => [index("school_features_school_idx").on(t.schoolId, t.category)],
);

/* ------------------------------------------------------------------ */
/* Academic performance                                                */
/* ------------------------------------------------------------------ */

/**
 * One row per (school, measure, academic year, breakdown).
 * `statusCode` preserves the publisher's symbol when no value is published
 * (e.g. "z" not applicable, "c" suppressed, "x" unavailable) so that the UI can
 * explain *why* a figure is missing instead of hiding it.
 */
export const academicResults = pgTable(
  "academic_results",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    measure: text("measure").notNull(),
    academicYear: text("academic_year").notNull(),
    breakdown: text("breakdown").notNull().default("total"),
    value: doublePrecision("value"),
    valueText: text("value_text"),
    statusCode: text("status_code"),
    cohort: integer("cohort"),
    /** Publisher data version: Provisional | Revised | Final */
    dataVersion: text("data_version"),
    ...provenance(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("academic_results_uq").on(t.schoolId, t.measure, t.academicYear, t.breakdown),
    index("academic_results_measure_idx").on(t.measure, t.academicYear),
    check("academic_results_year_ck", sql`${t.academicYear} ~ '^[0-9]{4}/[0-9]{2}$'`),
  ],
);

/** Local-authority and national comparators for the same measures. */
export const areaResults = pgTable(
  "area_results",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /** "national" or a local authority GSS code. */
    areaCode: text("area_code").notNull(),
    areaLevel: text("area_level").notNull(),
    areaName: text("area_name").notNull(),
    measure: text("measure").notNull(),
    academicYear: text("academic_year").notNull(),
    /** e.g. "state-funded schools", "selective schools" */
    population: text("population").notNull().default("all_state_funded"),
    value: doublePrecision("value"),
    valueText: text("value_text"),
    statusCode: text("status_code"),
    dataVersion: text("data_version"),
    ...provenance(),
  },
  (t) => [uniqueIndex("area_results_uq").on(t.areaCode, t.measure, t.academicYear, t.population)],
);

/* ------------------------------------------------------------------ */
/* Inspections                                                         */
/* ------------------------------------------------------------------ */

export const inspections = pgTable(
  "inspections",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    inspectionNumber: text("inspection_number").notNull(),
    framework: inspectionFrameworkEnum("framework").notNull(),
    inspectionType: text("inspection_type"),
    startDate: date("start_date"),
    publicationDate: date("publication_date"),
    /** URN the inspection was carried out under (may be a predecessor school). */
    urnAtInspection: text("urn_at_inspection"),
    relatesToCurrentUrn: boolean("relates_to_current_urn"),
    /** EIF graded inspections only: 1 Outstanding … 4 Inadequate. Never populated for report cards. */
    overallEffectiveness: integer("overall_effectiveness"),
    /** Ungraded inspection outcome text. */
    outcome: text("outcome"),
    categoryOfConcern: text("category_of_concern"),
    safeguarding: text("safeguarding"),
    reportUrl: text("report_url"),
    ...provenance(),
    ...timestamps(),
  },
  (t) => [uniqueIndex("inspections_number_uq").on(t.schoolId, t.inspectionNumber), index("inspections_school_idx").on(t.schoolId, t.startDate)],
);

export const inspectionEvaluations = pgTable(
  "inspection_evaluations",
  {
    inspectionId: integer("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    area: text("area").notNull(),
    grade: text("grade").notNull(),
    /** "report_card_5" (Exceptional … Urgent improvement) or "eif_4" (1 … 4). */
    scale: text("scale").notNull(),
  },
  (t) => [primaryKey({ columns: [t.inspectionId, t.area] })],
);

/* ------------------------------------------------------------------ */
/* Entrance tests                                                      */
/* ------------------------------------------------------------------ */

export const testProviders = pgTable("test_providers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nation: nationEnum("nation"),
  description: text("description"),
  website: text("website"),
  ...provenance(),
  ...timestamps(),
});

/** A named test arrangement, e.g. "The Kent Test" or "SEAG Entrance Assessment". */
export const entranceTests = pgTable("entrance_tests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  providerId: integer("provider_id").references(() => testProviders.id, { onDelete: "set null" }),
  nation: nationEnum("nation").notNull(),
  administeredBy: text("administered_by"),
  areaDescription: text("area_description"),
  /** e.g. [{"subject":"English"},{"subject":"Mathematics"}] */
  components: jsonb("components").$type<{ subject: string; detail?: string }[]>(),
  format: text("format"),
  standardisation: text("standardisation"),
  scoreScale: text("score_scale"),
  registrationUrl: text("registration_url"),
  website: text("website"),
  summary: text("summary"),
  ...provenance(),
  ...timestamps(),
});

export const schoolEntranceTests = pgTable(
  "school_entrance_tests",
  {
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    testId: integer("test_id")
      .notNull()
      .references(() => entranceTests.id, { onDelete: "cascade" }),
    entryYear: integer("entry_year").notNull(),
    notes: text("notes"),
    ...provenance(),
  },
  (t) => [primaryKey({ columns: [t.schoolId, t.testId, t.entryYear] })],
);

/* ------------------------------------------------------------------ */
/* Admissions                                                          */
/* ------------------------------------------------------------------ */

/** An admission round, e.g. England Year 7 entry September 2027. */
export const admissionCycles = pgTable(
  "admission_cycles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    nation: nationEnum("nation").notNull(),
    entryYear: integer("entry_year").notNull(),
    /** "year7" (England), "year8" (Northern Ireland), "year12" (sixth form) */
    entryPoint: text("entry_point").notNull(),
    label: text("label").notNull(),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("admission_cycles_uq").on(t.nation, t.entryYear, t.entryPoint)],
);

export const admissionPolicies = pgTable(
  "admission_policies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => admissionCycles.id, { onDelete: "restrict" }),
    version: integer("version").notNull().default(1),
    status: policyStatusEnum("status").notNull().default("draft"),
    determinedOn: date("determined_on"),
    publishedAdmissionNumber: integer("published_admission_number"),
    testId: integer("test_id").references(() => entranceTests.id, { onDelete: "set null" }),
    catchmentType: catchmentTypeEnum("catchment_type").notNull().default("unknown"),
    outOfAreaRoute: outOfAreaRouteEnum("out_of_area_route").notNull().default("unknown"),
    /** Plain-English summary written by an editor; never shown as a quote. */
    summary: text("summary"),
    qualificationSummary: text("qualification_summary"),
    catchmentSummary: text("catchment_summary"),
    distanceMethod: text("distance_method"),
    tieBreak: text("tie_break"),
    waitingList: text("waiting_list"),
    appeals: text("appeals"),
    lateApplications: text("late_applications"),
    inYearAdmissions: text("in_year_admissions"),
    supplementaryForm: text("supplementary_form"),
    addressRules: text("address_rules"),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    /** Hash of the imported editorial entry; unchanged re-imports keep the same version. */
    contentHash: text("content_hash"),
    ...provenance(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("admission_policies_version_uq").on(t.schoolId, t.cycleId, t.version),
    index("admission_policies_school_idx").on(t.schoolId, t.status),
  ],
);

/** Ordered oversubscription criteria for a policy. */
export const admissionCriteria = pgTable(
  "admission_criteria",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    policyId: integer("policy_id")
      .notNull()
      .references(() => admissionPolicies.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    category: criterionCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    /** Must the child have met the qualifying standard for this criterion to apply? */
    requiresQualification: boolean("requires_qualification"),
    placesReserved: integer("places_reserved"),
    /** Structured conditions evaluated by the eligibility engine. */
    conditions: jsonb("conditions").$type<Record<string, unknown>>(),
    ...provenance(),
  },
  (t) => [uniqueIndex("admission_criteria_rank_uq").on(t.policyId, t.rank)],
);

export const scoreRules = pgTable(
  "score_rules",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    policyId: integer("policy_id")
      .notNull()
      .references(() => admissionPolicies.id, { onDelete: "cascade" }),
    testId: integer("test_id").references(() => entranceTests.id, { onDelete: "set null" }),
    kind: scoreRuleKindEnum("kind").notNull(),
    /** Who the rule applies to, e.g. "all", "pupil_premium", "catchment_resident". */
    appliesTo: text("applies_to").notNull().default("all"),
    scoreValue: doublePrecision("score_value"),
    scoreScale: text("score_scale"),
    description: text("description").notNull(),
    ...provenance(),
  },
  (t) => [index("score_rules_policy_idx").on(t.policyId)],
);

export const admissionEvents = pgTable(
  "admission_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => admissionCycles.id, { onDelete: "cascade" }),
    scope: eventScopeEnum("scope").notNull(),
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
    testId: integer("test_id").references(() => entranceTests.id, { onDelete: "cascade" }),
    areaId: integer("area_id").references(() => geographicAreas.id, { onDelete: "cascade" }),
    eventType: eventTypeEnum("event_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    timeNote: text("time_note"),
    url: text("url"),
    ...provenance(),
    ...timestamps(),
  },
  (t) => [index("admission_events_cycle_idx").on(t.cycleId, t.startsOn), index("admission_events_school_idx").on(t.schoolId)],
);

/**
 * Official catchment / priority area polygons. Only ever loaded from a cited,
 * licensed source. A historical last-offer distance must NEVER be stored here.
 */
export const catchmentBoundaries = pgTable(
  "catchment_boundaries",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
    policyId: integer("policy_id").references(() => admissionPolicies.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    kind: boundaryKindEnum("kind").notNull(),
    geometry: geographyMultiPolygon("geometry").notNull(),
    effectiveEntryYear: integer("effective_entry_year").notNull(),
    licence: text("licence").notNull(),
    version: text("version"),
    ...provenance(),
    ...timestamps(),
  },
  (t) => [index("catchment_boundaries_geo_idx").using("gist", t.geometry), index("catchment_boundaries_school_idx").on(t.schoolId)],
);

/**
 * Historical allocation outcomes by entry year. Values are stored per metric and
 * per category (e.g. "all", "out_of_la") and per round so incompatible values
 * are never merged.
 */
export const historicalAllocations = pgTable(
  "historical_allocations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    entryYear: integer("entry_year").notNull(),
    round: text("round").notNull().default("national_offer_day"),
    category: text("category").notNull().default("all"),
    metric: text("metric").notNull(),
    value: doublePrecision("value"),
    unit: text("unit"),
    statusCode: text("status_code"),
    notes: text("notes"),
    ...provenance(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("historical_allocations_uq").on(t.schoolId, t.entryYear, t.round, t.category, t.metric),
    index("historical_allocations_metric_idx").on(t.metric, t.entryYear),
  ],
);

/* ------------------------------------------------------------------ */
/* Change detection & review                                           */
/* ------------------------------------------------------------------ */

export const changeEvents = pgTable(
  "change_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
    runId: integer("run_id").references(() => ingestionRuns.id, { onDelete: "set null" }),
    entity: text("entity").notNull(),
    field: text("field").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("change_events_school_idx").on(t.schoolId, t.detectedAt)],
);

export const adminReviewTasks = pgTable(
  "admin_review_tasks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    type: reviewTaskTypeEnum("type").notNull(),
    status: reviewStatusEnum("status").notNull().default("open"),
    priority: integer("priority").notNull().default(3),
    title: text("title").notNull(),
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    /** Proposed values (e.g. an extracted rule) awaiting approval. */
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    evidenceDocumentId: integer("evidence_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
    evidenceLocator: text("evidence_locator"),
    evidenceQuote: text("evidence_quote"),
    submittedByEmail: text("submitted_by_email"),
    createdBy: integer("created_by"),
    assignedTo: integer("assigned_to"),
    resolvedBy: integer("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
    ...timestamps(),
  },
  (t) => [index("admin_review_tasks_status_idx").on(t.status, t.priority), index("admin_review_tasks_school_idx").on(t.schoolId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)],
);

/* ------------------------------------------------------------------ */
/* Users & personalisation                                             */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: userRoleEnum("role").notNull().default("parent"),
  passwordHash: text("password_hash"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token; the raw token only lives in the cookie. */
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginTokens = pgTable("login_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedSchools = pgTable(
  "saved_schools",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.schoolId] })],
);

/** Stable, shareable comparison URLs. */
export const comparisons = pgTable("comparisons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  schoolIds: integer("school_ids").array().notNull(),
  entryYear: integer("entry_year"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plannerJourneys = pgTable("planner_journeys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  entryYear: integer("entry_year").notNull(),
  nation: nationEnum("nation").notNull().default("england"),
  schoolIds: integer("school_ids").array().notNull().default(sql`'{}'::integer[]`),
  completedSteps: jsonb("completed_steps").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  ...timestamps(),
});

export const reminderSubscriptions = pgTable(
  "reminder_subscriptions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    email: text("email").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
    entryYear: integer("entry_year").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    confirmTokenHash: text("confirm_token_hash"),
    unsubscribeTokenHash: text("unsubscribe_token_hash").notNull(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reminder_subscriptions_uq").on(t.email, t.schoolId, t.entryYear)],
);

/** Assistant query log — question text only, no personal identifiers. */
export const aiQueries = pgTable("ai_queries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  question: text("question").notNull(),
  answer: text("answer"),
  mode: text("mode").notNull(),
  model: text("model"),
  citations: jsonb("citations").$type<unknown[]>(),
  latencyMs: integer("latency_ms"),
  helpful: boolean("helpful"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Simple fixed-window rate limiting shared across instances. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

/** Cached GB postcode lookups (Open Government Licence data via postcodes.io). */
export const postcodeCache = pgTable("postcode_cache", {
  postcode: text("postcode").primaryKey(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  country: text("country").notNull(),
  adminDistrict: text("admin_district"),
  adminCounty: text("admin_county"),
  region: text("region"),
  laCode: text("la_code"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
