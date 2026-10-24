import { NextResponse } from "next/server";
import { z } from "zod";
import { clampEntryYear } from "@/lib/academic-year";
import { sameOrigin } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { subscribe } from "@/server/reminders";

const body = z.object({ email: z.email().max(200), school: z.string().regex(/^[a-z0-9-]{1,120}$/).nullable().optional(), entryYear: z.number().int(), consent: z.literal(true) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = await rateLimit(req, "reminders", 5, 3600);
  if (limited) return limited;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address and tick the consent box." }, { status: 400 });
  await subscribe(parsed.data.email, parsed.data.school ?? null, clampEntryYear(parsed.data.entryYear));
  return NextResponse.json({ ok: true, message: "Check your inbox to confirm. Nothing is sent until you do." });
}
