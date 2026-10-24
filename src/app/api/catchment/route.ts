import { NextResponse } from "next/server";
import { z } from "zod";
import { clampEntryYear } from "@/lib/academic-year";
import { checkCatchment } from "@/server/catchment";
import { rateLimit } from "@/server/rate-limit";

const query = z.object({ postcode: z.string().min(2).max(10), schools: z.string().max(400), year: z.string().optional() });

export async function GET(req: Request) {
  const limited = await rateLimit(req, "catchment", 30, 60);
  if (limited) return limited;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Enter a postcode and at least one school." }, { status: 400 });
  const slugs = parsed.data.schools.split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,120}$/.test(s));
  const r = await checkCatchment(parsed.data.postcode, slugs, clampEntryYear(parsed.data.year));
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 422 });
  // The postcode is not logged or stored with the result.
  return NextResponse.json(r.result, { headers: { "Cache-Control": "no-store" } });
}
