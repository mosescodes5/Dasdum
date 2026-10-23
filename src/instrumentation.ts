// Runs once when the server process starts (not during `next build`).
//
// On cPanel the host stops an idle Node app and boots it again on the next
// visit, so that visitor used to pay for the app starting AND for the first
// database queries. This warms the database connection and the in-memory
// cache in the background right at startup — it never delays or blocks the
// server, and if the database is unreachable it just stays quiet.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  void (async () => {
    try {
      const catalog = await import("@/lib/db/catalog");
      const { getSiteContent } = await import("@/lib/site-content");
      await Promise.all([
        catalog.getPublishedProducts(),
        catalog.getCategories(),
        catalog.getHeroContent(),
        catalog.getBrandStoryImageUrl(),
        catalog.getUnitsSoldByProduct(),
        getSiteContent(),
      ]);
    } catch {
      // Not fatal: the first real visit will load the data instead.
    }
  })();
}
