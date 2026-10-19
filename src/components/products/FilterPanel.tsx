import Link from "next/link";
import { formatMoney, toMinor } from "@/lib/currency";

// Two breakpoints from .env (major units, comma-separated) become three
// price bands: under the first, between the two, and over the second.
function priceBands(): { label: string; min: number; max?: number }[] {
  const raw = process.env.NEXT_PUBLIC_PRICE_BREAKPOINTS ?? "";
  const points = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (points.length < 2) return [];
  const [low, high] = points;
  const lowMinor = toMinor(low);
  const highMinor = toMinor(high);
  return [
    { label: `Under ${formatMoney(lowMinor)}`, min: 0, max: lowMinor },
    { label: `${formatMoney(lowMinor)} – ${formatMoney(highMinor)}`, min: lowMinor + 1, max: highMinor },
    { label: `Over ${formatMoney(highMinor)}`, min: highMinor + 1, max: undefined },
  ];
}

function buildHref(current: URLSearchParams, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  }
  return `/shop?${params.toString()}`;
}

export function FilterPanel({
  searchParams,
  categories,
}: {
  searchParams: Record<string, string | undefined>;
  categories: { slug: string; name: string }[];
}) {
  const current = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  );
  const activeCategory = searchParams.category;
  const activeMin = searchParams.min;
  const activeAvailability = searchParams.availability;
  const PRICE_BANDS = priceBands();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium text-primary-deep">Category</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link
              href={buildHref(current, { category: undefined })}
              className={!activeCategory ? "text-primary-deep font-medium" : "text-muted hover:text-text"}
            >
              All products
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={buildHref(current, { category: c.slug })}
                className={activeCategory === c.slug ? "text-primary-deep font-medium" : "text-muted hover:text-text"}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium text-primary-deep">Price</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link
              href={buildHref(current, { min: undefined, max: undefined })}
              className={!activeMin ? "text-primary-deep font-medium" : "text-muted hover:text-text"}
            >
              Any price
            </Link>
          </li>
          {PRICE_BANDS.map((band) => (
            <li key={band.label}>
              <Link
                href={buildHref(current, {
                  min: String(band.min),
                  max: band.max !== undefined ? String(band.max) : undefined,
                })}
                className={activeMin === String(band.min) ? "text-primary-deep font-medium" : "text-muted hover:text-text"}
              >
                {band.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium text-primary-deep">Availability</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link
              href={buildHref(current, { availability: undefined })}
              className={!activeAvailability ? "text-primary-deep font-medium" : "text-muted hover:text-text"}
            >
              All
            </Link>
          </li>
          <li>
            <Link
              href={buildHref(current, { availability: "in-stock" })}
              className={activeAvailability === "in-stock" ? "text-primary-deep font-medium" : "text-muted hover:text-text"}
            >
              In stock only
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
