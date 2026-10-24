/**
 * Heuristic extraction of admissions facts from policy text. Output is always
 * a *proposal* with the exact quote it was derived from; it is sent to the
 * admin review queue and never published automatically.
 */

export interface ExtractedFact<T = string | number> {
  value: T;
  quote: string;
  page: number;
}

export interface ExtractedPolicy {
  publishedAdmissionNumber?: ExtractedFact<number>;
  qualifyingScores: ExtractedFact<number>[];
  dates: ExtractedFact<string>[];
  oversubscriptionCriteria: ExtractedFact<string>[];
  mentions: {
    catchment: ExtractedFact<string>[];
    distance: ExtractedFact<string>[];
    pupilPremium: ExtractedFact<string>[];
    sibling: ExtractedFact<string>[];
    lookedAfter: ExtractedFact<string>[];
    tieBreak: ExtractedFact<string>[];
    waitingList: ExtractedFact<string>[];
  };
  warnings: string[];
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const DATE_RE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})\\s+(20\\d{2})\\b`, "g");

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function clip(s: string, max = 320): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function findMentions(pages: string[], re: RegExp, limit = 4): ExtractedFact<string>[] {
  const out: ExtractedFact<string>[] = [];
  pages.forEach((text, i) => {
    for (const s of sentences(text)) {
      if (re.test(s) && out.length < limit) out.push({ value: clip(s), quote: clip(s), page: i + 1 });
    }
  });
  return out;
}

export function extractPolicyFacts(pages: string[]): ExtractedPolicy {
  const warnings: string[] = [];
  const result: ExtractedPolicy = {
    qualifyingScores: [],
    dates: [],
    oversubscriptionCriteria: [],
    mentions: { catchment: [], distance: [], pupilPremium: [], sibling: [], lookedAfter: [], tieBreak: [], waitingList: [] },
    warnings,
  };

  pages.forEach((raw, i) => {
    const page = i + 1;
    const text = raw.replace(/\s+/g, " ");

    // Published admission number, e.g. "The Published Admission Number (PAN) for Year 7 is 192".
    if (!result.publishedAdmissionNumber) {
      const m = /(published admission number|\bPAN\b)[^.]{0,120}?\b(\d{2,3})\b/i.exec(text);
      if (m) {
        const n = Number(m[2]);
        if (n >= 20 && n <= 450) {
          const start = Math.max(0, m.index - 40);
          result.publishedAdmissionNumber = { value: n, quote: clip(text.slice(start, m.index + m[0].length + 40)), page };
        }
      }
    }

    // Qualifying / standardised scores, e.g. "a standardised score of 121 or above".
    for (const m of text.matchAll(/(qualif\w*|pass\w*|standardised|automatic\w*|minimum)[^.]{0,80}?\bscore[^.]{0,40}?\b(\d{2,3})\b/gi)) {
      const n = Number(m[2]);
      if (n >= 60 && n <= 450 && !result.qualifyingScores.some((q) => q.value === n)) {
        result.qualifyingScores.push({ value: n, quote: clip(m[0]), page });
      }
    }

    for (const m of text.matchAll(DATE_RE)) {
      const start = Math.max(0, (m.index ?? 0) - 120);
      const context = text.slice(start, (m.index ?? 0) + m[0].length + 60);
      if (/(regist|test|exam|assessment|result|deadline|clos|offer|appeal|apply|application)/i.test(context)) {
        result.dates.push({ value: m[0], quote: clip(context.trim()), page });
      }
    }

    // Numbered oversubscription criteria lists: "1. Looked after children …"
    if (/oversubscri/i.test(text)) {
      for (const m of text.matchAll(/(?:^|\s)(\d{1,2})[.)]\s+([A-Z][^]{20,260}?)(?=\s\d{1,2}[.)]\s+[A-Z]|$)/g)) {
        const n = Number(m[1]);
        if (n >= 1 && n <= 12 && result.oversubscriptionCriteria.length < 15) {
          result.oversubscriptionCriteria.push({ value: `${n}. ${clip(m[2]!.trim(), 240)}`, quote: clip(m[0].trim()), page });
        }
      }
    }
  });

  result.mentions.catchment = findMentions(pages, /catchment|designated area|priority area/i);
  result.mentions.distance = findMentions(pages, /straight[- ]line|distance (?:will be |is )?measured|home to school|measured from/i);
  result.mentions.pupilPremium = findMentions(pages, /pupil premium|free school meals|service premium/i);
  result.mentions.sibling = findMentions(pages, /\bsibling/i);
  result.mentions.lookedAfter = findMentions(pages, /looked after|previously looked after/i, 2);
  result.mentions.tieBreak = findMentions(pages, /tie[- ]?break|random allocation|lottery|drawing of lots/i, 3);
  result.mentions.waitingList = findMentions(pages, /waiting list|continuing interest/i, 3);

  if (!result.publishedAdmissionNumber) warnings.push("No published admission number found");
  if (!result.qualifyingScores.length) warnings.push("No qualifying score found — the policy may refer to a separate test document");
  if (!result.oversubscriptionCriteria.length) warnings.push("No numbered oversubscription criteria detected; review the full text");
  if (result.qualifyingScores.length > 1) warnings.push("Multiple scores found — check which apply to which priority group");
  return result;
}
