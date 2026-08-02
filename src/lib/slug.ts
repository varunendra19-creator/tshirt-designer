// Slug helpers. Product ids in the catalog are already unique slugs, but this
// keeps slug generation consistent for future dynamic products and admin CRUD.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")        // non-alphanumeric → dash
    .replace(/^-+|-+$/g, "")            // trim dashes
    .slice(0, 80) || "item";
}

/** Ensure uniqueness against a set of existing slugs (appends -2, -3, …). */
export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const set = existing instanceof Set ? existing : new Set(existing);
  const s = slugify(base);
  if (!set.has(s)) return s;
  let n = 2;
  while (set.has(`${s}-${n}`)) n++;
  return `${s}-${n}`;
}
