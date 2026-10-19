import { Hero } from "@/components/hero/Hero";
import { Marquee } from "@/components/layout/Marquee";
import { CategoryTile } from "@/components/categories/CategoryTile";
import { ProductCard } from "@/components/products/ProductCard";
import { Banners } from "@/components/layout/Banners";
import { StoryValues } from "@/components/layout/StoryValues";
import { JournalPreview, Newsletter } from "@/components/layout/SocialProof";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getPublishedProducts,
  getCategories,
  getHeroContent,
  getBrandStoryImageUrl,
  getBestSellers,
  getLatestJournalPosts,
} from "@/lib/db/catalog";
import { getSiteContent } from "@/lib/site-content";
import { freeShippingThreshold } from "@/lib/shipping";
import { formatMoney } from "@/lib/currency";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Designed with purpose. Made for today.",
};

// Reads live MySQL data — the database is only reachable at request time
// on the server, not during `next build`, so this can't be statically
// prerendered.
export const dynamic = "force-dynamic";

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-[0.95rem] tracking-[0.04em]">{title}</h2>
      <Link href={href} className="group inline-flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.06em] hover:text-gold-text">
        {linkLabel} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

// Every section below renders only from real database rows. A section with
// nothing to show is left out entirely — there is no demo content standing
// in for it.
export default async function HomePage() {
  const [products, categories, hero, brandStoryImageUrl, bestSellers, journalPosts, content] = await Promise.all([
    getPublishedProducts(),
    getCategories(),
    getHeroContent(),
    getBrandStoryImageUrl(),
    getBestSellers(4),
    getLatestJournalPosts(3),
    getSiteContent(),
  ]);
  const featured = products.slice(0, 4); // newest first
  const threshold = freeShippingThreshold();
  const hasSale = products.some((p) => typeof p.salePrice === "number" && p.salePrice < p.price);

  return (
    <>
      <Hero
        content={hero}
        imageUrl={hero.imageUrl}
        tagline={content.brandStory.tagline}
        freeShippingText={threshold ? `On orders over ${formatMoney(threshold)}` : null}
      />
      <Marquee items={content.whyDasdum.pillars.map((p) => p.title)} />

      {categories.length > 0 && (
        <section className="py-10">
          <div className="container-editorial">
            <Reveal>
              <h2 className="mb-6 text-center text-[0.95rem] tracking-[0.06em]">Browse by category</h2>
            </Reveal>
            <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
              {categories.map((c) => (
                <StaggerItem key={c.slug}>
                  <CategoryTile name={c.name} href={c.href} imageUrl={c.imageUrl} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="pb-10 pt-2">
          <div className="container-editorial">
            <Reveal>
              <SectionHeader title="New arrivals" href="/shop?sort=newest" linkLabel="View all products" />
            </Reveal>
            <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {featured.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      <section className="pb-10 pt-2">
        <Reveal>
          <Banners freeShippingThreshold={threshold} hasSale={hasSale} />
        </Reveal>
      </section>

      {bestSellers.length > 0 && (
        <section className="py-8">
          <div className="container-editorial">
            <Reveal>
              <SectionHeader title="Best sellers" href="/shop?sort=bestselling" linkLabel="Shop best sellers" />
            </Reveal>
            <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {bestSellers.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      <StoryValues content={content} imageUrl={brandStoryImageUrl} />
      <JournalPreview posts={journalPosts} />
      <Newsletter />
    </>
  );
}
