import { NextResponse } from "next/server";
import { z } from "zod";
import { ask } from "@/ai/assistant";
import { clampEntryYear } from "@/lib/academic-year";
import { sameOrigin } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";

const body = z.object({ question: z.string().trim().min(3).max(500), school: z.string().regex(/^[a-z0-9-]{1,120}$/).nullable().optional(), entryYear: z.number().int().optional() });

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = await rateLimit(req, "assistant", 10, 60);
  if (limited) return limited;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please ask a question between 3 and 500 characters." }, { status: 400 });
  const result = await ask(parsed.data.question, { schoolSlug: parsed.data.school ?? null, entryYear: clampEntryYear(parsed.data.entryYear) });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
