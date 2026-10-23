// Instant skeleton for the shop: header band + a grid of card outlines.
export default function ShopLoading() {
  return (
    <div aria-hidden="true">
      <div className="load-bar" />
      <section className="bg-soft">
        <div className="container-editorial py-10 md:py-14">
          <div className="skeleton-pulse h-3 w-20 rounded bg-soft2" />
          <div className="skeleton-pulse mt-4 h-10 w-64 max-w-full rounded bg-soft2" />
          <div className="mt-6 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-pulse h-8 w-24 rounded-full bg-soft2" />
            ))}
          </div>
        </div>
      </section>
      <div className="container-editorial py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[220px_1fr]">
          <div className="hidden space-y-3 md:block">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-pulse h-4 w-32 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-hairline">
                <div className="skeleton-pulse aspect-square" />
                <div className="space-y-3 p-4">
                  <div className="skeleton-pulse h-4 w-3/4 rounded" />
                  <div className="skeleton-pulse h-5 w-1/3 rounded" />
                  <div className="skeleton-pulse h-9 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
