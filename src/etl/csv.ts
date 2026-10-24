import { parse } from "csv-parse/sync";

/** Decode a CSV buffer, honouring a UTF-8 BOM or falling back to Windows-1252. */
export function decodeCsv(buf: Buffer, fallback: "windows-1252" | "utf-8" = "windows-1252"): string {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString("utf8");
  if (fallback === "utf-8") return buf.toString("utf8");
  // Valid UTF-8 decodes cleanly; otherwise assume the GOV.UK default of cp1252.
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return decodeWindows1252(buf);
  }
}

// Windows-1252 differs from Latin-1 only in 0x80–0x9F (curly quotes, dashes, €, …).
// Node's TextDecoder maps that range to C1 control characters, so remap it explicitly.
const CP1252_HIGH = [
  0x20ac, 0xfffd, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0xfffd, 0x017d, 0xfffd,
  0xfffd, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0xfffd, 0x017e, 0x0178,
];

export function decodeWindows1252(buf: Buffer): string {
  return buf.toString("latin1").replace(/[\x80-\x9f]/g, (c) => String.fromCharCode(CP1252_HIGH[c.charCodeAt(0) - 0x80]!));
}

/**
 * Parse CSV text into records, keeping only the columns a job needs so large
 * national files do not have to be held in memory in full.
 */
export function parseCsv<K extends string>(text: string, keep?: readonly K[], filter?: (r: Record<K, string>) => boolean): Record<K, string>[] {
  const keepSet = keep ? new Set<string>(keep) : undefined;
  return parse(text, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    relax_column_count: true,
    on_record: (record: Record<string, string>) => {
      let out: Record<string, string> = record;
      if (keepSet) {
        out = {};
        for (const k of keepSet) out[k] = record[k] ?? "";
      }
      if (filter && !filter(out as Record<K, string>)) return null;
      return out;
    },
  }) as Record<K, string>[];
}

/** Treat publisher placeholders as missing. */
export function clean(v: string | undefined | null): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  if (t === "" || t === "NULL" || t === "Not applicable" || t === "z" || t === "x" || t === "c" || t === ":") return null;
  return t;
}

export function toInt(v: string | undefined | null): number | null {
  const c = clean(v);
  if (c === null) return null;
  const n = Number(c.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function toNum(v: string | undefined | null): number | null {
  const c = clean(v);
  if (c === null) return null;
  const n = Number(c.replace(/,/g, "").replace(/%$/, ""));
  return Number.isFinite(n) ? n : null;
}

/** dd-mm-yyyy or dd/mm/yyyy → yyyy-mm-dd */
export function toIsoDate(v: string | undefined | null): string | null {
  const c = clean(v);
  if (!c) return null;
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(c);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(c) ? c : null;
  const [, d, mo, y] = m;
  return `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
}
