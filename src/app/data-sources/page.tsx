import type { Metadata } from "next";
import { formatDate, relativeAge } from "@/lib/format";
import { dataFreshness } from "@/server/insights";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data sources and freshness",
  description: "Every data source we use, its licence, how often it refreshes and when it was last updated.",
  alternates: { canonical: "/data-sources" },
};

export default async function DataSourcesPage() {
  const rows = await dataFreshness();
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ href: "/data-sources", label: "Data sources" }]} />
      <header className="mt-4 mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Data sources and freshness</h1>
        <p className="mt-3 text-lg text-ink-2">Live status of every import. If a refresh fails, the previous data stays in place and an administrator is alerted.</p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Data sources</caption>
          <thead className="border-b border-line bg-surface-2 text-left text-xs text-ink-3">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Source</th>
              <th scope="col" className="px-4 py-3 font-medium">Licence</th>
              <th scope="col" className="px-4 py-3 font-medium">Schedule</th>
              <th scope="col" className="px-4 py-3 font-medium">Last successful refresh</th>
              <th scope="col" className="px-4 py-3 font-medium">Last run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.job}>
                <td className="px-4 py-3">
                  {r.homepage_url?.startsWith("http") ? (
                    <a href={r.homepage_url} className="link font-medium" target="_blank" rel="noopener noreferrer">
                      {r.source_name}
                    </a>
                  ) : (
                    <span className="font-medium">{r.source_name}</span>
                  )}
                  <span className="block text-xs text-ink-3">{r.description}</span>
                </td>
                <td className="px-4 py-3 text-ink-2">{r.licence}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-2">{r.schedule}</td>
                <td className="px-4 py-3 text-ink-2">
                  {r.last_success ? `${formatDate(r.last_success)} (${relativeAge(r.last_success)})` : "Never"}
                </td>
                <td className="px-4 py-3 text-xs">{r.last_status === "failed" ? <span className="text-bad">Failed</span> : r.last_status === "partial" ? <span className="text-warn">Completed with warnings</span> : <span className="text-ok">Succeeded</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Container>
  );
}
