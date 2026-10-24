/**
 * Query normalisation for school search. Pure functions (unit tested).
 *
 * Parents search with abbreviations ("QE Barnet", "KEGS"), punctuation
 * variants ("Pate's" / "Pates") and typos. We expand known abbreviations,
 * strip punctuation and leave typo tolerance to trigram similarity in SQL.
 */
const ABBREVIATIONS: Record<string, string> = {
  qe: "queen elizabeth",
  qegs: "queen elizabeth grammar school",
  qes: "queen elizabeth school",
  kegs: "king edward grammar school",
  kes: "king edward school",
  ke: "king edward",
  rgs: "royal grammar school",
  crgs: "colchester royal grammar school",
  gs: "grammar school",
  hs: "high school",
  sch: "school",
  st: "st",
  saint: "st",
  ce: "church of england",
  cofe: "church of england",
  rc: "catholic",
  "&": "and",
};

const STOP = new Set(["the", "school", "grammar", "of", "for", "and", "a"]);

export function normaliseQuery(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9& ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function expandQuery(raw: string): string {
  const words = normaliseQuery(raw).split(" ").filter(Boolean);
  return words.map((w) => ABBREVIATIONS[w] ?? w).join(" ");
}

/** Build a prefix tsquery string ("queen:* & elizabeth:*") from the expanded query. */
export function toPrefixTsQuery(raw: string): string | null {
  const tokens = expandQuery(raw)
    .split(" ")
    .filter((t) => t && t !== "&")
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  if (!tokens.length) return null;
  const meaningful = tokens.filter((t) => !STOP.has(t));
  const use = meaningful.length ? meaningful : tokens;
  return use.map((t) => `${t}:*`).join(" & ");
}

/** Does the input look like a full or partial UK postcode? */
export function looksLikePostcode(raw: string): "full" | "outward" | null {
  const c = raw.toUpperCase().replace(/\s+/g, "");
  if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(c)) return "full";
  if (/^[A-Z]{1,2}\d[A-Z\d]?$/.test(c)) return "outward";
  return null;
}
