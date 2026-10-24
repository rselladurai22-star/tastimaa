import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatWeekdayDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { hashToken } from "./tokens";
import { sendEmail } from "./email";
import { plannerEvents } from "./planner";

/** Double opt-in: nothing is sent until the address is confirmed. */
export async function subscribe(email: string, schoolSlug: string | null, entryYear: number) {
  const school = schoolSlug ? await db().query.schools.findFirst({ where: eq(schema.schools.slug, schoolSlug), columns: { id: true, name: true } }) : null;
  const confirm = randomBytes(24).toString("base64url");
  const unsub = randomBytes(24).toString("base64url");
  await db()
    .insert(schema.reminderSubscriptions)
    .values({ email: email.toLowerCase(), schoolId: school?.id ?? null, entryYear, confirmTokenHash: hashToken(confirm), unsubscribeTokenHash: hashToken(unsub) })
    .onConflictDoUpdate({
      target: [schema.reminderSubscriptions.email, schema.reminderSubscriptions.schoolId, schema.reminderSubscriptions.entryYear],
      set: { confirmTokenHash: hashToken(confirm), unsubscribeTokenHash: hashToken(unsub) },
    });
  await sendEmail(
    email,
    `Confirm your admissions reminders for September ${entryYear}`,
    `Please confirm you'd like reminders about verified admissions dates${school ? ` for ${school.name}` : ""} (September ${entryYear} entry).\n\nConfirm: ${SITE.url}/api/reminders/confirm?token=${confirm}\n\nIf you didn't ask for this, ignore this email — nothing will be sent.\nUnsubscribe at any time: ${SITE.url}/api/reminders/unsubscribe?token=${unsub}`,
  );
}

export async function confirm(token: string) {
  const r = await db().update(schema.reminderSubscriptions).set({ confirmedAt: new Date(), confirmTokenHash: null }).where(eq(schema.reminderSubscriptions.confirmTokenHash, hashToken(token))).returning({ id: schema.reminderSubscriptions.id });
  return r.length > 0;
}

export async function unsubscribe(token: string) {
  const r = await db().delete(schema.reminderSubscriptions).where(eq(schema.reminderSubscriptions.unsubscribeTokenHash, hashToken(token))).returning({ id: schema.reminderSubscriptions.id });
  return r.length > 0;
}

/** Send reminders for verified events starting in exactly `daysAhead` days. Run daily. */
export async function sendDueReminders(today = new Date(), daysAhead = 7) {
  const target = new Date(today.getTime() + daysAhead * 86_400_000).toISOString().slice(0, 10);
  const subs = await db()
    .select({ s: schema.reminderSubscriptions, slug: schema.schools.slug })
    .from(schema.reminderSubscriptions)
    .leftJoin(schema.schools, eq(schema.schools.id, schema.reminderSubscriptions.schoolId))
    .where(and(isNotNull(schema.reminderSubscriptions.confirmedAt), sql`(${schema.reminderSubscriptions.lastSentAt} IS NULL OR ${schema.reminderSubscriptions.lastSentAt} < now() - interval '20 hours')`));
  let sent = 0;
  for (const { s, slug } of subs) {
    const { events } = await plannerEvents(slug ? [slug] : [], s.entryYear);
    const due = events.filter((e) => e.startsOn === target && e.verificationStatus === "officially_verified");
    if (!due.length) continue;
    await sendEmail(
      s.email,
      `Coming up: ${due[0]!.title}`,
      `${due.map((e) => `${formatWeekdayDate(e.startsOn)}: ${e.title}${e.url ? `\nOfficial source: ${e.url}` : ""}`).join("\n\n")}\n\nAlways check the official source; dates can change.\nStop these reminders: ${SITE.url}/api/reminders/unsubscribe (use the link in your confirmation email)`,
    );
    await db().update(schema.reminderSubscriptions).set({ lastSentAt: new Date() }).where(eq(schema.reminderSubscriptions.id, s.id));
    sent++;
  }
  return { sent, checked: subs.length };
}
