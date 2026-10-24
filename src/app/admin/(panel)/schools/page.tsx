import { ilike } from "drizzle-orm";
import { db, schema } from "@/db";
import { updateSchool } from "@/app/admin/actions";
import { requireRole } from "@/server/auth";

export default async function AdminSchools({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string }> }) {
  await requireRole(["admin", "editor"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const rows = q ? await db().select().from(schema.schools).where(ilike(schema.schools.name, `%${q.replace(/[%_]/g, "")}%`)).limit(10) : [];
  return (
    <div className="grid gap-6">
      <h1 className="text-h2">Schools</h1>
      <p className="max-w-3xl text-sm text-ink-2">Most fields come from official datasets and are overwritten on the next import. Edit only what the official datasets don&apos;t carry, and always give a reason — it is recorded in the audit log and as a change event.</p>
      {sp.saved ? <p className="text-sm text-ok">Saved.</p> : null}
      <form className="flex gap-2">
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="School name" className="w-80 min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none text-sm" />
        <button className="rounded-[5px] border border-control px-3 py-2 text-sm">Search</button>
      </form>
      {rows.map((s) => (
        <div key={s.id} className="rounded-[8px] border border-rule bg-card p-5">
          <p className="font-semibold">{s.name} <span className="font-mono text-xs text-ink-3">{s.slug}</span></p>
          <form action={updateSchool} className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <input type="hidden" name="schoolId" value={s.id} />
            <label className="grid gap-1">
              Selectivity
              <select name="selectivity" defaultValue={s.selectivity} className="min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none">
                {schema.selectivityEnum.enumValues.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              Admissions page URL
              <input name="admissionsUrl" type="url" className="min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none" />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              Reason and evidence (required)
              <input name="reason" required minLength={5} className="min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none" />
            </label>
            <button className="justify-self-start rounded-[5px] bg-green px-4 py-2 font-semibold text-paper">Save</button>
          </form>
        </div>
      ))}
    </div>
  );
}
