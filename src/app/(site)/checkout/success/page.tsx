"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";

function Success() {
  const params = useSearchParams();
  const { clearActive } = useCart();
  const orderNumber = params.get("order");
  useEffect(() => {
    // Only empty the basket when arriving from a real checkout redirect
    // (which always carries ?order=), not on any stray visit to this URL.
    if (orderNumber) clearActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="container-editorial py-24 text-center">
      <h1 className="font-display text-3xl text-primary-deep">Thank you for your order</h1>
      {orderNumber && <p className="mt-3 text-muted">Order {orderNumber}</p>}
      <p className="mt-3 text-muted">
        We&rsquo;ll email your order confirmation as soon as the payment is confirmed — usually within a minute.
      </p>
      <Link href="/shop" className="mt-8 inline-block bg-primary-deep text-bg px-7 py-3.5 text-sm">
        Continue Shopping
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <Success />
    </Suspense>
  );
}
