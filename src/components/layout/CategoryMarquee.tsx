import Link from "next/link";

/** Slow-scrolling strip of the shop's real category names, shown under the
 * hero. Pure CSS (transform only) and it pauses on hover; with fewer than
 * two categories it isn't shown at all. */
export function CategoryMarquee({ categories }: { categories: { name: string; href: string }[] }) {
  if (categories.length < 2) return null;
  // Repeat the list until one copy is wide enough, then render two copies so
  // the loop is seamless (the track slides left by exactly one copy).
  const repeats = Math.max(1, Math.ceil(8 / categories.length));
  const one = Array.from({ length: repeats }).flatMap(() => categories);

  return (
    <div className="marquee overflow-hidden bg-primary-deep py-3.5 text-white" aria-label="Shop categories">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
            {one.map((c, i) => (
              <li key={`${copy}-${i}`} className="flex items-center">
                <Link
                  href={c.href}
                  tabIndex={copy === 1 ? -1 : undefined}
                  className="px-6 text-[0.78rem] font-bold uppercase tracking-[0.14em] transition-colors hover:text-gold-light"
                >
                  {c.name}
                </Link>
                <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-gold" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
