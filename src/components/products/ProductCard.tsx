"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Eye, ShoppingCart, Check } from "lucide-react";
import { QuickView } from "@/components/products/QuickView";
import { useWishlist } from "@/components/cart/WishlistContext";
import { useCart } from "@/components/cart/CartContext";
import { formatMoney as formatGBP } from "@/lib/currency";

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number; // minor units (pence)
  salePrice?: number;
  badge?: string;
  rating?: number;
  reviewCount?: number;
  /** Featured image URL (served from local disk via /media/[...path]). Falls back
   * to a plain placeholder when the product has no photo yet. */
  imageUrl?: string;
  /** Shown in the Quick view modal. */
  shortDescription?: string | null;
  /** Defaults to true when omitted. */
  inStock?: boolean;
};

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { isWishlisted, toggle } = useWishlist();
  const { addLine } = useCart();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const wishlisted = isWishlisted(product.id);
  const onSale = typeof product.salePrice === "number" && product.salePrice < product.price;
  const percentOff = onSale ? Math.round((1 - product.salePrice! / product.price) * 100) : 0;
  const inStock = product.inStock !== false;

  function handleAdd() {
    addLine({
      id: `${product.id}::default`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice: product.salePrice ?? product.price,
      quantity: 1,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <article className="group relative overflow-hidden rounded-lg border border-hairline bg-surface transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary-deep/40">
      <div className="skeleton relative aspect-square overflow-hidden">
        <Link href={`/product/${product.slug}`} aria-label={product.name} className="absolute inset-0">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- same-origin /media/ URL from local uploads; the built-in optimizer is disabled anyway (see next.config.ts)
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-110"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
            />
          ) : (
            <span className="block h-full w-full bg-soft2/60" />
          )}
        </Link>

        {onSale ? (
          <span className="absolute left-3 top-3 rounded-full bg-primary-deep px-2.5 py-0.5 text-[0.68rem] font-bold text-white">
            -{percentOff}%
          </span>
        ) : product.badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-0.5 text-[0.68rem] font-bold text-primary-deep">
            {product.badge}
          </span>
        ) : null}

        <button
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          type="button"
          onClick={() => toggle({ productId: product.id, slug: product.slug, name: product.name })}
          className="absolute right-3 top-3 rounded-full bg-surface/90 p-2 transition-colors hover:bg-surface"
        >
          <Heart size={16} className={wishlisted ? "fill-gold text-gold" : "text-primary-deep"} />
        </button>

        {/* Always visible on touch screens (no hover there), slides in on hover on desktop */}
        <button
          type="button"
          onClick={() => setQuickViewOpen(true)}
          className="no-btn-type absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-[3px] bg-primary-deep/95 py-2.5 text-sm text-white transition-all duration-300 hover:bg-primary max-md:translate-y-0 max-md:opacity-100 md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
        >
          <Eye size={15} /> Quick view
        </button>
      </div>

      {quickViewOpen && <QuickView product={product} onClose={() => setQuickViewOpen(false)} />}

      <div className="px-4 pb-4 pt-3.5">
        <h3 className="h-[2.4em] overflow-hidden text-[0.88rem] font-medium normal-case leading-[1.35] tracking-normal">
          <Link href={`/product/${product.slug}`} className="hover:text-gold-text transition-colors">
            {product.name}
          </Link>
        </h3>

        <div className="mb-3 mt-2 flex items-baseline gap-2">
          <b className="text-[1.1rem] font-black">{formatGBP(product.salePrice ?? product.price)}</b>
          {onSale && <s className="text-[0.8rem] text-muted">{formatGBP(product.price)}</s>}
        </div>

        <button
          type="button"
          disabled={!inStock}
          onClick={handleAdd}
          className="flex w-full items-center justify-center gap-2 rounded-[3px] border border-hairline py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] transition-colors hover:border-primary-deep hover:bg-primary-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-text"
        >
          {!inStock ? (
            "Out of stock"
          ) : justAdded ? (
            <>
              <Check size={15} /> Added
            </>
          ) : (
            <>
              <ShoppingCart size={15} /> Add to cart
            </>
          )}
        </button>
      </div>
    </article>
  );
}
