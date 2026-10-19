"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus } from "lucide-react";
import type { StorefrontProduct } from "@/lib/db/catalog";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/cart/WishlistContext";
import { formatMoney } from "@/lib/currency";

export function PurchasePanel({ product }: { product: StorefrontProduct }) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const { addLine } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const onSale = typeof product.salePrice === "number" && product.salePrice < product.price;
  const displayPrice = product.salePrice ?? product.price;

  function addToCart() {
    addLine({
      id: `${product.id}::default`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice: displayPrice,
      quantity: qty,
    });
  }

  function handleAddToCart() {
    addToCart();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  function handleBuyNow() {
    addToCart();
    router.push("/checkout");
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-3">
          {onSale && <span className="text-muted line-through">{formatMoney(product.price)}</span>}
          <span className="text-2xl text-primary-deep font-medium">{formatMoney(displayPrice)}</span>
        </div>

        <div className="mt-6">
          <span className="text-sm font-medium">Quantity</span>
          <div className="mt-2 inline-flex items-center border border-hairline">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="p-2.5 hover:text-gold"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-sm">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => q + 1)}
              className="p-2.5 hover:text-gold"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {!product.inStock ? (
          <p className="mt-6 text-sm text-muted">Currently out of stock — check back soon.</p>
        ) : (
          <div className="mt-8 hidden sm:flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 min-w-[180px] bg-primary-deep text-bg py-3.5 text-sm hover:bg-primary transition-colors"
            >
              {justAdded ? "Added ✓" : "Add to Cart"}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 min-w-[180px] border border-primary-deep py-3.5 text-sm hover:border-gold transition-colors"
            >
              Buy Now
            </button>
            <button
              type="button"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
              onClick={() => toggle({ productId: product.id, slug: product.slug, name: product.name })}
              className="p-3.5 border border-hairline hover:border-gold"
            >
              <Heart size={18} className={wishlisted ? "fill-gold text-gold" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* Sticky mobile purchase bar */}
      {product.inStock && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 bg-surface border-t border-hairline p-3 flex items-center gap-3">
          <div className="text-sm">
            <div className="font-medium">{formatMoney(displayPrice)}</div>
          </div>
          <button type="button" onClick={handleAddToCart} className="ml-auto flex-1 bg-primary-deep text-bg py-3 text-sm">
            {justAdded ? "Added ✓" : "Add to Cart"}
          </button>
        </div>
      )}
    </>
  );
}
