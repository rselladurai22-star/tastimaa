import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { sameOrigin } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";

const body = z.object({
  school: z.string().regex(/^[a-z0-9-]{1,120}$/).nullable().optional(),
  page: z.string().max(300).optional(),
  field: z.string().trim().min(2).max(200),
  correction: z.string().trim().min(10).max(3000),
  sourceUrl: z.url().max(500).nullable().optional().or(z.literal("")),
  email: z.email().max(200).nullable().optional().or(z.literal("")),
  // Honeypot: real users never fill this in.
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = await rateLimit(req, "corrections", 5, 3600);
  if (limited) return limited;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please describe what is wrong (at least 10 characters) and check any links." }, { status: 400 });
  const d = parsed.data;
  const school = d.school ? await db().query.schools.findFirst({ where: eq(schema.schools.slug, d.school), columns: { id: true, name: true } }) : null;
  await db().insert(schema.adminReviewTasks).values({
    type: "user_correction",
    title: `Correction${school ? ` for ${school.name}` : ""}: ${d.field}`,
    schoolId: school?.id ?? null,
    priority: d.sourceUrl ? 2 : 3,
    payload: { field: d.field, correction: d.correction, sourceUrl: d.sourceUrl || null, page: d.page ?? null },
    submittedByEmail: d.email || null,
  });
  return NextResponse.json({ ok: true });
}
