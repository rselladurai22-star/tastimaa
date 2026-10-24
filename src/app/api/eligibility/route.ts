import { NextResponse } from "next/server";
import { z } from "zod";
import { clampEntryYear } from "@/lib/academic-year";
import { sameOrigin } from "@/server/auth";
import { runChecker } from "@/server/eligibility";
import { rateLimit } from "@/server/rate-limit";

const triBool = z.boolean().nullable().optional();
const body = z.object({
  schools: z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).min(1).max(5),
  entryYear: z.number().int(),
  answers: z
    .object({
      childSex: z.enum(["boy", "girl"]).nullable().optional(),
      tests: z.record(z.string().max(80), z.object({ status: z.enum(["not_registered", "registered", "sat_awaiting", "have_result"]).nullable().optional(), score: z.number().min(0).max(1000).nullable().optional() })).optional(),
      lookedAfter: z.enum(["looked_after", "previously_looked_after", "no"]).nullable().optional(),
      pupilPremium: triBool,
      medicalSocial: triBool,
      sibling: z.record(z.string().max(120), z.boolean().nullable()).optional(),
      staffChild: z.record(z.string().max(120), z.boolean().nullable()).optional(),
      catchment: z.record(z.string().max(120), z.boolean().nullable()).optional(),
      postcode: z.string().max(10).nullable().optional(),
    })
    .default({}),
});

/**
 * Stateless assessment. Answers are used for this response only: nothing is
 * stored or logged, and no account is needed.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = await rateLimit(req, "eligibility", 60, 60);
  if (limited) return limited;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your answers." }, { status: 400 });
  const result = await runChecker(parsed.data.schools, clampEntryYear(parsed.data.entryYear), parsed.data.answers);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
