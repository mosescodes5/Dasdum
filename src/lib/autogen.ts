// Auto-generated product fields for the admin form. Pure functions (no
// database, no browser APIs) so both the form and the server can use them.
// The text drafts are deliberately plain and factual — they only use what
// the admin has already entered (name, category). They are a starting
// point to be edited, not a substitute for real product details.

/** "Cotton Tote & Bag!" -> "cotton-tote-and-bag" (a-z, 0-9 and hyphens only). */
export function slugify(input: string, max = 80): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents: é -> e
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/** First three letters of the category, e.g. "Bags & Travel" -> "BAG". */
export function skuPrefix(categoryName?: string | null): string {
  const letters = (categoryName ?? "").normalize("NFKD").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return letters.length >= 2 ? letters.slice(0, 3) : "PRD";
}

/** Cuts at a word boundary and adds "…" only if something was removed. */
export function truncate(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, "") + "…";
}

export function draftShortDescription(name: string, categoryName?: string | null): string {
  return truncate(categoryName ? `${name} from the DASDUM ${categoryName} collection.` : `${name} from DASDUM.`, 200);
}

export function draftDescription(name: string, categoryName?: string | null): string {
  const where = categoryName ? `the DASDUM ${categoryName} collection` : "the DASDUM collection";
  return `${name} is part of ${where}: designed with purpose and made for today. Quality first, trend second.`;
}

// The site adds " | DASDUM" to every page title itself, so the SEO title
// must not repeat the brand.
export function draftSeoTitle(name: string, categoryName?: string | null): string {
  const withCategory = categoryName ? `${name} – ${categoryName}` : name;
  return truncate(withCategory.length <= 60 ? withCategory : name, 60);
}

export function draftSeoDescription(name: string, categoryName?: string | null, shortDescription?: string): string {
  const base = shortDescription?.trim() || draftShortDescription(name, categoryName);
  const withTagline = `${base} Quality first, trend second.`;
  return truncate(withTagline.length <= 160 ? withTagline : base, 160);
}
