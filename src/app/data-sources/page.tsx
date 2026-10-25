import type { Metadata } from "next";
import { formatDate, formatNumber, relativeAge } from "@/lib/format";
import { dataFreshness } from "@/server/insights";
import { HeroFigures, PageHero } from "@/ui/hero";
import { IconCheck, IconWarning } from "@/ui/icons";
import { ExternalLink, Page } from "@/ui/kit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Data sources and freshness",
  description: "Every data source we use, its licence, how often it refreshes and when it was last updated.",
  alternates: { canonical: "/data-sources" },
};

function RunStatus({ status }: { status: string | null }) {
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-bad-wash px-2.5 py-1 text-[0.875rem] font-semibold text-bad">
        <IconWarning size={15} /> Failed — previous data kept
      </span>
    );
  if (status === "partial")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-pend-wash px-2.5 py-1 text-[0.875rem] font-semibold text-pend">
        <IconWarning size={15} /> Completed with warnings
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-wash px-2.5 py-1 text-[0.875rem] font-semibold text-ok">
      <IconCheck size={15} /> Succeeded
    </span>
  );
}

export default async function DataSourcesPage() {
  const rows = await dataFreshness();
  const healthy = rows.filter((r) => r.last_status !== "failed").length;
  const latest = rows
    .map((r) => r.last_success)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  return (
    <>
      <PageHero
        crumbs={[{ href: "/data-sources", label: "Data sources" }]}
        kicker="Dates & data"
        title="Data sources and freshness"
        lede="Live status of every import. If a refresh fails, the previous data stays in place and an administrator is alerted."
        aside={
          <HeroFigures
            items={[
              [rows.length, "official sources"],
              [`${healthy} of ${rows.length}`, "refreshed without failure"],
            ]}
            footer={latest ? <>Most recent refresh {relativeAge(latest)}.</> : null}
          />
        }
      />
      <Page className="pt-4 pb-12">
        <ol className="grid gap-4">
          {rows.map((r, i) => (
            <li key={r.job} className="grid gap-x-8 gap-y-3 rounded-[16px] bg-card p-5 shadow-[0_0_0_1px_var(--rule)] md:grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,13rem)] md:p-6">
              <span className="font-mono text-[0.85rem] text-ink-2">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h2 className="text-[1.1875rem] leading-snug font-semibold">
                  {r.homepage_url?.startsWith("http") ? <ExternalLink href={r.homepage_url} className="text-ink">{r.source_name ?? r.job}</ExternalLink> : (r.source_name ?? r.job)}
                </h2>
                <p className="mt-1 text-[0.98rem] text-ink-2">{r.description}</p>
              </div>
              <dl className="grid content-start gap-2 text-[0.95rem]">
                <div>
                  <dt className="label text-[0.72rem]">Licence</dt>
                  <dd className="text-ink">{r.licence ?? "—"}</dd>
                </div>
                <div>
                  <dt className="label text-[0.72rem]">Schedule</dt>
                  <dd className="font-mono text-[0.85rem] text-ink-2">{r.schedule}</dd>
                </div>
              </dl>
              <div className="grid content-start gap-2">
                <RunStatus status={r.last_status} />
                <p className="text-[0.95rem] text-ink">
                  {r.last_success ? (
                    <>
                      Refreshed {relativeAge(r.last_success)}
                      <span className="block text-small text-ink-2">{formatDate(r.last_success)}</span>
                    </>
                  ) : (
                    "Never refreshed"
                  )}
                </p>
                {r.rows_read ? <p className="font-mono text-[0.8rem] text-ink-2">{formatNumber(r.rows_read)} rows read</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </Page>
    </>
  );
}
