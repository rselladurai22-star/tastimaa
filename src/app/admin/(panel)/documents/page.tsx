import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { selectableEntryYears } from "@/lib/academic-year";
import { formatDate } from "@/lib/format";
import { uploadDocument } from "@/app/admin/actions";
import { requireRole } from "@/server/auth";

const ERRORS: Record<string, string> = { invalid: "Fill in every field and choose a file.", size: "Files must be under 30 MB.", pdf: "Only PDF files can be uploaded." };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole(["admin", "editor"]);
  const sp = await searchParams;
  const [docs, schools] = await Promise.all([
    db().select({ doc: schema.sourceDocuments, source: schema.sources.key }).from(schema.sourceDocuments).innerJoin(schema.sources, eq(schema.sources.id, schema.sourceDocuments.sourceId)).orderBy(desc(schema.sourceDocuments.retrievedAt)).limit(100),
    db().select({ id: schema.schools.id, name: schema.schools.name }).from(schema.schools).orderBy(asc(schema.schools.name)),
  ]);
  return (
    <div className="grid gap-8">
      <h1 className="text-h2">Documents</h1>
      <div className="rounded-[8px] border border-rule bg-card max-w-2xl p-5">
        <h2 className="font-sans font-semibold">Upload an admissions document</h2>
        <p className="mt-1 text-sm text-ink-2">For documents that can&apos;t be fetched automatically (for example where robots.txt disallows it). Only upload documents published by the admission authority. Text is extracted and a review task created.</p>
        {sp.error ? <p className="mt-2 text-sm text-bad">{ERRORS[sp.error] ?? "Upload failed."}</p> : null}
        <form action={uploadDocument} className="mt-4 grid gap-3 text-sm">
          <label className="grid gap-1">
            School
            <select name="schoolId" required className="min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none">
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            Entry year (September)
            <select name="entryYear" className="min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none">
              {selectableEntryYears().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            Title
            <input name="title" required minLength={5} className="min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none" placeholder="e.g. Pate's Grammar School Admissions Policy 2027 Entry" />
          </label>
          <label className="grid gap-1">
            Official URL where it is published
            <input name="url" type="url" required className="min-h-11 w-full rounded-[5px] border border-control bg-card px-3 text-ink focus:border-green focus:outline-none" />
          </label>
          <label className="grid gap-1">
            PDF file
            <input name="file" type="file" accept="application/pdf" required />
          </label>
          <button type="submit" className="justify-self-start rounded-[5px] bg-green px-4 py-2 font-semibold text-paper">Upload and extract</button>
        </form>
      </div>
      <div className="relative overflow-x-auto rounded-[8px] border border-rule bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-ink bg-paper text-left font-mono text-[0.72rem] tracking-[0.06em] text-ink-2 uppercase">
            <tr>
              {["Title", "Source", "Retrieved", "Status", "Size"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {docs.map(({ doc, source }) => (
              <tr key={doc.id}>
                <td className="px-3 py-2"><a className="a" href={doc.url} target="_blank" rel="noopener noreferrer">{doc.title}</a></td>
                <td className="px-3 py-2 font-mono text-xs">{source}</td>
                <td className="px-3 py-2 text-xs">{formatDate(doc.retrievedAt)}</td>
                <td className="px-3 py-2 text-xs">{doc.status}</td>
                <td className="px-3 py-2 text-xs num">{doc.byteSize ? `${Math.round(doc.byteSize / 1024)} KB` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
