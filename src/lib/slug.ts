/** URL-safe slug: lower-case ASCII words joined by hyphens. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Pick the first slug candidate not already taken. */
export function uniqueSlug(candidates: string[], taken: Set<string>): string {
  for (const c of candidates) {
    const s = slugify(c);
    if (s && !taken.has(s)) return s;
  }
  const base = slugify(candidates[0] ?? "school") || "school";
  for (let i = 2; ; i++) {
    const s = `${base}-${i}`;
    if (!taken.has(s)) return s;
  }
}
