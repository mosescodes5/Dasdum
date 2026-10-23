import { getPublishedProducts, getCategories, getUnitsSoldByProduct } from "@/lib/db/catalog";
import { ProductCard } from "@/components/products/ProductCard";
import { FilterPanel } from "@/components/products/FilterPanel";
import { MobileFilterDrawer } from "@/components/products/MobileFilterDrawer";
import { SortSelect } from "@/components/products/SortSelect";
import { ViewToggle } from "@/components/products/ViewToggle";
import Link from "next/link";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { formatMoney } from "@/lib/currency";

const PAGE_SIZE = 8;

export type ShopSearchParams = {
  category?: string;
  min?: string;
  max?: string;
  availability?: string;
  sort?: string;
  view?: string;
  page?: string;
  q?: string;
  sale?: string;
};

/** Shared listing UI for both /shop (query-param category filter) and
 * /shop/[category] (path-based category) — `params.category` is already
 * resolved by the caller before this renders. */
export async function ShopListing({ params }: { params: ShopSearchParams }) {
  const [allProducts, categories] = await Promise.all([getPublishedProducts(), getCategories()]);
  let items = [...allProducts]; // newest first

  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (params.category) {
    items = items.filter((p) => p.categorySlug === params.category);
  }
  if (params.min) {
    const min = Number(params.min);
    items = items.filter((p) => (p.salePrice ?? p.price) >= min);
  }
  if (params.max) {
    const max = Number(params.max);
    items = items.filter((p) => (p.salePrice ?? p.price) <= max);
  }
  if (params.sale === "1") {
    items = items.filter((p) => typeof p.salePrice === "number" && p.salePrice < p.price);
  }
  if (params.availability === "in-stock") {
    items = items.filter((p) => p.inStock);
  }

  switch (params.sort) {
    case "price-asc":
      items.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
      break;
    case "price-desc":
      items.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
      break;
    case "bestselling": {
      const sold = await getUnitsSoldByProduct();
      items.sort((a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0));
      break;
    }
    default:
      break; // "featured" and "newest" — already newest first
  }

  const page = Math.min(Math.max(1, Number(params.page ?? "1") || 1), Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const view = params.view === "list" ? "list" : "grid";

  const categoryLabel = params.category
    ? categories.find((c) => c.slug === params.category)?.name ?? "Shop"
    : "All products";

  // /shop/[category] passes its slug in as params.category; every link built
  // here goes to /shop?category=… so filters behave the same on both routes.
  const hrefWith = (updates: Record<string, string | undefined>) => {
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...updates })) {
      if (v !== undefined && v !== "") qp.set(k, v);
    }
    if (!("page" in updates)) qp.delete("page"); // a filter change starts back at page 1
    const str = qp.toString();
    return str ? `/shop?${str}` : "/shop";
  };

  // What's currently narrowing the list, each with a link that removes it.
  const activeFilters: { label: string; href: string }[] = [];
  if (params.category) activeFilters.push({ label: categoryLabel, href: hrefWith({ category: undefined }) });
  if (params.q) activeFilters.push({ label: `“${params.q}”`, href: hrefWith({ q: undefined }) });
  if (params.min || params.max) {
    const lo = params.min ? formatMoney(Number(params.min)) : null;
    const hi = params.max ? formatMoney(Number(params.max)) : null;
    activeFilters.push({
      label: lo && hi ? `${lo} – ${hi}` : lo ? `Over ${lo}` : `Under ${hi}`,
      href: hrefWith({ min: undefined, max: undefined }),
    });
  }
  if (params.sale === "1") activeFilters.push({ label: "On sale", href: hrefWith({ sale: undefined }) });
  if (params.availability === "in-stock") activeFilters.push({ label: "In stock", href: hrefWith({ availability: undefined }) });

  // Re-key the grid whenever the result set changes so the cards animate in again.
  const gridKey = `${params.category ?? ""}|${params.q ?? ""}|${params.min ?? ""}|${params.max ?? ""}|${params.sale ?? ""}|${params.availability ?? ""}|${params.sort ?? ""}|${view}|${page}`;

  return (
    <div>
      {/* Header band: title rises in, with quick category chips underneath */}
      <section className="bg-soft">
        <div className="container-editorial py-10 md:py-14">
          <p className="anim-fade text-[0.78rem] font-medium uppercase tracking-[0.14em] text-gold-text">The shop</p>
          <h1 className="mt-2 block overflow-hidden pb-[0.1em] text-[clamp(2rem,4.4vw,3.2rem)] text-primary-deep">
            <span className="anim-mask block">{categoryLabel}</span>
          </h1>
          <p style={{ animationDelay: "0.2s" }} className="anim-rise mt-2 text-sm text-muted">
            {items.length} {items.length === 1 ? "product" : "products"}
          </p>

          {categories.length > 0 && (
            <nav
              aria-label="Categories"
              style={{ animationDelay: "0.3s" }}
              className="anim-rise -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {[{ slug: undefined as string | undefined, name: "All" }, ...categories].map((c) => {
                const active = (params.category ?? undefined) === c.slug;
                return (
                  <Link
                    key={c.slug ?? "all"}
                    href={hrefWith({ category: c.slug })}
                    aria-current={active ? "true" : undefined}
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-[0.74rem] font-bold uppercase tracking-[0.08em] transition-colors duration-300 ${
                      active
                        ? "border-primary-deep bg-primary-deep text-white"
                        : "border-primary-deep/25 bg-surface text-primary-deep hover:border-primary-deep"
                    }`}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </section>

      <div className="container-editorial py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[220px_1fr]">
          <aside className="hidden md:block">
            <FilterPanel searchParams={params} categories={categories} />
          </aside>

          <div>
            <div className="flex items-center justify-between gap-4 border-b border-hairline pb-5">
              <MobileFilterDrawer>
                <FilterPanel searchParams={params} categories={categories} />
              </MobileFilterDrawer>
              <div className="ml-auto flex items-center gap-3">
                <ViewToggle />
                <SortSelect />
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-4">
                {activeFilters.map((f) => (
                  <Link
                    key={f.label}
                    href={f.href}
                    aria-label={`Remove filter: ${f.label}`}
                    className="group inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1 text-[0.74rem] font-medium transition-colors hover:bg-soft2"
                  >
                    {f.label}
                    <X size={13} className="transition-transform duration-300 group-hover:rotate-90" />
                  </Link>
                ))}
                {activeFilters.length > 1 && (
                  <Link href="/shop" className="text-[0.74rem] font-bold uppercase tracking-[0.06em] text-gold-text hover:underline">
                    Clear all
                  </Link>
                )}
              </div>
            )}

            {pageItems.length === 0 ? (
              <div className="py-24 text-center text-muted">
                <p>
                  {allProducts.length === 0
                    ? "Our collection is being prepared — check back soon."
                    : "No products match those filters — try widening your search."}
                </p>
                {allProducts.length > 0 && (
                  <Link href="/shop" className="btn mt-6">
                    Clear filters
                  </Link>
                )}
              </div>
            ) : (
              <div
                key={gridKey}
                className={`grid-in ${
                  view === "grid"
                    ? "mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3"
                    : "mt-8 flex flex-col gap-8"
                }`}
              >
                {pageItems.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 3} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={hrefWith({ page: String(page - 1) })}
                    aria-label="Previous page"
                    className="flex h-9 w-9 items-center justify-center border border-hairline transition-colors hover:border-gold"
                  >
                    <ArrowLeft size={15} />
                  </Link>
                )}
                {Array.from({ length: totalPages }).map((_, i) => {
                  const n = i + 1;
                  const isActive = n === page;
                  return (
                    <Link
                      key={n}
                      href={hrefWith({ page: String(n) })}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex h-9 w-9 items-center justify-center border text-sm transition-colors ${
                        isActive ? "border-primary-deep bg-primary-deep text-bg" : "border-hairline hover:border-gold"
                      }`}
                    >
                      {n}
                    </Link>
                  );
                })}
                {page < totalPages && (
                  <Link
                    href={hrefWith({ page: String(page + 1) })}
                    aria-label="Next page"
                    className="flex h-9 w-9 items-center justify-center border border-hairline transition-colors hover:border-gold"
                  >
                    <ArrowRight size={15} />
                  </Link>
                )}
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
