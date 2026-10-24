"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { JOBS } from "@/etl/jobs";
import { processPolicyDocument } from "@/etl/jobs/admissions-docs";
import { runJob } from "@/etl/runner";
import { destroySession, passwordLogin, requireRole } from "@/server/auth";

async function audit(userId: number, action: string, entity: string, entityId: string | number | null, detail?: unknown) {
  await db().insert(schema.auditLog).values({ userId, action, entity, entityId: entityId === null ? null : String(entityId), detail: detail ?? null });
}

export async function loginAction(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const user = await passwordLogin(email, password);
  if (!user) return { error: "Those details didn't match an editor account." };
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/**
 * Approve an extracted or editorial policy: the policy, its criteria and score
 * rules become "officially verified". Nothing becomes authoritative without this.
 */
export async function approveTask(form: FormData) {
  const user = await requireRole(["admin", "editor"]);
  const id = Number(form.get("taskId"));
  const note = String(form.get("note") ?? "").slice(0, 2000);
  const task = await db().query.adminReviewTasks.findFirst({ where: eq(schema.adminReviewTasks.id, id) });
  if (!task) return;
  const now = new Date();
  if (task.entityType === "admission_policy" && task.entityId) {
    await db().update(schema.admissionPolicies).set({ status: "published", verificationStatus: "officially_verified", approvedBy: user.id, approvedAt: now, lastCheckedAt: now, updatedAt: now }).where(eq(schema.admissionPolicies.id, task.entityId));
    await db().update(schema.admissionCriteria).set({ verificationStatus: "officially_verified", lastCheckedAt: now }).where(eq(schema.admissionCriteria.policyId, task.entityId));
    await db().update(schema.scoreRules).set({ verificationStatus: "officially_verified", lastCheckedAt: now }).where(eq(schema.scoreRules.policyId, task.entityId));
  }
  await db().update(schema.adminReviewTasks).set({ status: "approved", resolvedBy: user.id, resolvedAt: now, resolutionNote: note || null, updatedAt: now }).where(eq(schema.adminReviewTasks.id, id));
  await audit(user.id, "approve", "admin_review_task", id, { entityType: task.entityType, entityId: task.entityId, note });
  revalidatePath("/admin/review");
  redirect("/admin/review");
}

export async function rejectTask(form: FormData) {
  const user = await requireRole(["admin", "editor"]);
  const id = Number(form.get("taskId"));
  const note = String(form.get("note") ?? "").slice(0, 2000);
  if (!note) redirect(`/admin/review/${id}?error=note`);
  const task = await db().query.adminReviewTasks.findFirst({ where: eq(schema.adminReviewTasks.id, id) });
  if (!task) return;
  const now = new Date();
  if (task.entityType === "admission_policy" && task.entityId) {
    await db().update(schema.admissionPolicies).set({ status: "rejected", updatedAt: now }).where(eq(schema.admissionPolicies.id, task.entityId));
  }
  await db().update(schema.adminReviewTasks).set({ status: "rejected", resolvedBy: user.id, resolvedAt: now, resolutionNote: note, updatedAt: now }).where(eq(schema.adminReviewTasks.id, id));
  await audit(user.id, "reject", "admin_review_task", id, { note });
  redirect("/admin/review");
}

export async function resolveTask(form: FormData) {
  const user = await requireRole(["admin", "editor"]);
  const id = Number(form.get("taskId"));
  const note = String(form.get("note") ?? "").slice(0, 2000);
  await db().update(schema.adminReviewTasks).set({ status: "resolved", resolvedBy: user.id, resolvedAt: new Date(), resolutionNote: note || null, updatedAt: new Date() }).where(eq(schema.adminReviewTasks.id, id));
  await audit(user.id, "resolve", "admin_review_task", id, { note });
  redirect("/admin/review");
}

const uploadSchema = z.object({
  schoolId: z.coerce.number().int().positive(),
  entryYear: z.coerce.number().int().min(2020).max(2040),
  title: z.string().trim().min(5).max(300),
  url: z.url().max(1000),
});

/** Administrator-assisted import for documents that can't be fetched automatically. */
export async function uploadDocument(form: FormData) {
  const user = await requireRole(["admin", "editor"]);
  const parsed = uploadSchema.safeParse({ schoolId: form.get("schoolId"), entryYear: form.get("entryYear"), title: form.get("title"), url: form.get("url") });
  const file = form.get("file");
  if (!parsed.success || !(file instanceof File) || file.size === 0) redirect("/admin/documents?error=invalid");
  if (file.size > 30 * 1024 * 1024) redirect("/admin/documents?error=size");
  const body = Buffer.from(await file.arrayBuffer());
  if (body.subarray(0, 4).toString() !== "%PDF") redirect("/admin/documents?error=pdf");
  let documentId = 0;
  await runJob(
    "admissions_document_upload",
    "school_admissions_documents",
    async (ctx) => {
      const r = await ctx.recordDocument({ title: parsed.data.title, url: parsed.data.url, body, contentType: "application/pdf", entryYear: parsed.data.entryYear, schoolId: parsed.data.schoolId, extension: "pdf" });
      documentId = r.documentId;
      await processPolicyDocument(ctx, { schoolId: parsed.data.schoolId, documentId: r.documentId, title: parsed.data.title, entryYear: parsed.data.entryYear, body });
      ctx.counters.rowsInserted = 1;
    },
    { trigger: `upload:user:${user.id}` },
  );
  // Close any matching "manual upload needed" task.
  await db()
    .update(schema.adminReviewTasks)
    .set({ status: "resolved", resolvedBy: user.id, resolvedAt: new Date(), resolutionNote: `Uploaded as document ${documentId}` })
    .where(and(eq(schema.adminReviewTasks.type, "missing_field"), eq(schema.adminReviewTasks.schoolId, parsed.data.schoolId), eq(schema.adminReviewTasks.status, "open")));
  await audit(user.id, "upload_document", "source_document", documentId, { title: parsed.data.title });
  redirect("/admin/review");
}

export async function runIngestionJob(form: FormData) {
  const user = await requireRole(["admin"]);
  const job = String(form.get("job") ?? "");
  const def = JOBS[job];
  if (!def) redirect("/admin?error=job");
  await audit(user.id, "run_job", "ingestion_job", job);
  // Long-running: start it and return immediately; progress appears on the runs page.
  void def.run(`admin:${user.id}`);
  redirect("/admin/runs");
}

const schoolEdit = z.object({
  schoolId: z.coerce.number().int().positive(),
  selectivity: z.enum(["fully_selective", "partially_selective", "selective_stream", "non_selective"]),
  admissionsUrl: z.union([z.url().max(1000), z.literal("")]),
  reason: z.string().trim().min(5).max(1000),
});

/** Manual corrections are audited and recorded as change events. */
export async function updateSchool(form: FormData) {
  const user = await requireRole(["admin", "editor"]);
  const parsed = schoolEdit.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/admin/schools?error=invalid`);
  const { schoolId, selectivity, admissionsUrl, reason } = parsed.data;
  const before = await db().query.schools.findFirst({ where: eq(schema.schools.id, schoolId) });
  if (!before) redirect("/admin/schools");
  if (before.selectivity !== selectivity) {
    await db().update(schema.schools).set({ selectivity, verificationStatus: "officially_verified", sourceLocator: `Editor correction: ${reason}`, updatedAt: new Date() }).where(eq(schema.schools.id, schoolId));
    await db().insert(schema.changeEvents).values({ schoolId, entity: "school", field: "selectivity", oldValue: before.selectivity, newValue: selectivity });
  }
  await db()
    .insert(schema.schoolContacts)
    .values({ schoolId, admissionsUrl: admissionsUrl || null })
    .onConflictDoUpdate({ target: schema.schoolContacts.schoolId, set: { admissionsUrl: admissionsUrl || null } });
  await audit(user.id, "update_school", "school", schoolId, { selectivity, admissionsUrl, reason });
  revalidatePath(`/schools/${before.slug}`);
  redirect(`/admin/schools?q=${encodeURIComponent(before.name)}&saved=1`);
}
