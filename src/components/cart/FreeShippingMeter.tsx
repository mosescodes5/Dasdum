"use client";

import { Truck, Check } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { freeShippingThreshold } from "@/lib/shipping";

const THRESHOLD = freeShippingThreshold();

/** "You're £X away from free shipping" with a bar that fills as the cart
 * grows. Uses the same threshold as checkout, and renders nothing when the
 * shop has no free-shipping offer. The bar animates transform only. */
export function FreeShippingMeter({ subtotal, className = "" }: { subtotal: number; className?: string }) {
  if (!THRESHOLD || subtotal <= 0) return null;
  const reached = subtotal >= THRESHOLD;
  const progress = Math.min(1, subtotal / THRESHOLD);

  return (
    <div className={`rounded-md bg-soft px-4 py-3 ${className}`} role="status">
      <p className="flex items-center gap-2 text-[0.78rem] font-medium text-primary-deep">
        {reached ? <Check size={15} className="text-gold-text" /> : <Truck size={15} className="text-gold-text" />}
        {reached ? (
          "You’ve unlocked free shipping"
        ) : (
          <span>
            You’re <b>{formatMoney(THRESHOLD - subtotal)}</b> away from free shipping
          </span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft2">
        <div
          className="h-full origin-left rounded-full bg-gold transition-transform duration-700 ease-editorial"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
