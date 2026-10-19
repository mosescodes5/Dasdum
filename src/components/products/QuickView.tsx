"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { formatMoney } from "@/lib/currency";
import type { Product } from "./ProductCard";

/** Modal opened by the product card's "Quick view" button. Everything it
 * shows comes from the card's own `product` prop (already loaded from the
 * database), so opening it costs no extra request. */
export function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addLine } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const onSale = typeof product.salePrice === "number" && product.salePrice < product.price;
  const displayPrice = product.salePrice ?? product.price;
  const inStock = product.inStock !== false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function handleAdd() {
    addLine({
      id: `${product.id}::default`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice: displayPrice,
      quantity: qty,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary-deep/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view: ${product.name}`}
        className="relative z-10 grid w-full max-w-3xl max-h-[90vh] overflow-y-auto grid-cols-1 md:grid-cols-2 bg-bg"
      >
        <button
          type="button"
          aria-label="Close quick view"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-surface/90 p-2 hover:bg-surface"
        >
          <X size={18} />
        </button>

        <div className="relative aspect-square md:aspect-auto md:min-h-[420px] bg-primary/10">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>

        <div className="p-6 md:p-8 flex flex-col">
          <h2 className="font-display text-2xl text-primary-deep pr-8">{product.name}</h2>

          <div className="mt-3 flex items-center gap-3">
            {onSale && <span className="text-muted line-through">{formatMoney(product.price)}</span>}
            <span className="text-xl text-primary-deep font-medium">{formatMoney(displayPrice)}</span>
          </div>

          {product.shortDescription && (
            <p className="mt-4 text-sm text-muted leading-relaxed">{product.shortDescription}</p>
          )}

          {inStock ? (
            <>
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

              <button
                type="button"
                onClick={handleAdd}
                className="mt-6 bg-primary-deep text-bg py-3.5 text-sm hover:bg-primary transition-colors"
              >
                {justAdded ? "Added ✓" : "Add to Cart"}
              </button>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted">Currently out of stock — check back soon.</p>
          )}

          <Link
            href={`/product/${product.slug}`}
            onClick={onClose}
            className="mt-4 text-sm text-primary-deep link-underline self-start"
          >
            View full details
          </Link>
        </div>
      </div>
    </div>
  );
}
