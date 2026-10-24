/**
 * Small editorial glyphs for the parent questions. Line art on a 48-unit grid,
 * evergreen with a single copper accent each.
 */
const base = { width: 48, height: 48, viewBox: "0 0 48 48", "aria-hidden": true, focusable: "false" } as const;
const g = { fill: "none", stroke: "var(--green)", strokeWidth: 1.6 } as const;
const c = { fill: "none", stroke: "var(--copper)", strokeWidth: 1.8 } as const;

export function GlyphNearMe() {
  return (
    <svg {...base}>
      <circle cx="24" cy="24" r="17" style={{ ...g, strokeDasharray: "2 4" }} />
      <circle cx="24" cy="24" r="10" style={{ ...g, strokeDasharray: "2 4" }} />
      <path d="M24 33s7-6.3 7-11.6a7 7 0 0 0-14 0C17 26.7 24 33 24 33Z" style={{ ...g, fill: "var(--card)" }} />
      <circle cx="24" cy="21.5" r="2.4" style={{ fill: "var(--copper)" }} />
    </svg>
  );
}
export function GlyphCriteria() {
  return (
    <svg {...base}>
      {[12, 22, 32].map((y, i) => (
        <g key={y}>
          <rect x="9" y={y - 4} width="8" height="8" rx="1" style={i === 0 ? { fill: "var(--copper)", stroke: "var(--copper)" } : g} />
          <path d={`M21 ${y}h18`} style={g} />
        </g>
      ))}
      <path d="m10.5 12 2 2 3.5-3.6" style={{ fill: "none", stroke: "var(--card)", strokeWidth: 1.6 }} />
    </svg>
  );
}
export function GlyphCatchment() {
  return (
    <svg {...base}>
      <path d="M10 18c4-8 18-11 26-5s5 18-3 22-19 3-23-5-4-6 0-12Z" style={{ ...g, strokeDasharray: "4 3" }} />
      <path d="M19 27l5-5 5 5v6H19Z" style={{ ...g, fill: "var(--card)" }} />
      <path d="M38 37l-3-3v6Z" style={{ fill: "var(--copper)" }} />
      <path d="M34 35h-5" style={c} />
    </svg>
  );
}
export function GlyphExam() {
  return (
    <svg {...base}>
      <path d="M13 7h16l7 7v27H13Z" style={{ ...g, fill: "var(--card)" }} />
      <path d="M29 7v7h7" style={g} />
      <path d="M18 21h13M18 27h13M18 33h7" style={g} />
      <circle cx="33" cy="35" r="5" style={{ ...c, fill: "var(--copper-wash)" }} />
    </svg>
  );
}
export function GlyphAfterPassing() {
  return (
    <svg {...base}>
      <path d="M8 12h12" style={c} />
      <path d="M14 8v8" style={c} />
      <path d="M20 12h8l6 6" style={{ ...g, strokeDasharray: "2 3" }} />
      {[22, 29, 36].map((y) => (
        <path key={y} d={`M24 ${y}h16`} style={g} />
      ))}
      <path d="M24 18v22M40 18v22" style={g} />
    </svg>
  );
}
export function GlyphWhen() {
  return (
    <svg {...base}>
      <rect x="9" y="12" width="30" height="27" rx="2" style={{ ...g, fill: "var(--card)" }} />
      <path d="M9 19h30M17 8v7M31 8v7" style={g} />
      <rect x="25" y="25" width="8" height="7" style={{ fill: "var(--copper)" }} />
    </svg>
  );
}
