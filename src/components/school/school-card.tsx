import Link from "next/link";
import { MapPin } from "lucide-react";
import { CATCHMENT_LABEL, GENDER_LABEL, SELECTIVITY_SHORT } from "@/domain/labels";
import { formatMiles, relativeAge } from "@/lib/format";
import type { SchoolListItem } from "@/server/schools";
import { Pill } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/verification";
import { SaveButton } from "./shortlist";

export function SchoolCard({ s, locationPrecision }: { s: SchoolListItem; locationPrecision?: "postcode_centroid" | "postcode_district" }) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg leading-snug font-semibold">
            <Link href={`/schools/${s.slug}`} className="after:absolute after:inset-0 after:rounded-xl hover:underline">
              {s.name}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-2">
            <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-3" />
            <span className="truncate">{[s.town, s.laName].filter(Boolean).join(", ") || "Location not recorded"}</span>
          </p>
        </div>
        {s.distanceMiles !== null ? (
          <p className="shrink-0 text-right text-sm font-semibold text-ink tabular" title={locationPrecision === "postcode_district" ? "Straight-line distance from the centre of the postcode district" : "Straight-line distance from your postcode's centre point"}>
            {formatMiles(s.distanceMiles)}
            <span className="block text-[11px] font-normal text-ink-3">straight line</span>
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill>{SELECTIVITY_SHORT[s.selectivity]}</Pill>
        <Pill>{GENDER_LABEL[s.gender]}</Pill>
        {s.hasSixthForm ? <Pill>Sixth form</Pill> : null}
        {s.boarding === "boarding" ? <Pill>Boarding</Pill> : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-ink-3">Entrance test</dt>
          <dd className="font-medium text-ink">{s.testNames?.length ? s.testNames.join(", ") : <span className="text-ink-3">Not yet recorded</span>}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Catchment</dt>
          <dd className="font-medium text-ink">{s.catchmentType ? CATCHMENT_LABEL[s.catchmentType] : <span className="text-ink-3">Not yet recorded</span>}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Attainment 8</dt>
          <dd className="font-medium text-ink tabular">
            {s.attainment8 !== null ? (
              <>
                {s.attainment8.toFixed(1)} <span className="text-xs font-normal text-ink-3">({s.attainment8Year})</span>
              </>
            ) : (
              <span className="text-ink-3">Not published</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">A level average</dt>
          <dd className="font-medium text-ink tabular">
            {s.alevelGrade ? (
              <>
                {s.alevelGrade} <span className="text-xs font-normal text-ink-3">({s.alevelYear})</span>
              </>
            ) : (
              <span className="text-ink-3">Not published</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="flex items-center gap-1.5 text-xs text-ink-3">
          {s.policyStatus === "awaiting_verification" ? <VerificationBadge status="awaiting_verification" /> : null}
          Checked {relativeAge(s.lastCheckedAt)}
        </span>
        <SaveButton slug={s.slug} name={s.name} className="!px-2.5 !py-1.5 text-xs" />
      </div>
    </article>
  );
}
