import { ilike } from "drizzle-orm";
import { db, schema } from "@/db";
import { updateSchool } from "@/app/admin/actions";
import { Card } from "@/components/ui/primitives";

export default async function AdminSchools({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const rows = q ? await db().select().from(schema.schools).where(ilike(schema.schools.name, `%${q.replace(/[%_]/g, "")}%`)).limit(10) : [];
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Schools</h1>
      <p className="max-w-3xl text-sm text-ink-2">Most fields come from official datasets and are overwritten on the next import. Edit only what the official datasets don&apos;t carry, and always give a reason — it is recorded in the audit log and as a change event.</p>
      {sp.saved ? <p className="text-sm text-ok">Saved.</p> : null}
      <form className="flex gap-2">
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="School name" className="w-80 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm" />
        <button className="rounded-lg border border-line-strong px-3 py-2 text-sm">Search</button>
      </form>
      {rows.map((s) => (
        <Card key={s.id} className="p-5">
          <p className="font-semibold">{s.name} <span className="font-mono text-xs text-ink-3">{s.slug}</span></p>
          <form action={updateSchool} className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <input type="hidden" name="schoolId" value={s.id} />
            <label className="grid gap-1">
              Selectivity
              <select name="selectivity" defaultValue={s.selectivity} className="rounded-lg border border-line-strong bg-surface px-3 py-2">
                {schema.selectivityEnum.enumValues.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              Admissions page URL
              <input name="admissionsUrl" type="url" className="rounded-lg border border-line-strong bg-surface px-3 py-2" />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              Reason and evidence (required)
              <input name="reason" required minLength={5} className="rounded-lg border border-line-strong bg-surface px-3 py-2" />
            </label>
            <button className="justify-self-start rounded-lg bg-accent px-4 py-2 font-semibold text-white dark:text-[#0f1112]">Save</button>
          </form>
        </Card>
      ))}
    </div>
  );
}
