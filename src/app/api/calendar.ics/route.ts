import { clampEntryYear } from "@/lib/academic-year";
import { SITE } from "@/lib/site";
import { plannerEvents, toIcs } from "@/server/planner";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const slugs = (sp.get("schools") ?? "").split(",").filter((s) => /^[a-z0-9-]{1,120}$/.test(s)).slice(0, 8);
  const entryYear = clampEntryYear(sp.get("year"));
  const { events } = await plannerEvents(slugs, entryYear);
  return new Response(toIcs(events, `${SITE.name} — September ${entryYear} admissions`), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="admissions-${entryYear}.ics"`, "Cache-Control": "no-store" },
  });
}
