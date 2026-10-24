import "server-only";
import { inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export interface PlannerEvent {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  startsOn: string;
  endsOn: string | null;
  url: string | null;
  scope: string;
  nation: string;
  entryYear: number;
  testName: string | null;
  schoolName: string | null;
  verificationStatus: string;
}

export interface PlannerStep {
  key: string;
  title: string;
  detail: string;
  events: PlannerEvent[];
}

/** Verified events relevant to the chosen schools and year: their tests, the schools themselves and national dates. */
export async function plannerEvents(slugs: string[], entryYear: number): Promise<{ schools: { id: number; slug: string; name: string; nation: string }[]; events: PlannerEvent[] }> {
  const schools = slugs.length
    ? await db().select({ id: schema.schools.id, slug: schema.schools.slug, name: schema.schools.name, nation: schema.schools.nation }).from(schema.schools).where(inArray(schema.schools.slug, slugs.slice(0, 8)))
    : [];
  const ids = schools.map((s) => s.id);
  const nations = [...new Set(schools.map((s) => s.nation))];
  if (!nations.length) nations.push("england");
  const idList = ids.length ? sql.join(ids.map((i) => sql`${i}`), sql`, `) : sql`NULL`;
  const rows = await db().execute<{ id: number; title: string; description: string | null; event_type: string; starts_on: string; ends_on: string | null; url: string | null; scope: string; nation: string; entry_year: number; test_name: string | null; school_name: string | null; verification_status: string }>(sql`
    SELECT e.id, e.title, e.description, e.event_type, e.starts_on::text, e.ends_on::text, e.url, e.scope, c.nation, c.entry_year,
           t.name AS test_name, s.name AS school_name, e.verification_status
    FROM admission_events e
    JOIN admission_cycles c ON c.id = e.cycle_id
    LEFT JOIN entrance_tests t ON t.id = e.test_id
    LEFT JOIN schools s ON s.id = e.school_id
    WHERE c.entry_year = ${entryYear}
      AND (
        (e.scope = 'nation' AND c.nation IN (${sql.join(nations.map((n) => sql`${n}`), sql`, `)}))
        OR e.school_id IN (${idList})
        OR e.test_id IN (SELECT test_id FROM school_entrance_tests WHERE school_id IN (${idList}) AND entry_year = ${entryYear})
      )
    ORDER BY e.starts_on
  `);
  return {
    schools,
    events: rows.map((r) => ({ id: r.id, title: r.title, description: r.description, eventType: r.event_type, startsOn: r.starts_on, endsOn: r.ends_on, url: r.url, scope: r.scope, nation: r.nation, entryYear: r.entry_year, testName: r.test_name, schoolName: r.school_name, verificationStatus: r.verification_status })),
  };
}

const ENGLAND_STEPS: [string, string, string, string[]][] = [
  ["research", "Research schools", "Read each school's admissions policy for your entry year and check its test.", []],
  ["open_events", "Attend open events", "Most schools hold open events in the summer term of Year 5 or early autumn of Year 6.", ["open_event"]],
  ["register", "Register for entrance tests", "Registration usually closes months before the test. Children at some state primary schools are registered automatically — check.", ["registration_opens", "registration_closes"]],
  ["adjustments", "Request access arrangements", "If your child needs adjustments, ask the test administrator before its deadline.", []],
  ["sit", "Sit the tests", "Note each test's date and venue.", ["test_date"]],
  ["results", "Review test results", "Results usually arrive before the application deadline. Check whether a review is available.", ["results_released"]],
  ["apply", "Submit school preferences", "Apply through your home council, naming schools in order of preference, by the national closing date.", ["application_deadline", "supplementary_form_deadline"]],
  ["offers", "Receive offers", "Your council sends offers on national offer day.", ["national_offer_day"]],
  ["respond", "Respond to your offer", "Accept by the deadline in your offer letter.", ["offer_response_deadline"]],
  ["waiting", "Join waiting lists", "You can join waiting lists for schools ranked higher than the one offered.", ["waiting_list"]],
  ["appeal", "Consider appeals", "You'll have at least 20 school days to lodge an appeal after the decision letter.", ["appeal_deadline", "appeal_hearings"]],
];

const NI_STEPS: [string, string, string, string[]][] = [
  ["research", "Research schools", "Read each school's published admissions criteria for Year 8 entry.", []],
  ["register", "Register for the SEAG assessment", "Registration closes in the autumn of P7.", ["registration_opens", "registration_closes"]],
  ["sit", "Sit the SEAG papers", "Two papers on separate Saturdays in November.", ["test_date"]],
  ["results", "Receive SEAG outcomes", "Outcomes are issued in January, with a short re-mark window.", ["results_released", "other"]],
  ["apply", "Apply through the Education Authority", "List schools in order of preference in the EA transfer application. Check EA's published dates.", ["application_deadline"]],
  ["offers", "Receive your placement", "The EA notifies placements in the summer term.", ["national_offer_day"]],
];

export function plannerSteps(events: PlannerEvent[], nation: "england" | "northern_ireland"): PlannerStep[] {
  const template = nation === "northern_ireland" ? NI_STEPS : ENGLAND_STEPS;
  const used = new Set<number>();
  return template.map(([key, title, detail, types]) => {
    const ev = events.filter((e) => types.includes(e.eventType) && e.nation === nation && !used.has(e.id));
    ev.forEach((e) => used.add(e.id));
    return { key, title, detail, events: ev };
  });
}

/** RFC 5545 calendar export of verified events. */
export function toIcs(events: PlannerEvent[], calName: string): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const d = (s: string) => s.replace(/-/g, "");
  const next = (s: string) => {
    const dt = new Date(`${s}T12:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 1);
    return dt.toISOString().slice(0, 10).replace(/-/g, "");
  };
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Grammar Atlas//Admissions planner//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(calName)}`];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:event-${e.id}@grammar-atlas`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d(e.startsOn)}`,
      `DTEND;VALUE=DATE:${next(e.endsOn ?? e.startsOn)}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc([e.description, e.testName, e.schoolName, e.verificationStatus === "officially_verified" ? "Official source" : "Awaiting verification — check the official source", e.url].filter(Boolean).join("\n"))}`,
      ...(e.url ? [`URL:${e.url}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  // Fold long lines at 75 octets per RFC 5545.
  return lines.map((l) => (l.length <= 75 ? l : l.match(/.{1,74}/g)!.join("\r\n "))).join("\r\n") + "\r\n";
}
