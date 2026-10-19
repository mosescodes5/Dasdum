import { getPublishedProducts, getCategories, getUnitsSoldByProduct } from "@/lib/db/catalog";
import { ProductCard } from "@/components/products/ProductCard";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { FilterPanel } from "@/components/products/FilterPanel";
import { MobileFilterDrawer } from "@/components/products/MobileFilterDrawer";
import { SortSelect } from "@/components/products/SortSelect";
import { ViewToggle } from "@/components/products/ViewToggle";

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

  const page = Math.max(1, Number(params.page ?? "1"));
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const view = params.view === "list" ? "list" : "grid";

  const categoryLabel = params.category
    ? categories.find((c) => c.slug === params.category)?.name ?? "Shop"
    : "All products";

  return (
    <div className="container-editorial py-12">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl text-primary-deep">{categoryLabel}</h1>
        <p className="mt-2 text-muted text-sm">
          {items.length} {items.length === 1 ? "product" : "products"}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <aside className="hidden md:block">
          <FilterPanel searchParams={params} categories={categories} />
        </aside>

        <div>
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-hairline">
            <MobileFilterDrawer>
              <FilterPanel searchParams={params} categories={categories} />
            </MobileFilterDrawer>
            <div className="flex items-center gap-3 ml-auto">
              <ViewToggle />
              <SortSelect />
            </div>
          </div>

          {pageItems.length === 0 ? (
            <div className="py-24 text-center text-muted">
              {allProducts.length === 0
                ? "Our collection is being prepared — check back soon."
                : "No products match those filters — try widening your search."}
            </div>
          ) : (
            <Stagger
              className={
                view === "grid"
                  ? "mt-8 grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8"
                  : "mt-8 flex flex-col gap-8"
              }
            >
              {pageItems.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </Stagger>
          )}

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                const isActive = n === page;
                const qp = new URLSearchParams(
                  Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
                );
                qp.set("page", String(n));
                return (
                  <a
                    key={n}
                    href={`/shop?${qp.toString()}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`h-9 w-9 flex items-center justify-center text-sm border ${
                      isActive ? "border-primary-deep bg-primary-deep text-bg" : "border-hairline hover:border-gold"
                    }`}
                  >
                    {n}
                  </a>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
