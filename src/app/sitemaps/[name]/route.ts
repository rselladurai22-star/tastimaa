import { SITEMAP_NAMES, sitemapEntries, urlsetXml } from "@/server/sitemaps";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = (await params).name.replace(/\.xml$/, "") as (typeof SITEMAP_NAMES)[number];
  if (!SITEMAP_NAMES.includes(name)) return new Response("Not found", { status: 404 });
  return new Response(urlsetXml(await sitemapEntries(name)), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
