import { NextResponse } from "next/server";
import { clampEntryYear } from "@/lib/academic-year";
import { plannerEvents, plannerSteps } from "@/server/planner";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const slugs = (sp.get("schools") ?? "").split(",").filter((s) => /^[a-z0-9-]{1,120}$/.test(s)).slice(0, 8);
  const entryYear = clampEntryYear(sp.get("year"));
  const { schools, events } = await plannerEvents(slugs, entryYear);
  const nations = [...new Set(schools.map((s) => s.nation))] as ("england" | "northern_ireland")[];
  const steps = (nations.length ? nations : ["england" as const]).map((n) => ({ nation: n, steps: plannerSteps(events, n) }));
  return NextResponse.json({ entryYear, schools, events, steps });
}
