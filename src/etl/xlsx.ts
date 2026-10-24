import { strFromU8, unzipSync } from "fflate";

/**
 * Minimal, dependency-free XLSX reader for the simple tabular workbooks that
 * government departments publish. Supports shared strings, inline strings,
 * numbers and booleans. Formulas return their cached value.
 */
export type Cell = string | number | boolean | null;

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function textOf(fragment: string): string {
  const parts = [...fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1] ?? ""));
  return parts.join("");
}

export function readWorkbook(buf: Uint8Array): Map<string, Cell[][]> {
  const files = unzipSync(buf);
  const get = (p: string) => (files[p] ? strFromU8(files[p]!) : "");

  const shared: string[] = [];
  const sst = get("xl/sharedStrings.xml");
  for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1] ?? ""));

  const rels = new Map<string, string>();
  for (const m of get("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) rels.set(id, target.replace(/^\/?xl\//, "").replace(/^\//, ""));
  }

  const sheets = new Map<string, Cell[][]>();
  for (const m of get("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(/name="([^"]+)"/.exec(m[0])?.[1] ?? "");
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1];
    const target = rid ? rels.get(rid) : undefined;
    if (!target) continue;
    const xml = get(`xl/${target}`);
    const rows: Cell[][] = [];
    for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row: Cell[] = [];
      for (const cm of (rm[1] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1] ?? "";
        const inner = cm[2] ?? "";
        const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
        const type = /t="([^"]+)"/.exec(attrs)?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        let value: Cell = null;
        if (type === "s" && v !== undefined) value = shared[Number(v)] ?? null;
        else if (type === "inlineStr") value = textOf(inner);
        else if (type === "str") value = v !== undefined ? decodeXml(v) : null;
        else if (type === "b") value = v === "1";
        else if (v !== undefined) value = Number(v);
        const idx = ref ? columnIndex(ref) : row.length;
        row[idx] = value;
      }
      for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null;
      rows.push(row);
    }
    sheets.set(name, rows);
  }
  return sheets;
}

/** Convert a sheet into records using the first row whose cells include `headerMarker`. */
export function sheetRecords(rows: Cell[][], headerMarker: string): Record<string, Cell>[] {
  const headerIdx = rows.findIndex((r) => r.some((c) => typeof c === "string" && c.trim() === headerMarker));
  if (headerIdx < 0) return [];
  const header = rows[headerIdx]!.map((c) => (c === null ? "" : String(c).trim()));
  return rows
    .slice(headerIdx + 1)
    .filter((r) => r.some((c) => c !== null && c !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? null])));
}
