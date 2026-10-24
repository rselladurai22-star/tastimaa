/**
 * Minimal five-field cron matcher (minute hour day-of-month month day-of-week),
 * evaluated in UTC. Supports `*`, numbers, ranges `a-b`, lists `a,b` and steps
 * `*\/n` or `a-b/n`. Like standard cron, when both day fields are restricted a
 * date matches if either one does.
 */
const FIELDS: [min: number, max: number][] = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];

function parseField(spec: string, [min, max]: [number, number]): Set<number> | null {
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const m = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
    if (!m) return null;
    const step = m[2] ? Number(m[2]) : 1;
    let lo = min;
    let hi = max;
    if (m[1] !== "*") {
      const [a, b] = m[1]!.split("-").map(Number);
      lo = a!;
      hi = b ?? (m[2] ? max : a!);
    }
    if (step < 1 || lo < min || hi > max || lo > hi) return null;
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

export function parseCron(expr: string): Set<number>[] | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const sets = parts.map((p, i) => parseField(p, FIELDS[i]!));
  if (sets.some((s) => !s)) return null;
  // Sunday may be written as 0 or 7.
  if (sets[4]!.has(7)) sets[4]!.add(0);
  return sets as Set<number>[];
}

export function cronMatches(expr: string, at: Date): boolean {
  const sets = parseCron(expr);
  if (!sets) return false;
  const [min, hour, dom, mon, dow] = sets as [Set<number>, Set<number>, Set<number>, Set<number>, Set<number>];
  if (!min.has(at.getUTCMinutes()) || !hour.has(at.getUTCHours()) || !mon.has(at.getUTCMonth() + 1)) return false;
  const [, , domSpec, , dowSpec] = expr.trim().split(/\s+/);
  const domHit = dom.has(at.getUTCDate());
  const dowHit = dow.has(at.getUTCDay());
  if (domSpec !== "*" && dowSpec !== "*") return domHit || dowHit;
  return domHit && dowHit;
}
