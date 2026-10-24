import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { selectableEntryYears } from "@/lib/academic-year";
import { formatDate } from "@/lib/format";
import { uploadDocument } from "@/app/admin/actions";
import { Card } from "@/components/ui/primitives";

const ERRORS: Record<string, string> = { invalid: "Fill in every field and choose a file.", size: "Files must be under 30 MB.", pdf: "Only PDF files can be uploaded." };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const [docs, schools] = await Promise.all([
    db().select({ doc: schema.sourceDocuments, source: schema.sources.key }).from(schema.sourceDocuments).innerJoin(schema.sources, eq(schema.sources.id, schema.sourceDocuments.sourceId)).orderBy(desc(schema.sourceDocuments.retrievedAt)).limit(100),
    db().select({ id: schema.schools.id, name: schema.schools.name }).from(schema.schools).orderBy(asc(schema.schools.name)),
  ]);
  return (
    <div className="grid gap-8">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <Card className="max-w-2xl p-5">
        <h2 className="font-sans font-semibold">Upload an admissions document</h2>
        <p className="mt-1 text-sm text-ink-2">For documents that can&apos;t be fetched automatically (for example where robots.txt disallows it). Only upload documents published by the admission authority. Text is extracted and a review task created.</p>
        {sp.error ? <p className="mt-2 text-sm text-bad">{ERRORS[sp.error] ?? "Upload failed."}</p> : null}
        <form action={uploadDocument} className="mt-4 grid gap-3 text-sm">
          <label className="grid gap-1">
            School
            <select name="schoolId" required className="rounded-lg border border-line-strong bg-surface px-3 py-2">
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            Entry year (September)
            <select name="entryYear" className="rounded-lg border border-line-strong bg-surface px-3 py-2">
              {selectableEntryYears().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            Title
            <input name="title" required minLength={5} className="rounded-lg border border-line-strong bg-surface px-3 py-2" placeholder="e.g. Pate's Grammar School Admissions Policy 2027 Entry" />
          </label>
          <label className="grid gap-1">
            Official URL where it is published
            <input name="url" type="url" required className="rounded-lg border border-line-strong bg-surface px-3 py-2" />
          </label>
          <label className="grid gap-1">
            PDF file
            <input name="file" type="file" accept="application/pdf" required />
          </label>
          <button type="submit" className="justify-self-start rounded-lg bg-accent px-4 py-2 font-semibold text-white dark:text-[#0f1112]">Upload and extract</button>
        </form>
      </Card>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line bg-surface-2 text-left text-xs text-ink-3">
            <tr>
              {["Title", "Source", "Retrieved", "Status", "Size"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {docs.map(({ doc, source }) => (
              <tr key={doc.id}>
                <td className="px-3 py-2"><a className="link" href={doc.url} target="_blank" rel="noopener noreferrer">{doc.title}</a></td>
                <td className="px-3 py-2 font-mono text-xs">{source}</td>
                <td className="px-3 py-2 text-xs">{formatDate(doc.retrievedAt)}</td>
                <td className="px-3 py-2 text-xs">{doc.status}</td>
                <td className="px-3 py-2 text-xs tabular">{doc.byteSize ? `${Math.round(doc.byteSize / 1024)} KB` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
