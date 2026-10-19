import { and, eq, asc, desc, sql } from "drizzle-orm";
import { getDb } from "./client";
import { product, category, media, productImage, siteSetting, order, orderItem, blogPost, blogCategory } from "./schema";
import type { Product } from "@/components/products/ProductCard";

export type HeroContent = {
  eyebrow?: string;
  heading: string;
  subheading: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  imageUrl: string | null;
};

const HERO_SETTING_KEY = "homepage_hero";

export const DEFAULT_HERO_CONTENT: HeroContent = {
  heading: "Designed with purpose. Made for today.",
  subheading: "Thoughtful, quality-first essentials for everyday living.",
  primaryCta: { label: "Shop Now", href: "/shop" },
  secondaryCta: { label: "Discover DASDUM", href: "/about" },
  imageUrl: null,
};

/** Current homepage hero content, admin-editable at /admin/settings.
 * Falls back to DEFAULT_HERO_CONTENT (with no image) until an admin saves
 * one — so the homepage never looks broken pre-launch, but also never
 * ships a hardcoded photo. */
export async function getHeroContent(): Promise<HeroContent> {
  const db = await getDb();
  const row = (await db.select().from(siteSetting).where(eq(siteSetting.key, HERO_SETTING_KEY)))[0];
  if (!row) return DEFAULT_HERO_CONTENT;
  try {
    return { ...DEFAULT_HERO_CONTENT, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_HERO_CONTENT;
  }
}

export async function setHeroContent(content: HeroContent): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db
    .insert(siteSetting)
    .values({ key: HERO_SETTING_KEY, value: JSON.stringify(content), updatedAt: now })
    .onDuplicateKeyUpdate({ set: { value: JSON.stringify(content), updatedAt: now } });
}

const BRAND_STORY_SETTING_KEY = "homepage_brand_story";

/** The homepage's "Rooted in craft..." section photo — null until an
 * admin sets one, same no-hardcoded-image approach as the hero. */
export async function getBrandStoryImageUrl(): Promise<string | null> {
  const db = await getDb();
  const row = (await db.select().from(siteSetting).where(eq(siteSetting.key, BRAND_STORY_SETTING_KEY)))[0];
  if (!row) return null;
  try {
    return JSON.parse(row.value).imageUrl ?? null;
  } catch {
    return null;
  }
}

export async function setBrandStoryImageUrl(imageUrl: string | null): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const value = JSON.stringify({ imageUrl });
  await db
    .insert(siteSetting)
    .values({ key: BRAND_STORY_SETTING_KEY, value, updatedAt: now })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: now } });
}

/** Sets one category's photo (shown on the homepage's "Shop by category"
 * cards and the category listing page). mediaId null clears it. */
export async function setCategoryImage(categoryId: string, mediaId: string | null): Promise<void> {
  const db = await getDb();
  await db.update(category).set({ imageMediaId: mediaId }).where(eq(category.id, categoryId));
}

/** Every category with its photo resolved to a URL, for the developer-only
 * Site Images screen — getCategories() above stays lean (name/slug/href
 * only) since the homepage grid doesn't need this join. */
export async function getCategoriesWithImages(): Promise<{ id: string; name: string; imageUrl: string | null }[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: category.id, name: category.name, imageUrl: media.url })
    .from(category)
    .leftJoin(media, eq(category.imageMediaId, media.id))
    .orderBy(asc(category.sortOrder));
  return rows.map((r) => ({ ...r, imageUrl: r.imageUrl ?? null }));
}

// The public storefront (home, shop, product detail, wishlist) renders
// only what is in the database: real, published products joined against
// `category` (for the slug/name) and `media` (for the featured image URL),
// shaped into the `Product` type ProductCard expects. There is no demo
// fallback — an empty catalog renders an honest empty state.
//
// Reviews/ratings aren't modeled (there is no `review` table), so no
// rating or review count is ever shown or invented.

export type StorefrontProduct = Product & {
  categorySlug?: string;
  categoryName?: string;
  inStock: boolean;
  shortDescription?: string | null;
  description?: string | null;
  /** Search-engine title/description set in the admin (product form → SEO). */
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** Extra photos beyond imageUrl, in admin-set order. Only populated by
   * getPublishedProductBySlug (the product detail page) — the listing
   * grid only ever needs the one featured image. */
  galleryImageUrls?: string[];
};

function toStorefrontProduct(row: {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  categorySlug: string | null;
  categoryName: string | null;
  imageUrl: string | null;
}): StorefrontProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    description: row.description,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    price: row.price,
    salePrice: row.salePrice ?? undefined,
    categorySlug: row.categorySlug ?? undefined,
    categoryName: row.categoryName ?? undefined,
    inStock: row.stock > 0,
    imageUrl: row.imageUrl ?? undefined,
  };
}

const productColumns = {
  id: product.id,
  slug: product.slug,
  name: product.name,
  shortDescription: product.shortDescription,
  description: product.description,
  seoTitle: product.seoTitle,
  seoDescription: product.seoDescription,
  price: product.price,
  salePrice: product.salePrice,
  stock: product.stock,
  categorySlug: category.slug,
  categoryName: category.name,
  imageUrl: media.url,
} as const;

/** Replaces a product's gallery with the given media ids, in order.
 * Used by the admin create/update product routes — always called with
 * the form's full current gallery, never a partial patch. */
export async function setProductGallery(productId: string, mediaIds: string[]): Promise<void> {
  const db = await getDb();
  await db.delete(productImage).where(eq(productImage.productId, productId));
  if (mediaIds.length === 0) return;
  await db.insert(productImage).values(
    mediaIds.map((mediaId, i) => ({
      id: crypto.randomUUID(),
      productId,
      mediaId,
      sortOrder: i,
    }))
  );
}

/** A product's current gallery media, in order — {id, url} pairs so the
 * admin form can both display and remove/reorder them. */
export async function getProductGallery(productId: string): Promise<{ id: string; url: string }[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: media.id, url: media.url })
    .from(productImage)
    .innerJoin(media, eq(productImage.mediaId, media.id))
    .where(eq(productImage.productId, productId))
    .orderBy(asc(productImage.sortOrder));
  return rows;
}

/** Every category, in the admin's chosen order. Feeds the homepage's
 * "Shop by category" section, the category listing page and the shop's
 * filter sidebar. Empty array on a fresh database. */
export async function getCategories(): Promise<
  { name: string; slug: string; description: string | null; href: string; imageUrl: string | null }[]
> {
  const db = await getDb();
  const rows = await db
    .select({
      name: category.name,
      description: category.description,
      slug: category.slug,
      imageUrl: media.url,
    })
    .from(category)
    .leftJoin(media, eq(category.imageMediaId, media.id))
    .orderBy(asc(category.sortOrder));
  return rows.map((c) => ({
    name: c.name,
    slug: c.slug,
    description: c.description,
    href: `/shop/${c.slug}`,
    imageUrl: c.imageUrl ?? null,
  }));
}

// Checkout is guest-only (see /api/checkout) — orders aren't linked to a
// customer row by id, only by the email the order was placed under. So
// "this customer's orders" means "orders placed with this email", not an
// order.customerId foreign key (which the checkout flow never sets).

/** A signed-in customer's own orders, newest first — by email, since
 * checkout never sets order.customerId. */
export async function getOrdersForCustomerEmail(email: string) {
  const db = await getDb();
  return db.select().from(order).where(eq(order.customerEmail, email)).orderBy(desc(order.createdAt));
}

/** One order plus its line items — but ONLY if it belongs to the given
 * email, so a signed-in customer can't view another customer's order by
 * guessing/incrementing an id in the URL. Returns null for "not found"
 * and "not yours" alike, so the page can't be used to confirm an order id
 * exists for a different account. */
export async function getOwnOrderWithItems(orderId: string, email: string) {
  const db = await getDb();
  const row = (await db.select().from(order).where(and(eq(order.id, orderId), eq(order.customerEmail, email))))[0];
  if (!row) return null;
  const items = await db.select().from(orderItem).where(eq(orderItem.orderId, orderId));
  return { order: row, items };
}

/** All published products, newest first. Empty array if none exist yet
 * (e.g. a fresh database). */
export async function getPublishedProducts(): Promise<StorefrontProduct[]> {
  const db = await getDb();
  const rows = await db
    .select(productColumns)
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(media, eq(product.featuredImageMediaId, media.id))
    .where(eq(product.status, "published"))
    .orderBy(product.createdAt);

  return rows.map(toStorefrontProduct).reverse();
}

/** A single published product by slug, or null if not found/not published. */
export async function getPublishedProductBySlug(slug: string): Promise<StorefrontProduct | null> {
  const db = await getDb();
  const rows = await db
    .select(productColumns)
    .from(product)
    .leftJoin(category, eq(product.categoryId, category.id))
    .leftJoin(media, eq(product.featuredImageMediaId, media.id))
    .where(and(eq(product.slug, slug), eq(product.status, "published")))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const galleryRows = await db
    .select({ url: media.url })
    .from(productImage)
    .innerJoin(media, eq(productImage.mediaId, media.id))
    .where(eq(productImage.productId, row.id))
    .orderBy(asc(productImage.sortOrder));

  return { ...toStorefrontProduct(row), galleryImageUrls: galleryRows.map((g) => g.url) };
}

/** Units sold per product across PAID orders only — pending/failed
 * checkouts never count toward "best seller". */
export async function getUnitsSoldByProduct(): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ productId: orderItem.productId, units: sql<string>`sum(${orderItem.quantity})` })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .where(eq(order.paymentStatus, "paid"))
    .groupBy(orderItem.productId);
  return new Map(rows.map((r) => [r.productId, Number(r.units)]));
}

/** Published products ranked by real units sold, best first. Products that
 * have never sold are left out entirely — so a new shop shows no
 * "Best sellers" row instead of a made-up one. */
export async function getBestSellers(limit: number): Promise<StorefrontProduct[]> {
  const [products, sold] = await Promise.all([getPublishedProducts(), getUnitsSoldByProduct()]);
  return products
    .filter((p) => (sold.get(p.id) ?? 0) > 0)
    .sort((a, b) => (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0))
    .slice(0, limit);
}

/** The newest published journal posts, for the homepage preview. */
export async function getLatestJournalPosts(limit: number) {
  const db = await getDb();
  const rows = await db
    .select({
      id: blogPost.id,
      slug: blogPost.slug,
      title: blogPost.title,
      excerpt: blogPost.excerpt,
      publishedAt: blogPost.publishedAt,
      categoryName: blogCategory.name,
      coverUrl: media.url,
    })
    .from(blogPost)
    .leftJoin(blogCategory, eq(blogPost.blogCategoryId, blogCategory.id))
    .leftJoin(media, eq(blogPost.coverMediaId, media.id))
    .where(eq(blogPost.status, "published"))
    .orderBy(desc(blogPost.publishedAt))
    .limit(limit);
  return rows;
}
