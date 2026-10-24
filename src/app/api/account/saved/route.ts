import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { currentUser, sameOrigin } from "@/server/auth";

async function list(userId: number) {
  return db().select({ slug: schema.schools.slug, name: schema.schools.name }).from(schema.savedSchools).innerJoin(schema.schools, eq(schema.schools.id, schema.savedSchools.schoolId)).where(eq(schema.savedSchools.userId, userId));
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ saved: await list(user.id) });
}

/** Merge a browser shortlist into the account (union). */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = z.object({ slugs: z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).max(20) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid list" }, { status: 400 });
  if (parsed.data.slugs.length) {
    const schools = await db().select({ id: schema.schools.id }).from(schema.schools).where(inArray(schema.schools.slug, parsed.data.slugs));
    if (schools.length) await db().insert(schema.savedSchools).values(schools.map((s) => ({ userId: user.id, schoolId: s.id }))).onConflictDoNothing();
  }
  return NextResponse.json({ saved: await list(user.id) });
}

/** Delete the account and everything linked to it, immediately. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (user.role !== "parent") return NextResponse.json({ error: "Editor accounts are removed by an administrator." }, { status: 400 });
  await db().delete(schema.reminderSubscriptions).where(eq(schema.reminderSubscriptions.email, user.email));
  await db().delete(schema.users).where(eq(schema.users.id, user.id)); // cascades to sessions, saved schools, journeys
  return NextResponse.json({ ok: true });
}
