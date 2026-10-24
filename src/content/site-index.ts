/**
 * Static destinations that search can return alongside schools, areas and tests.
 * Keywords are the words parents actually type; titles are what they see.
 */
export interface IndexEntry {
  type: "guide" | "tool" | "page";
  title: string;
  href: string;
  description: string;
  keywords: string;
}

export const SITE_INDEX: IndexEntry[] = [
  { type: "page", title: "How grammar school admissions work", href: "/admissions", description: "The three steps, from test to offer", keywords: "admissions how it works process apply application guide" },
  { type: "guide", title: "Qualifying is not the same as getting a place", href: "/admissions/qualifying-is-not-an-offer", description: "Why passing the 11+ isn't an offer", keywords: "pass passed qualify qualifying score offer guarantee place" },
  { type: "guide", title: "Applying outside your area or county", href: "/admissions/out-of-catchment", description: "Catchment areas, distance and out-of-area priority", keywords: "catchment out of area county outside distance boundary radius" },
  { type: "guide", title: "How oversubscription criteria work", href: "/admissions/oversubscription", description: "The order places are offered in", keywords: "oversubscription criteria priority sibling pupil premium looked after tie break" },
  { type: "guide", title: "Appeals if you're refused a place", href: "/admissions/appeals", description: "Deadlines, hearings and selection reviews", keywords: "appeal appeals refused rejected review panel waiting list" },
  { type: "guide", title: "Home address rules and moving house", href: "/admissions/home-address", description: "Which address counts and from when", keywords: "address move moving house residence rent evidence" },
  { type: "guide", title: "Transfer in Northern Ireland", href: "/admissions/northern-ireland", description: "SEAG, Year 8 entry and the EA process", keywords: "northern ireland ni seag transfer year 8 belfast" },
  { type: "guide", title: "Wales and Scotland", href: "/admissions/wales-and-scotland", description: "There are no state grammar schools", keywords: "wales scotland welsh scottish" },
  { type: "page", title: "The 11+ explained", href: "/11-plus", description: "How entrance tests work and differ", keywords: "11+ 11 plus eleven plus exam test entrance standardised score verbal reasoning non-verbal" },
  { type: "page", title: "11+ test providers", href: "/11-plus/exam-providers", description: "Who sets each test and where", keywords: "provider gl assessment csse seag exam board" },
  { type: "page", title: "11+ preparation and practice", href: "/11-plus/preparation", description: "Original timed practice questions", keywords: "practice questions preparation prepare revision timed" },
  { type: "tool", title: "Eligibility checker", href: "/tools/eligibility-checker", description: "How each school's rules apply to your child", keywords: "eligibility eligible chance criteria check rules" },
  { type: "tool", title: "Catchment checker", href: "/tools/catchment-checker", description: "Check a postcode against verified boundaries", keywords: "catchment checker postcode boundary inside outside" },
  { type: "tool", title: "Compare schools", href: "/compare", description: "Up to five schools side by side", keywords: "compare comparison side by side versus vs" },
  { type: "tool", title: "Admissions planner", href: "/tools/planner", description: "Your timeline and reminders", keywords: "planner plan timeline reminders deadlines checklist" },
  { type: "tool", title: "Research assistant", href: "/assistant", description: "Questions answered from cited sources", keywords: "assistant ask question ai help chat" },
  { type: "page", title: "Admissions calendar", href: "/calendar", description: "Verified key dates", keywords: "calendar dates deadline deadlines offer day closing date registration" },
  { type: "page", title: "Data sources and freshness", href: "/data-sources", description: "Every source and its last refresh", keywords: "data sources official licence freshness" },
  { type: "page", title: "Methodology", href: "/methodology", description: "How we collect and verify information", keywords: "methodology verify verification accuracy how" },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+ ]/g, " ");

/** Every query word must start a word in the title or keywords. */
export function searchIndex(q: string, limit = 4): IndexEntry[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return SITE_INDEX.map((e) => {
    const hay = norm(`${e.title} ${e.keywords}`).split(/\s+/);
    const hits = words.filter((w) => hay.some((h) => h.startsWith(w))).length;
    const titleHits = words.filter((w) => norm(e.title).split(/\s+/).some((h) => h.startsWith(w))).length;
    return { e, score: hits === words.length ? hits * 2 + titleHits : 0 };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
}
