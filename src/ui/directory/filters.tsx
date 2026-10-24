import Link from "next/link";
import { clsx } from "clsx";
import { db, schema } from "@/db";
import type { DirectoryParams } from "@/server/search-params";
import { IconPin } from "../icons";
import { Check, controlClass, Select } from "../kit";

export async function testOptions() {
  return db().select({ slug: schema.entranceTests.slug, name: schema.entranceTests.name }).from(schema.entranceTests).orderBy(schema.entranceTests.name);
}

function Group({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-rule pt-4">
      <legend className="label float-left mb-2.5 w-full">{legend}</legend>
      {hint ? <p className="clear-both mb-2 text-small text-ink-2">{hint}</p> : null}
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

/** Toggle chip: a checkbox drawn as a rectangular key. */
function Chip({ name, value, checked, label }: { name: string; value: string; checked: boolean; label: string }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-flex min-h-10 items-center rounded-[4px] border border-control bg-card px-3 text-[0.95rem] text-ink transition-colors duration-[var(--d-1)] peer-checked:border-green peer-checked:bg-green peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green hover:border-ink">
        {label}
      </span>
    </label>
  );
}

/** The filter rail. Rendered twice (mobile sheet and desktop rail), so ids take a per-copy prefix. */
export async function Filters({ p, basePath, lockArea, idPrefix }: { p: DirectoryParams; basePath: string; lockArea: boolean; idPrefix: string }) {
  const fid = (name: string) => `${idPrefix}-${name}`;
  const tests = await testOptions();
  return (
    <form method="get" action={basePath} className="grid gap-5">
      {p.q ? <input type="hidden" name="q" value={p.q} /> : null}
      {p.view ? <input type="hidden" name="view" value={p.view} /> : null}

      <fieldset>
        <legend className="label mb-2.5">Near a postcode</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_6.25rem] gap-2">
          <label htmlFor={fid("postcode")} className="sr-only">
            Postcode
          </label>
          <span className="relative block">
            <IconPin size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
            <input id={fid("postcode")} name="postcode" defaultValue={p.postcode ?? ""} placeholder="e.g. HP21 7RP" autoComplete="postal-code" className={clsx(controlClass, "pl-9 uppercase placeholder:normal-case")} />
          </span>
          <label htmlFor={fid("radius")} className="sr-only">
            Radius
          </label>
          <Select id={fid("radius")} name="radius" defaultValue={String(p.radius ?? 30)} className="px-2.5">
            {[5, 10, 20, 30, 50, 100].map((r) => (
              <option key={r} value={r}>
                {r} mi
              </option>
            ))}
          </Select>
        </div>
        <p className="mt-2 text-small leading-snug text-ink-2">Straight-line from the postcode&apos;s centre — not the method schools use to rank applications.</p>
      </fieldset>

      {!lockArea ? (
        <Group legend="Nation">
          <div className="grid grid-cols-3 overflow-hidden rounded-[5px] border border-control">
            {[
              ["", "All"],
              ["england", "England"],
              ["northern_ireland", "N. Ireland"],
            ].map(([v, l]) => (
              <label key={v} className="cursor-pointer border-r border-control last:border-r-0">
                <input type="radio" name="nation" value={v} defaultChecked={(p.nation ?? "") === v} className="peer sr-only" />
                <span className="flex min-h-10 items-center justify-center bg-card px-1 text-[0.92rem] text-ink transition-colors peer-checked:bg-green peer-checked:font-semibold peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-paper">
                  {l}
                </span>
              </label>
            ))}
          </div>
        </Group>
      ) : null}

      <Group legend="Pupils admitted">
        <div className="flex flex-wrap gap-1.5">
          <Chip name="gender" value="boys" checked={p.gender.includes("boys")} label="Boys" />
          <Chip name="gender" value="girls" checked={p.gender.includes("girls")} label="Girls" />
          <Chip name="gender" value="mixed" checked={p.gender.includes("mixed")} label="Co-educational" />
        </div>
      </Group>

      <Group legend="School">
        <Check name="selectivity" value="fully_selective" defaultChecked={p.selectivity.includes("fully_selective")} label="Grammar (fully selective)" />
        <Check name="selectivity" value="partially_selective" defaultChecked={p.selectivity.includes("partially_selective")} label="Partially selective" />
        <Check name="sixthForm" value="1" defaultChecked={!!p.sixthForm} label="Has a sixth form" />
        <Check name="boarding" value="1" defaultChecked={!!p.boarding} label="Offers boarding" />
      </Group>

      <Group legend="Entrance test">
        <label htmlFor={fid("test")} className="sr-only">
          Entrance test
        </label>
        <Select id={fid("test")} name="test" defaultValue={p.test ?? ""}>
          <option value="">Any test</option>
          {tests.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </Select>
      </Group>

      <Group legend="Admissions rules" hint="Only schools whose policy we hold for the selected year can match.">
        <Check name="outOfArea" value="1" defaultChecked={!!p.outOfArea} label="Admits out-of-area applicants" />
        <Check name="scoreRoute" value="1" defaultChecked={!!p.scoreRoute} label="Published score threshold" />
        <Check name="siblingPriority" value="1" defaultChecked={!!p.siblingPriority} label="Sibling priority" />
        <Check name="history" value="1" defaultChecked={!!p.history} label="Has historical offer data" />
      </Group>

      <Group legend="Order">
        <label htmlFor={fid("sort")} className="sr-only">
          Sort by
        </label>
        <Select id={fid("sort")} name="sort" defaultValue={p.sort ?? ""}>
          <option value="">Best match</option>
          <option value="distance">Distance (needs a postcode)</option>
          <option value="name">Name (A–Z)</option>
          <option value="gcse">Attainment 8 (latest published)</option>
          <option value="alevel">A level points per entry (latest)</option>
        </Select>
      </Group>

      <div className="sticky bottom-0 -mx-1 flex gap-2 border-t border-rule bg-[var(--rail-bg,var(--paper))] px-1 pt-3 pb-1">
        <button type="submit" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[5px] bg-green px-4 font-semibold text-paper transition-colors hover:bg-green-deep active:scale-[0.98]">
          Apply filters
        </button>
        <Link href={basePath} className="inline-flex min-h-11 items-center rounded-[5px] border border-control bg-card px-3.5 font-semibold text-ink no-underline hover:border-ink">
          Reset
        </Link>
      </div>
    </form>
  );
}
