"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWishlist } from "@/components/cart/WishlistContext";
import { ProductCard, type Product } from "@/components/products/ProductCard";

export default function AccountWishlistPage() {
  const { items } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);
  const idsKey = items.map((i) => i.productId).join(",");

  useEffect(() => {
    if (!idsKey) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/products?ids=${encodeURIComponent(idsKey)}`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d) => {
        if (!cancelled) setProducts(d.products);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return (
    <div>
      <h1 className="font-display text-3xl text-primary-deep">Wishlist</h1>

      {products === null ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : products.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm text-muted">
            Nothing saved yet — tap the heart on any product to add it here.
          </p>
          <Link href="/shop" className="mt-4 inline-block text-sm text-primary-deep link-underline">
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-10">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
