import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { extractPolicyFacts } from "@/etl/admissions-extract";
import { clean, decodeCsv, parseCsv, toInt, toIsoDate, toNum } from "@/etl/csv";
import { academicYearLabel, parseValue } from "@/etl/ees";
import { parseRobots, robotsAllows } from "@/etl/http";
import { entryYearFromTimePeriod, extractReleaseVersionId } from "@/etl/jobs/apps-offers";
import { isStateGrammar, mapBoarding, mapGender, mapSixthForm } from "@/etl/jobs/gias";
import { pickLatestPublication, pickPostPrimaryWorkbook } from "@/etl/jobs/ni-deni";
import { pickLatestInspectionsCsv } from "@/etl/jobs/ofsted";
import { toPassages } from "@/etl/jobs/admissions-docs";
import { readWorkbook, sheetRecords } from "@/etl/xlsx";

describe("CSV helpers", () => {
  it("treats publisher placeholders as missing", () => {
    for (const v of ["", "NULL", "Not applicable", "z", "x", "c", ":"]) expect(clean(v)).toBeNull();
    expect(clean(" Kent ")).toBe("Kent");
  });
  it("parses numbers and dates", () => {
    expect(toInt("1,346")).toBe(1346);
    expect(toNum("43.8%")).toBeCloseTo(43.8);
    expect(toIsoDate("01-04-2011")).toBe("2011-04-01");
    expect(toIsoDate("5/9/2024")).toBe("2024-09-05");
    expect(toIsoDate("2024-09-05")).toBe("2024-09-05");
    expect(toIsoDate("garbage")).toBeNull();
  });
  it("decodes Windows-1252 government CSVs and keeps only requested columns", () => {
    const buf = Buffer.from([...Buffer.from('"URN","Name","Other"\r\n"1","Pate'), 0x92, ...Buffer.from('s","x"\r\n')]);
    const text = decodeCsv(buf);
    expect(text).toContain("Pate’s");
    const rows = parseCsv(text, ["URN", "Name"] as const);
    expect(rows).toEqual([{ URN: "1", Name: "Pate’s" }]);
  });
});

describe("GIAS rules", () => {
  const base = { "AdmissionsPolicy (name)": "Selective", "EstablishmentTypeGroup (name)": "Academies", "PhaseOfEducation (name)": "Secondary", "EstablishmentStatus (name)": "Open" };
  it("identifies open state-funded selective secondary schools", () => {
    expect(isStateGrammar(base)).toBe(true);
    expect(isStateGrammar({ ...base, "EstablishmentTypeGroup (name)": "Independent schools" })).toBe(false);
    expect(isStateGrammar({ ...base, "AdmissionsPolicy (name)": "Non-selective" })).toBe(false);
    expect(isStateGrammar({ ...base, "EstablishmentStatus (name)": "Closed" })).toBe(false);
    expect(isStateGrammar({ ...base, "PhaseOfEducation (name)": "Primary" })).toBe(false);
    expect(isStateGrammar({ ...base, "EstablishmentStatus (name)": "Open, but proposed to close" })).toBe(true);
  });
  it("maps coded fields without guessing", () => {
    expect(mapGender("Boys")).toBe("boys");
    expect(mapGender("")).toBe("unknown");
    expect(mapBoarding("Boarding school")).toBe("boarding");
    expect(mapBoarding("Not applicable")).toBe("unknown");
    expect(mapSixthForm("Has a sixth form")).toBe(true);
    expect(mapSixthForm("Does not have a sixth form")).toBe(false);
    expect(mapSixthForm("Not applicable")).toBeNull();
  });
});

describe("EES helpers", () => {
  it("formats academic years", () => {
    expect(academicYearLabel("202425")).toBe("2024/25");
    expect(academicYearLabel("2024/2025")).toBe("2024/25");
  });
  it("separates values from status symbols", () => {
    expect(parseValue("67.3")).toEqual({ value: 67.3, statusCode: null, text: null });
    expect(parseValue("z")).toEqual({ value: null, statusCode: "z", text: null });
    expect(parseValue("low")).toEqual({ value: null, statusCode: "low", text: null });
    expect(parseValue("B+")).toEqual({ value: null, statusCode: null, text: "B+" });
    expect(parseValue(undefined).statusCode).toBe("missing");
  });
  it("maps the applications and offers time period to the September entry year", () => {
    expect(entryYearFromTimePeriod("202627")).toBe(2026);
  });
  it("extracts the release version id from the publication page", () => {
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { releaseVersionSummary: { id: "abc-123" } } } })}</script></html>`;
    expect(extractReleaseVersionId(html)).toBe("abc-123");
    expect(extractReleaseVersionId("<html></html>")).toBeNull();
  });
});

describe("Ofsted and DE NI discovery", () => {
  it("picks the newest 'latest inspections' CSV", () => {
    const pick = pickLatestInspectionsCsv([
      { title: "Management information - state-funded schools - latest inspections as at 31 Aug 2026", url: "a.csv", content_type: "text/csv" },
      { title: "Management information - state-funded schools - latest inspections as at 30 Sep 2026", url: "b.csv", content_type: "text/csv" },
      { title: "Management information - state-funded schools - as at 30 Sep 2026", url: "c.ods", content_type: "application/vnd.oasis.opendocument.spreadsheet" },
    ]);
    expect(pick?.url).toBe("b.csv");
  });
  it("finds the latest NI school-level publication and workbook", () => {
    const article = '<a href="/publications/school-enrolment-school-level-data-202425">x</a><a href="/publications/school-enrolment-school-level-data-20252026">y</a><a href="/publications/school-enrolments-school-level-data-201718">z</a>';
    expect(pickLatestPublication(article)).toBe("https://www.education-ni.gov.uk/publications/school-enrolment-school-level-data-20252026");
    const pub = '<a href="https://www.education-ni.gov.uk/sites/default/files/2026-07/School%20level%20-%20post%20primary%20schools%20202526%20supp_1.xlsx">pp</a>';
    expect(pickPostPrimaryWorkbook(pub)).toContain("post%20primary");
  });
});

describe("XLSX reader", () => {
  it("reads shared strings, numbers and finds the header row", () => {
    const files = {
      "[Content_Types].xml": strToU8("<Types/>"),
      "xl/workbook.xml": strToU8('<workbook><sheets><sheet name="Reference Data" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      "xl/_rels/workbook.xml.rels": strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
      "xl/sharedStrings.xml": strToU8("<sst><si><t>DENI ref</t></si><si><t>School Type</t></si><si><t>Grammar</t></si><si><t>Title &amp; notes</t></si></sst>"),
      "xl/worksheets/sheet1.xml": strToU8(
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>3</v></c></row><row r="2"><c r="A2" t="s"><v>0</v></c><c r="B2" t="s"><v>1</v></c></row><row r="3"><c r="A3"><v>1410079</v></c><c r="B3" t="s"><v>2</v></c></row></sheetData></worksheet>',
      ),
    };
    const wb = readWorkbook(zipSync(files));
    const recs = sheetRecords(wb.get("Reference Data")!, "DENI ref");
    expect(wb.get("Reference Data")![0]![0]).toBe("Title & notes");
    expect(recs).toEqual([{ "DENI ref": 1410079, "School Type": "Grammar" }]);
  });
});

describe("robots.txt", () => {
  const txt = "User-agent: *\nDisallow: /docs/\nDisallow: /*.pdf$\nAllow: /docs/public/\nCrawl-delay: 5\n\nUser-agent: BadBot\nDisallow: /";
  it("applies the wildcard group to our agent", () => {
    const r = parseRobots(txt, "GrammarAtlasBot/0.1");
    expect(r.crawlDelayMs).toBe(5000);
    expect(robotsAllows(r.rules, "/admissions/policy.pdf")).toBe(false);
    expect(robotsAllows(r.rules, "/admissions/")).toBe(true);
    expect(robotsAllows(r.rules, "/docs/secret.html")).toBe(false);
    expect(robotsAllows(r.rules, "/docs/public/a.html")).toBe(true);
  });
  it("honours a group naming our agent specifically", () => {
    const r = parseRobots("User-agent: GrammarAtlasBot\nDisallow: /\n\nUser-agent: *\nAllow: /", "GrammarAtlasBot/0.1");
    expect(robotsAllows(r.rules, "/anything")).toBe(false);
  });
});

describe("admissions policy extraction (proposals only)", () => {
  const pages = [
    "ADMISSIONS POLICY 2027. 2. Planned Admission Number (PAN) The planned admission numbers are: Year 7 186",
    "Boys are eligible if they meet the required qualifying score of 121 in the Secondary Transfer Test. Registration should be made by 2 June 2026. Applicants must apply before the closing date of 31 October 2026.",
    "5 Oversubscription Criteria. Where applications exceed places: 1. Looked after boys and previously looked after boys. 2. Boys eligible for Pupil Premium living in the catchment area. 3. Siblings of boys on roll. Where the number of applicants exceeds places, distance is measured in a straight line. Random allocation is the final tie-break.",
  ];
  it("finds PAN, scores, dated deadlines and criteria with quotes and pages", () => {
    const f = extractPolicyFacts(pages);
    expect(f.publishedAdmissionNumber?.value).toBe(186);
    expect(f.publishedAdmissionNumber?.page).toBe(1);
    expect(f.qualifyingScores.map((q) => q.value)).toContain(121);
    expect(f.dates.map((d) => d.value)).toEqual(expect.arrayContaining(["2 June 2026", "31 October 2026"]));
    expect(f.oversubscriptionCriteria.length).toBeGreaterThanOrEqual(2);
    expect(f.mentions.distance[0]?.quote).toMatch(/straight line/);
    expect(f.mentions.tieBreak.length).toBeGreaterThan(0);
  });
  it("warns rather than guesses when information is missing", () => {
    const f = extractPolicyFacts(["This document describes our uniform."]);
    expect(f.publishedAdmissionNumber).toBeUndefined();
    expect(f.warnings).toEqual(expect.arrayContaining(["No published admission number found"]));
  });
  it("splits long text into retrieval passages", () => {
    const passages = toPassages("a ".repeat(2000));
    expect(passages.length).toBeGreaterThan(2);
    expect(passages.every((p) => p.length <= 1200)).toBe(true);
  });
});
