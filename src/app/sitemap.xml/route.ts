import { indexXml, SITEMAP_NAMES } from "@/server/sitemaps";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(indexXml(SITEMAP_NAMES), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
