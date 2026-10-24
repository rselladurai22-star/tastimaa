/**
 * Admission-cycle arithmetic. Every function takes `today` explicitly so it
 * can be tested and never silently depends on the server clock.
 *
 * England: entry to Year 7 in September of `entryYear`. Applications close
 * on 31 October of the previous year and offers are made on 1 March.
 * Northern Ireland: transfer to Year 8 in September of `entryYear`, after the
 * SEAG assessment in the autumn of the P7 year.
 */
export type Nation = "england" | "northern_ireland" | "wales" | "scotland";

/** The entry year most families researching now are applying for. */
export function defaultEntryYear(today: Date = new Date()): number {
  const y = today.getUTCFullYear();
  // From April, the current year's offers are out; families researching now are a year behind.
  return today.getUTCMonth() >= 3 ? y + 1 : y;
}

export function selectableEntryYears(today: Date = new Date()): number[] {
  const d = defaultEntryYear(today);
  return [d, d + 1, d + 2];
}

export function clampEntryYear(value: unknown, today: Date = new Date()): number {
  const years = selectableEntryYears(today);
  const n = Number(value);
  return years.includes(n) ? n : years[0]!;
}

/** e.g. 2027 → "2026/27" (the academic year in which the child applies). */
export function applicationAcademicYear(entryYear: number): string {
  return `${entryYear - 1}/${String(entryYear).slice(-2)}`;
}

/** Birth-date window for a September entry year (inclusive), using each nation's cut-off. */
export function birthWindow(entryYear: number, nation: Nation = "england"): { from: string; to: string } {
  if (nation === "northern_ireland") {
    // NI school year runs 2 July – 1 July; Year 8 entrants are 11 by 1 July of the entry year.
    return { from: `${entryYear - 12}-07-02`, to: `${entryYear - 11}-07-01` };
  }
  return { from: `${entryYear - 12}-09-01`, to: `${entryYear - 11}-08-31` };
}

/**
 * Map the child's current school year to their entry year.
 * England: a child in Year 6 now starts Year 7 next September.
 * NI: a child in P7 now starts Year 8 next September.
 */
export function entryYearFromCurrentYearGroup(yearGroup: number, nation: Nation, today: Date = new Date()): number {
  const academicStart = today.getUTCMonth() >= 8 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  const finalPrimaryYear = nation === "northern_ireland" ? 7 : 6;
  return academicStart + 1 + (finalPrimaryYear - yearGroup);
}

export function entryLabel(entryYear: number, nation: Nation = "england"): string {
  return nation === "northern_ireland" ? `Year 8 entry, September ${entryYear}` : `Year 7 entry, September ${entryYear}`;
}
