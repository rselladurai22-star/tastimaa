import { describe, expect, it } from "vitest";
import { applicationAcademicYear, birthWindow, clampEntryYear, defaultEntryYear, entryYearFromCurrentYearGroup, selectableEntryYears } from "@/lib/academic-year";
import { formatMiles, relativeAge, titleCaseName } from "@/lib/format";
import { isNorthernIrelandPostcode, normalisePostcode } from "@/lib/postcode";
import { expandQuery, looksLikePostcode, normaliseQuery, toPrefixTsQuery } from "@/lib/search-terms";
import { slugify, uniqueSlug } from "@/lib/slug";
import { readFileSync } from "node:fs";
import { cronMatches, parseCron } from "@/lib/cron";
import { SERVICE_SCHEDULES } from "@/lib/schedules";
import { JOBS } from "@/etl/jobs";
import { normaliseDatabaseUrl } from "@/db";
import { formatMeasure, MEASURES, MEASURE_YEAR_NOTES } from "@/domain/measures";
import { directoryQueryString, parseDirectoryParams } from "@/server/search-params";

describe("postcodes", () => {
  it("normalises valid UK postcodes", () => {
    expect(normalisePostcode("hp217rp")).toBe("HP21 7RP");
    expect(normalisePostcode(" ME15 6AA ")).toBe("ME15 6AA");
    expect(normalisePostcode("EC1A1BB")).toBe("EC1A 1BB");
    expect(normalisePostcode("BT5 6BA")).toBe("BT5 6BA");
  });
  it("rejects invalid postcodes (scenario 11)", () => {
    for (const bad of ["", "HELLO", "12345", "Q1 1AA", "HP21 7R", "ME15 6AAA", "<script>"]) expect(normalisePostcode(bad)).toBeNull();
  });
  it("recognises Northern Ireland postcodes", () => {
    expect(isNorthernIrelandPostcode("BT5 6BA")).toBe(true);
    expect(isNorthernIrelandPostcode("HP21 7RP")).toBe(false);
  });
});

describe("search terms", () => {
  it("expands common abbreviations", () => {
    expect(expandQuery("QE Barnet")).toBe("queen elizabeth barnet");
    expect(expandQuery("KEGS Chelmsford")).toBe("king edward grammar school chelmsford");
  });
  it("normalises apostrophes and accents", () => {
    expect(normaliseQuery("Pate’s Grammar")).toBe("pates grammar");
    expect(normaliseQuery("Café")).toBe("cafe");
  });
  it("builds a prefix tsquery without generic words", () => {
    expect(toPrefixTsQuery("Reading School")).toBe("reading:*");
    expect(toPrefixTsQuery("the grammar school")).toBe("the:* & grammar:* & school:*");
    expect(toPrefixTsQuery("!!!")).toBeNull();
  });
  it("detects postcodes and districts", () => {
    expect(looksLikePostcode("ME15 6AA")).toBe("full");
    expect(looksLikePostcode("me15")).toBe("outward");
    expect(looksLikePostcode("Maidstone")).toBeNull();
  });
});

describe("slugs", () => {
  it("creates readable slugs", () => {
    expect(slugify("Pate's Grammar School")).toBe("pates-grammar-school");
    expect(slugify("Chatham & Clarendon Grammar School")).toBe("chatham-and-clarendon-grammar-school");
  });
  it("disambiguates clashes", () => {
    const taken = new Set(["queen-elizabeths-grammar-school"]);
    expect(uniqueSlug(["Queen Elizabeth's Grammar School", "Queen Elizabeth's Grammar School Horncastle"], taken)).toBe("queen-elizabeths-grammar-school-horncastle");
    expect(uniqueSlug(["Queen Elizabeth's Grammar School"], taken)).toBe("queen-elizabeths-grammar-school-2");
  });
});

describe("academic year selection", () => {
  it("defaults to the round families are applying in", () => {
    expect(defaultEntryYear(new Date("2026-10-24T12:00:00Z"))).toBe(2027);
    expect(defaultEntryYear(new Date("2027-02-10T12:00:00Z"))).toBe(2027);
    expect(defaultEntryYear(new Date("2027-05-01T12:00:00Z"))).toBe(2028);
    expect(selectableEntryYears(new Date("2026-10-24T12:00:00Z"))).toEqual([2027, 2028, 2029]);
  });
  it("rejects years outside the selectable range", () => {
    const today = new Date("2026-10-24T12:00:00Z");
    expect(clampEntryYear("2028", today)).toBe(2028);
    expect(clampEntryYear("1999", today)).toBe(2027);
    expect(clampEntryYear(undefined, today)).toBe(2027);
  });
  it("maps year groups to entry years per nation", () => {
    const oct = new Date("2026-10-24T12:00:00Z");
    expect(entryYearFromCurrentYearGroup(6, "england", oct)).toBe(2027);
    expect(entryYearFromCurrentYearGroup(5, "england", oct)).toBe(2028);
    expect(entryYearFromCurrentYearGroup(7, "northern_ireland", oct)).toBe(2027);
    expect(entryYearFromCurrentYearGroup(6, "england", new Date("2027-06-01T12:00:00Z"))).toBe(2027);
  });
  it("uses each nation's birth-date cut-off", () => {
    expect(birthWindow(2027, "england")).toEqual({ from: "2015-09-01", to: "2016-08-31" });
    expect(birthWindow(2027, "northern_ireland")).toEqual({ from: "2015-07-02", to: "2016-07-01" });
    expect(applicationAcademicYear(2027)).toBe("2026/27");
  });
});

describe("formatting", () => {
  it("formats distances and ages", () => {
    expect(formatMiles(0.05)).toBe("under 0.1 miles");
    expect(formatMiles(3.456)).toBe("3.5 miles");
    expect(formatMiles(23.4)).toBe("23 miles");
    expect(relativeAge("2026-10-20", new Date("2026-10-24T12:00:00Z"))).toBe("4 days ago");
    expect(relativeAge(null)).toBe("never");
  });
  it("only re-cases fully upper-case names", () => {
    expect(titleCaseName("VALLEY INVICTA ACADEMIES TRUST")).toBe("Valley Invicta Academies Trust");
    expect(titleCaseName("Bucks Trust")).toBe("Bucks Trust");
  });
  it("formats measures by unit", () => {
    expect(formatMeasure(MEASURES.ks4_engmath_95_pct, 93.66)).toBe("93.7%");
    expect(formatMeasure(MEASURES.ks4_progress8, 0.5)).toBe("+0.50");
    expect(formatMeasure(MEASURES.ks4_progress8, -0.12)).toBe("-0.12");
    expect(formatMeasure(MEASURES.ks4_attainment8, null)).toBe("—");
  });
  it("explains why Progress 8 is missing for COVID-affected cohorts", () => {
    expect(MEASURE_YEAR_NOTES.ks4_progress8?.["2024/25"]).toMatch(/key stage 2/i);
  });
});

describe("directory parameters", () => {
  it("parses and round-trips deep-linked filters", () => {
    const p = parseDirectoryParams({ q: "kent", gender: ["boys", "girls"], sixthForm: "1", radius: "20", page: "2", sort: "bogus" });
    expect(p.gender).toEqual(["boys", "girls"]);
    expect(p.sixthForm).toBe(true);
    expect(p.radius).toBe(20);
    expect(p.sort).toBeUndefined();
    expect(directoryQueryString(p)).toBe("?q=kent&gender=boys%2Cgirls&sixthForm=1&radius=20&page=2");
  });
  it("drops invalid values instead of failing", () => {
    const p = parseDirectoryParams({ gender: "dragons", radius: "9999", nation: "mars" });
    expect(p.gender).toEqual([]);
    expect(p.radius).toBeUndefined();
    expect(p.nation).toBeUndefined();
  });
});

describe("worker cron schedules", () => {
  it("matches the ETL schedules in UTC", () => {
    expect(cronMatches("0 4 * * 1", new Date("2026-10-26T04:00:00Z"))).toBe(true); // Monday
    expect(cronMatches("0 4 * * 1", new Date("2026-10-27T04:00:00Z"))).toBe(false); // Tuesday
    expect(cronMatches("0 5 15 * *", new Date("2026-11-15T05:00:00Z"))).toBe(true);
    expect(cronMatches("*/15 * * * *", new Date("2026-11-15T05:45:00Z"))).toBe(true);
    expect(cronMatches("*/15 * * * *", new Date("2026-11-15T05:44:00Z"))).toBe(false);
    expect(cronMatches("0 9 1-7 * 1-5", new Date("2026-11-03T09:00:00Z"))).toBe(true);
  });
  it("treats restricted day-of-month and day-of-week as either/or, like cron", () => {
    expect(cronMatches("0 0 1 * 0", new Date("2026-11-08T00:00:00Z"))).toBe(true); // a Sunday
    expect(cronMatches("0 0 1 * 7", new Date("2026-11-08T00:00:00Z"))).toBe(true);
    expect(cronMatches("0 0 1 * 0", new Date("2026-11-09T00:00:00Z"))).toBe(false);
  });
  it("rejects malformed expressions", () => {
    for (const bad of ["manual", "* * * *", "60 * * * *", "* 24 * * *", "*/0 * * * *", "5-1 * * * *"]) expect(parseCron(bad)).toBeNull();
  });
});

describe("Vercel configuration", () => {
  it("schedules exactly the worker's tasks in vercel.json", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] };
    const fromVercel = Object.fromEntries(vercel.crons.map((c) => [c.path.replace("/api/cron/", ""), c.schedule]));
    const expected: Record<string, string> = { ...SERVICE_SCHEDULES };
    for (const [name, job] of Object.entries(JOBS)) if (job.schedule !== "manual") expected[name] = job.schedule;
    expect(fromVercel).toEqual(expected);
  });
  it("keeps Vercel Hobby's once-a-day cron limit", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { schedule: string }[] };
    for (const { schedule } of vercel.crons) {
      const [minute, hour] = parseCron(schedule)!;
      expect(minute!.size * hour!.size).toBe(1);
    }
  });
  it("drops Neon's channel_binding parameter but keeps TLS settings", () => {
    const url = normaliseDatabaseUrl("postgresql://u:p@ep-x-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
    expect(url).toContain("sslmode=require");
    expect(url).not.toContain("channel_binding");
  });
});
