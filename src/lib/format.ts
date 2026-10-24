const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
const shortDateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
const numFmt = new Intl.NumberFormat("en-GB");

function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // Date-only strings are calendar dates; anchor at noon UTC to avoid TZ drift.
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00Z`) : new Date(d);
}

export const formatDate = (d: string | Date | null | undefined) => (d ? dateFmt.format(toDate(d)) : "—");
export const formatShortDate = (d: string | Date | null | undefined) => (d ? shortDateFmt.format(toDate(d)) : "—");
export const formatWeekdayDate = (d: string | Date | null | undefined) => (d ? weekdayFmt.format(toDate(d)) : "—");
export const formatNumber = (n: number | null | undefined) => (n === null || n === undefined ? "—" : numFmt.format(n));

export function formatMiles(miles: number): string {
  if (miles < 0.1) return "under 0.1 miles";
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} miles`;
}

/** "3 days ago" style relative age for freshness indicators. */
export function relativeAge(d: Date | string | null | undefined, now = new Date()): string {
  if (!d) return "never";
  const ms = now.getTime() - toDate(d).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30.4);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function titleCaseName(s: string): string {
  // GIAS trust names are upper-case; present them readably without changing meaning.
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(And|Of|The|For)\b/g, (m) => m.toLowerCase()).replace(/^./, (m) => m.toUpperCase());
}
