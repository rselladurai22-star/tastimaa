import { NextResponse } from "next/server";
import { z } from "zod";
import { clampEntryYear } from "@/lib/academic-year";
import { saveComparison } from "@/server/compare";
import { rateLimit } from "@/server/rate-limit";
import { currentUser } from "@/server/auth";

const body = z.object({ schools: z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).min(2).max(5), entryYear: z.number().int() });

export async function POST(req: Request) {
  const limited = await rateLimit(req, "comparisons", 20, 60);
  if (limited) return limited;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose between two and five schools." }, { status: 400 });
  const user = await currentUser();
  const slug = await saveComparison(parsed.data.schools, clampEntryYear(parsed.data.entryYear), user?.id);
  if (!slug) return NextResponse.json({ error: "Those schools could not be found." }, { status: 404 });
  return NextResponse.json({ slug });
}
