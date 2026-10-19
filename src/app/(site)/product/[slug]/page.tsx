import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedProductBySlug, getPublishedProducts } from "@/lib/db/catalog";
import { ImageGallery } from "@/components/products/ImageGallery";
import { PurchasePanel } from "@/components/products/PurchasePanel";
import { ProductTabs } from "@/components/products/ProductTabs";
import { ProductCard } from "@/components/products/ProductCard";
import { getCurrency, fromMinor, minorDigits } from "@/lib/currency";

// Reads live MySQL data — see the note in src/app/(site)/page.tsx.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return {};
  // The admin's SEO fields win; the product's own name / short description
  // are the fallback. (The site template appends " | DASDUM" to the title.)
  const title = product.seoTitle?.trim() || product.name;
  const description = product.seoDescription?.trim() || product.shortDescription || undefined;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  const related = product.categorySlug
    ? (await getPublishedProducts())
        .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
        .slice(0, 4)
    : [];

  // No aggregateRating here: reviews aren't modeled, and structured data
  // claiming ratings that don't exist is worse than leaving it out.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? undefined,
    sku: product.id,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: getCurrency(),
      price: fromMinor(product.salePrice ?? product.price).toFixed(minorDigits()),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-editorial py-10 pb-24 sm:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/shop" className="hover:text-text">Shop</Link>
        {product.categorySlug && product.categoryName && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/shop/${product.categorySlug}`} className="hover:text-text">
              {product.categoryName}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-text">{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <ImageGallery
          images={[product.imageUrl, ...(product.galleryImageUrls ?? [])].filter(
            (url): url is string => Boolean(url)
          )}
        />

        <div>
          <h1 className="font-display text-3xl text-primary-deep">{product.name}</h1>
          {product.shortDescription && (
            <p className="mt-2 text-sm text-muted">{product.shortDescription}</p>
          )}
          <PurchasePanel product={product} />
        </div>
      </div>

      <ProductTabs description={product.description} />

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl text-primary-deep">You may also like</h2>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
