import type { KNode } from "@/ui/viz/knowledge-map";
import { ADMISSIONS_GUIDES } from "./guides";

/**
 * The knowledge atlas: guides, exam pages and tools, joined where one links to
 * another. Positions are hand-set on a 760 × 400 canvas.
 */
const POS: Record<string, [number, number]> = {
  "qualifying-is-not-an-offer": [380, 185],
  oversubscription: [215, 115],
  "out-of-catchment": [200, 265],
  "home-address": [95, 345],
  appeals: [420, 330],
  "northern-ireland": [610, 300],
  "wales-and-scotland": [675, 368],
};

const NOTES: Record<string, string> = {
  "qualifying-is-not-an-offer": "Passing makes a child eligible, not admitted",
  oversubscription: "The order places are offered in",
  "out-of-catchment": "Defined areas, distance, or neither",
  "home-address": "Which address counts, from when",
  appeals: "What to do after a refusal",
  "northern-ireland": "SEAG and Year 8 transfer",
  "wales-and-scotland": "No state grammar schools",
};

export const KNOWLEDGE_NODES: KNode[] = [
  ...ADMISSIONS_GUIDES.map((g) => ({ id: g.slug, label: g.short, href: `/admissions/${g.slug}`, kind: "guide" as const, x: POS[g.slug]![0], y: POS[g.slug]![1], note: NOTES[g.slug] ?? g.description })),
  { id: "11-plus", label: "The 11+ explained", href: "/11-plus", kind: "exam", x: 555, y: 95, note: "Subjects, standardisation and scores" },
  { id: "providers", label: "Tests and providers", href: "/11-plus/exam-providers", kind: "exam", x: 680, y: 45, note: "Who sets each test, and where" },
  { id: "preparation", label: "Practice questions", href: "/11-plus/preparation", kind: "exam", x: 675, y: 185, note: "Original timed practice" },
  { id: "eligibility", label: "Eligibility checker", href: "/tools/eligibility-checker", kind: "tool", x: 365, y: 45, note: "Apply a school's rules to your child" },
  { id: "catchment-checker", label: "Catchment checker", href: "/tools/catchment-checker", kind: "tool", x: 80, y: 195, note: "Verified boundaries only" },
];

const pairs = new Set<string>();
export const KNOWLEDGE_EDGES: [string, string][] = [];
const add = (a: string, b: string) => {
  const k = [a, b].sort().join("|");
  if (pairs.has(k)) return;
  pairs.add(k);
  KNOWLEDGE_EDGES.push([a, b]);
};
for (const g of ADMISSIONS_GUIDES) for (const r of g.related) add(g.slug, r);
add("qualifying-is-not-an-offer", "11-plus");
add("11-plus", "providers");
add("11-plus", "preparation");
add("northern-ireland", "11-plus");
add("qualifying-is-not-an-offer", "eligibility");
add("oversubscription", "eligibility");
add("out-of-catchment", "catchment-checker");
