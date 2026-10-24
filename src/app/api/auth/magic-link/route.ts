import { NextResponse } from "next/server";
import { z } from "zod";
import { SITE } from "@/lib/site";
import { createLoginToken, sameOrigin } from "@/server/auth";
import { sendEmail } from "@/server/email";
import { rateLimit } from "@/server/rate-limit";

const body = z.object({ email: z.email().max(200) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = await rateLimit(req, "magic-link", 5, 900);
  if (limited) return limited;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const token = await createLoginToken(parsed.data.email);
  await sendEmail(parsed.data.email, `Your ${SITE.name} sign-in link`, `Sign in (link valid for 20 minutes, single use):\n${SITE.url}/api/auth/verify?token=${token}\n\nIf you didn't request this, you can ignore this email.`);
  // Same response whether or not an account exists.
  return NextResponse.json({ ok: true, message: "If that address is valid, a sign-in link is on its way." });
}
