import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { runJob, type JobContext } from "../runner";
import { identifierMap } from "../school-store";

const status = z.enum(["officially_verified", "awaiting_verification", "historical", "estimated", "unavailable", "conflicting"]);
const cycleRef = z.tuple([z.enum(["england", "northern_ireland", "wales", "scotland"]), z.number().int(), z.string()]);

export const editorialSchema = z.object({
  sources: z.array(z.object({ key: z.string(), title: z.string(), url: z.string().url(), publisher: z.string(), retrievedOn: z.string(), status, notes: z.string().optional() })),
  testProviders: z.array(z.object({ slug: z.string(), name: z.string(), nation: z.enum(["england", "northern_ireland"]).nullable(), description: z.string(), website: z.string().url(), source: z.string(), locator: z.string().nullable() })),
  entranceTests: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      provider: z.string().nullable(),
      nation: z.enum(["england", "northern_ireland"]),
      administeredBy: z.string().nullable(),
      areaDescription: z.string().nullable(),
      components: z.array(z.object({ subject: z.string(), detail: z.string().optional() })),
      format: z.string().nullable(),
      standardisation: z.string().nullable(),
      scoreScale: z.string().nullable(),
      website: z.string().url(),
      summary: z.string(),
      source: z.string(),
      locator: z.string().nullable(),
      status: status.optional(),
      schoolUrns: z.array(z.string()),
      schoolLinkNote: z.string().optional(),
    }),
  ),
  cycles: z.array(z.object({ nation: z.enum(["england", "northern_ireland", "wales", "scotland"]), entryYear: z.number().int(), entryPoint: z.string(), label: z.string() })),
  events: z.array(
    z.object({
      cycle: cycleRef,
      scope: z.enum(["nation", "local_authority", "test_area", "school"]),
      test: z.string().optional(),
      eventType: z.string(),
      title: z.string(),
      description: z.string().optional(),
      startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      url: z.string().url(),
      source: z.string(),
      locator: z.string(),
    }),
  ),
  partiallySelective: z.array(z.object({ urn: z.string(), name: z.string(), source: z.string(), note: z.string() })),
  policies: z.array(
    z.object({
      urn: z.string(),
      cycle: cycleRef,
      document: z.string(),
      determinedOn: z.string().nullable(),
      publishedAdmissionNumber: z.number().int().nullable(),
      publishedAdmissionNumberLocator: z.string().optional(),
      test: z.string().nullable(),
      catchmentType: z.enum(["none", "defined_area", "distance_only", "multiple_areas", "unknown"]),
      outOfAreaRoute: z.enum(["yes", "no", "limited", "unknown"]),
      summary: z.string(),
      qualificationSummary: z.string().nullable(),
      catchmentSummary: z.string().nullable(),
      distanceMethod: z.string().nullable(),
      tieBreak: z.string().nullable(),
      waitingList: z.string().nullable(),
      appeals: z.string().nullable(),
      addressRules: z.string().nullable(),
      supplementaryForm: z.string().nullable(),
      lateApplications: z.string().nullable(),
      inYearAdmissions: z.string().nullable(),
      locators: z.record(z.string(), z.string()),
      scoreRules: z.array(z.object({ kind: z.enum(["qualifying_threshold", "automatic_qualification", "ranked_by_score", "priority_threshold", "reserved_places_threshold"]), appliesTo: z.string(), scoreValue: z.number().nullable(), scoreScale: z.string(), description: z.string(), locator: z.string() })),
      criteria: z.array(
        z.object({
          rank: z.number().int(),
          category: z.enum(schema.criterionCategoryEnum.enumValues),
          title: z.string(),
          description: z.string().optional(),
          requiresQualification: z.boolean(),
          placesReserved: z.number().int().optional(),
          locator: z.string(),
          conditions: z.record(z.string(), z.unknown()),
        }),
      ),
    }),
  ),
  schoolTestLinks: z.array(z.object({ deni: z.string().nullable(), schoolName: z.string(), test: z.string(), entryYear: z.number().int(), source: z.string(), note: z.string() })),
});

export type Editorial = z.infer<typeof editorialSchema>;

export async function loadEditorial(): Promise<Editorial> {
  return editorialSchema.parse(JSON.parse(await readFile(join(process.cwd(), "data", "curated", "editorial.json"), "utf8")));
}

export async function importEditorial(ctx: JobContext) {
  const data = await loadEditorial();
  const now = new Date();
  const docIds = new Map<string, number>();
  const docStatus = new Map<string, z.infer<typeof status>>();

  for (const s of data.sources) {
    const existing = await db().query.sourceDocuments.findFirst({ where: and(eq(schema.sourceDocuments.sourceId, ctx.sourceId), eq(schema.sourceDocuments.url, s.url)), columns: { id: true } });
    const values = { sourceId: ctx.sourceId, title: s.title, url: s.url, publisher: s.publisher, retrievedAt: new Date(`${s.retrievedOn}T12:00:00Z`), status: s.status === "unavailable" ? ("unavailable" as const) : ("active" as const), notes: s.notes ?? null };
    let id: number;
    if (existing) {
      await db().update(schema.sourceDocuments).set({ ...values, updatedAt: now }).where(eq(schema.sourceDocuments.id, existing.id));
      id = existing.id;
    } else {
      const [row] = await db().insert(schema.sourceDocuments).values(values).returning({ id: schema.sourceDocuments.id });
      id = row!.id;
    }
    docIds.set(s.key, id);
    docStatus.set(s.key, s.status);
  }
  async function docRef(ref: string): Promise<number | null> {
    if (ref.startsWith("@document:")) {
      const title = ref.slice("@document:".length);
      const d = await db().query.sourceDocuments.findFirst({ where: eq(schema.sourceDocuments.title, title), columns: { id: true } });
      if (!d) await ctx.issue("warning", "document_not_found", `Referenced document not yet ingested: ${title}`);
      return d?.id ?? null;
    }
    const id = docIds.get(ref);
    if (!id) throw new Error(`Unknown source key ${ref}`);
    return id;
  }
  /** Editorial content is never more verified than its source. */
  const verification = (ref: string, fallback: z.infer<typeof status> = "awaiting_verification") => (ref.startsWith("@document:") ? fallback : (docStatus.get(ref) ?? fallback));

  const providerIds = new Map<string, number>();
  for (const p of data.testProviders) {
    const values = { name: p.name, nation: p.nation, description: p.description, website: p.website, sourceDocumentId: await docRef(p.source), sourceLocator: p.locator, verificationStatus: verification(p.source), lastCheckedAt: now };
    const [row] = await db().insert(schema.testProviders).values({ slug: p.slug, ...values }).onConflictDoUpdate({ target: schema.testProviders.slug, set: { ...values, updatedAt: now } }).returning({ id: schema.testProviders.id });
    providerIds.set(p.slug, row!.id);
  }

  const cycleIds = new Map<string, number>();
  for (const c of data.cycles) {
    const [row] = await db()
      .insert(schema.admissionCycles)
      .values(c)
      .onConflictDoUpdate({ target: [schema.admissionCycles.nation, schema.admissionCycles.entryYear, schema.admissionCycles.entryPoint], set: { label: c.label } })
      .returning({ id: schema.admissionCycles.id });
    cycleIds.set(`${c.nation}:${c.entryYear}:${c.entryPoint}`, row!.id);
  }
  const cycleId = (ref: z.infer<typeof cycleRef>) => {
    const id = cycleIds.get(ref.join(":"));
    if (!id) throw new Error(`Unknown cycle ${ref.join(":")}`);
    return id;
  };

  const urns = await identifierMap("urn");
  const testIds = new Map<string, number>();
  for (const t of data.entranceTests) {
    const values = {
      name: t.name,
      providerId: t.provider ? (providerIds.get(t.provider) ?? null) : null,
      nation: t.nation,
      administeredBy: t.administeredBy,
      areaDescription: t.areaDescription,
      components: t.components,
      format: t.format,
      standardisation: t.standardisation,
      scoreScale: t.scoreScale,
      website: t.website,
      summary: t.summary,
      sourceDocumentId: await docRef(t.source),
      sourceLocator: t.locator,
      verificationStatus: t.status ?? verification(t.source),
      lastCheckedAt: now,
    };
    const [row] = await db().insert(schema.entranceTests).values({ slug: t.slug, ...values }).onConflictDoUpdate({ target: schema.entranceTests.slug, set: { ...values, updatedAt: now } }).returning({ id: schema.entranceTests.id });
    testIds.set(t.slug, row!.id);
    for (const urn of t.schoolUrns) {
      const schoolId = urns.get(urn);
      if (!schoolId) {
        await ctx.issue("warning", "unknown_school", `Test ${t.slug}: no school with URN ${urn}`, urn);
        continue;
      }
      for (const entryYear of [2027, 2028]) {
        const link = { notes: t.schoolLinkNote ?? null, sourceDocumentId: values.sourceDocumentId, sourceLocator: t.locator, verificationStatus: "awaiting_verification" as const, lastCheckedAt: now };
        await db()
          .insert(schema.schoolEntranceTests)
          .values({ schoolId, testId: row!.id, entryYear, ...link })
          .onConflictDoUpdate({ target: [schema.schoolEntranceTests.schoolId, schema.schoolEntranceTests.testId, schema.schoolEntranceTests.entryYear], set: link });
      }
      ctx.counters.rowsInserted++;
    }
  }

  for (const l of data.schoolTestLinks) {
    const school = await db().query.schools.findFirst({ where: eq(schema.schools.name, l.schoolName), columns: { id: true } });
    const testId = testIds.get(l.test);
    if (!school || !testId) {
      await ctx.issue("warning", "link_unresolved", `Could not link ${l.schoolName} to ${l.test}`);
      continue;
    }
    const link = { notes: l.note, sourceDocumentId: await docRef(l.source), verificationStatus: "awaiting_verification" as const, lastCheckedAt: now };
    await db().insert(schema.schoolEntranceTests).values({ schoolId: school.id, testId, entryYear: l.entryYear, ...link }).onConflictDoUpdate({ target: [schema.schoolEntranceTests.schoolId, schema.schoolEntranceTests.testId, schema.schoolEntranceTests.entryYear], set: link });
  }

  // Events: replace the editorial set for each cycle so removals propagate.
  const editorialDocIds = [...docIds.values()];
  if (editorialDocIds.length) await db().delete(schema.admissionEvents).where(inArray(schema.admissionEvents.sourceDocumentId, editorialDocIds));
  for (const e of data.events) {
    const sourceDocumentId = await docRef(e.source);
    if (e.source.startsWith("@document:")) {
      // Replace this event, including a copy stored before its document was ingested (no source yet),
      // so running editorial before admissions_documents never leaves duplicates.
      const ev = schema.admissionEvents;
      const sameSource = sourceDocumentId ? or(isNull(ev.sourceDocumentId), eq(ev.sourceDocumentId, sourceDocumentId)) : isNull(ev.sourceDocumentId);
      await db().delete(ev).where(and(eq(ev.cycleId, cycleId(e.cycle)), eq(ev.title, e.title), sameSource));
    }
    await db().insert(schema.admissionEvents).values({
      cycleId: cycleId(e.cycle),
      scope: e.scope,
      testId: e.test ? (testIds.get(e.test) ?? null) : null,
      eventType: e.eventType as (typeof schema.eventTypeEnum.enumValues)[number],
      title: e.title,
      description: e.description ?? null,
      startsOn: e.startsOn,
      endsOn: e.endsOn ?? null,
      url: e.url,
      sourceDocumentId,
      sourceLocator: e.locator,
      verificationStatus: verification(e.source),
      lastCheckedAt: now,
    });
  }

  // Policies are versioned per school and cycle. Re-importing identical content keeps the version;
  // a changed entry creates a new version and supersedes the previous one.
  for (const p of data.policies) {
    const schoolId = urns.get(p.urn);
    if (!schoolId) {
      await ctx.issue("error", "unknown_school", `Policy: no school with URN ${p.urn}`, p.urn);
      continue;
    }
    const cid = cycleId(p.cycle);
    const sourceDocumentId = await docRef(`@document:${p.document}`);
    const fingerprint = JSON.stringify(p);
    const latest = await db().query.admissionPolicies.findFirst({
      where: and(eq(schema.admissionPolicies.schoolId, schoolId), eq(schema.admissionPolicies.cycleId, cid)),
      orderBy: (t, { desc }) => desc(t.version),
    });
    if (latest && latest.contentHash === fingerprintHash(fingerprint)) {
      // Same content, but stored before its document was ingested: attach the evidence now.
      if (!latest.sourceDocumentId && sourceDocumentId) {
        await db().update(schema.admissionPolicies).set({ sourceDocumentId, updatedAt: now }).where(eq(schema.admissionPolicies.id, latest.id));
        await db().update(schema.admissionCriteria).set({ sourceDocumentId }).where(and(eq(schema.admissionCriteria.policyId, latest.id), isNull(schema.admissionCriteria.sourceDocumentId)));
        await db().update(schema.scoreRules).set({ sourceDocumentId }).where(and(eq(schema.scoreRules.policyId, latest.id), isNull(schema.scoreRules.sourceDocumentId)));
        await db()
          .update(schema.adminReviewTasks)
          .set({ evidenceDocumentId: sourceDocumentId, updatedAt: now })
          .where(and(eq(schema.adminReviewTasks.entityType, "admission_policy"), eq(schema.adminReviewTasks.entityId, latest.id), isNull(schema.adminReviewTasks.evidenceDocumentId)));
        ctx.counters.rowsUpdated++;
      } else ctx.counters.rowsUnchanged++;
      continue;
    }
    if (latest) await db().update(schema.admissionPolicies).set({ status: "superseded", updatedAt: now }).where(eq(schema.admissionPolicies.id, latest.id));
    const [policy] = await db()
      .insert(schema.admissionPolicies)
      .values({
        schoolId,
        cycleId: cid,
        version: (latest?.version ?? 0) + 1,
        status: "awaiting_verification",
        determinedOn: p.determinedOn,
        publishedAdmissionNumber: p.publishedAdmissionNumber,
        testId: p.test ? (testIds.get(p.test) ?? null) : null,
        catchmentType: p.catchmentType,
        outOfAreaRoute: p.outOfAreaRoute,
        summary: p.summary,
        qualificationSummary: p.qualificationSummary,
        catchmentSummary: p.catchmentSummary,
        distanceMethod: p.distanceMethod,
        tieBreak: p.tieBreak,
        waitingList: p.waitingList,
        appeals: p.appeals,
        addressRules: p.addressRules,
        supplementaryForm: p.supplementaryForm,
        lateApplications: p.lateApplications,
        inYearAdmissions: p.inYearAdmissions,
        sourceDocumentId,
        contentHash: fingerprintHash(fingerprint),
        sourceLocator: p.locators.summary ?? null,
        verificationStatus: "awaiting_verification",
        confidence: "medium",
        lastCheckedAt: now,
      })
      .returning({ id: schema.admissionPolicies.id });
    const policyId = policy!.id;
    for (const r of p.scoreRules) {
      await db().insert(schema.scoreRules).values({ policyId, testId: p.test ? (testIds.get(p.test) ?? null) : null, kind: r.kind, appliesTo: r.appliesTo, scoreValue: r.scoreValue, scoreScale: r.scoreScale, description: r.description, sourceDocumentId, sourceLocator: r.locator, verificationStatus: "awaiting_verification", lastCheckedAt: now });
    }
    for (const c of p.criteria) {
      await db().insert(schema.admissionCriteria).values({
        policyId,
        rank: c.rank,
        category: c.category,
        title: c.title,
        description: c.description ?? null,
        requiresQualification: c.requiresQualification,
        placesReserved: c.placesReserved ?? null,
        conditions: c.conditions,
        sourceDocumentId,
        sourceLocator: c.locator,
        verificationStatus: "awaiting_verification",
        lastCheckedAt: now,
      });
    }
    await db().insert(schema.adminReviewTasks).values({
      type: "extracted_policy",
      title: `Verify admissions policy entry (v${(latest?.version ?? 0) + 1}) against the official document`,
      schoolId,
      priority: 2,
      entityType: "admission_policy",
      entityId: policyId,
      payload: { locators: p.locators, publishedAdmissionNumberLocator: p.publishedAdmissionNumberLocator ?? null, previousVersion: latest?.version ?? null },
      evidenceDocumentId: sourceDocumentId,
    });
    if (latest) {
      await db().insert(schema.changeEvents).values({ schoolId, runId: ctx.runId, entity: "admission_policy", field: "version", oldValue: latest.version, newValue: latest.version + 1 });
    }
    ctx.counters.rowsInserted++;
  }
}

function fingerprintHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `editorial:${(h >>> 0).toString(16)}`;
}

export const runEditorial = (trigger?: string) => runJob("editorial", "editorial", importEditorial, { trigger });
