import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ADMISSIONS_GUIDES } from "@/content/guides";
import { absoluteUrl } from "@/lib/site";
import { profileFlags } from "./indexability";

export interface UrlEntry {
  loc: string;
  lastmod?: string;
}

export const SITEMAP_NAMES = ["core", "schools", "areas"] as const;

export async function sitemapEntries(name: (typeof SITEMAP_NAMES)[number]): Promise<UrlEntry[]> {
  if (name === "core") {
    const tests = await db().execute<{ slug: string; updated_at: string }>(sql`SELECT slug, updated_at FROM entrance_tests WHERE verification_status <> 'unavailable'`);
    return [
      "/",
      "/grammar-schools",
      "/compare",
      "/11-plus",
      "/11-plus/exam-providers",
      "/11-plus/preparation",
      "/admissions",
      "/calendar",
      "/tools/eligibility-checker",
      "/tools/catchment-checker",
      "/tools/planner",
      "/assistant",
      "/methodology",
      "/data-sources",
      "/about",
      ...ADMISSIONS_GUIDES.map((g) => `/admissions/${g.slug}`),
    ]
      .map((p) => ({ loc: absoluteUrl(p) }))
      .concat(tests.map((t) => ({ loc: absoluteUrl(`/11-plus/${t.slug}`), lastmod: new Date(t.updated_at).toISOString() })));
  }
  if (name === "areas") {
    const rows = await db().execute<{ slug: string }>(sql`
      SELECT DISTINCT a.slug FROM geographic_areas a
      JOIN schools s ON (s.local_authority_id = a.id OR s.region_id = a.id OR (a.type = 'nation' AND s.nation = a.nation)) AND s.is_open AND s.selectivity <> 'non_selective'
      WHERE a.type IN ('nation', 'region', 'local_authority')
    `);
    return rows.map((r) => ({ loc: absoluteUrl(`/grammar-schools/${r.slug}`) }));
  }
  const flags = await profileFlags();
  return flags.flatMap((f) => {
    const base = `/schools/${f.slug}`;
    const out: UrlEntry[] = [{ loc: absoluteUrl(base), lastmod: f.updatedAt }];
    if (f.hasPolicy) out.push({ loc: absoluteUrl(`${base}/admissions`), lastmod: f.updatedAt }, { loc: absoluteUrl(`${base}/catchment`), lastmod: f.updatedAt });
    if (f.hasTest) out.push({ loc: absoluteUrl(`${base}/11-plus`) });
    if (f.hasResults) out.push({ loc: absoluteUrl(`${base}/results`) });
    if (f.hasInspections) out.push({ loc: absoluteUrl(`${base}/inspection`) });
    if (f.hasAllocations) out.push({ loc: absoluteUrl(`${base}/historical-admissions`) });
    return out;
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function urlsetXml(entries: UrlEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((e) => `  <url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;
}

export function indexXml(names: readonly string[]): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${names.map((n) => `  <sitemap><loc>${esc(absoluteUrl(`/sitemaps/${n}.xml`))}</loc><lastmod>${now}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`;
}
