"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { FreeShippingMeter } from "@/components/cart/FreeShippingMeter";
import { formatMoney } from "@/lib/currency";
import { standardShipping, freeShippingThreshold } from "@/lib/shipping";

const formatGBP = formatMoney;
const FREE_SHIPPING_THRESHOLD = freeShippingThreshold() ?? Infinity;
const STANDARD_SHIPPING = standardShipping();

export default function CartPage() {
  const { lines, removeLine, setQuantity, toggleSaved, subtotal } = useCart();

  const activeLines = lines.filter((l) => !l.savedForLater);
  const savedLines = lines.filter((l) => l.savedForLater);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const total = subtotal + shipping;

  if (activeLines.length === 0 && savedLines.length === 0) {
    return (
      <div className="container-editorial anim-rise py-24 text-center">
        <h1 className="font-display text-3xl text-primary-deep">Your cart is empty</h1>
        <p className="mt-3 text-muted">Looks like you haven&rsquo;t added anything yet.</p>
        <Link href="/shop" className="btn mt-8">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-editorial py-12">
      <h1 className="font-display text-4xl text-primary-deep">Your Cart</h1>
      <FreeShippingMeter subtotal={subtotal} className="mt-6 max-w-xl" />

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12">
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-hairline">
                <th className="pb-3 font-normal">Product</th>
                <th className="pb-3 font-normal hidden sm:table-cell">Price</th>
                <th className="pb-3 font-normal">Qty</th>
                <th className="pb-3 font-normal text-right">Total</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {activeLines.map((line) => (
                <tr key={line.id} className="border-b border-hairline">
                  <td className="py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 shrink-0 bg-primary/15 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {line.imageUrl && <img src={line.imageUrl} alt="" decoding="async" className="h-full w-full object-cover" />}
                      </div>
                      <div>
                        <Link href={`/product/${line.slug}`} className="font-medium hover:text-primary">
                          {line.name}
                        </Link>
                        {line.variantLabel && (
                          <p className="text-xs text-muted mt-0.5">{line.variantLabel}</p>
                        )}
                        <button
                          onClick={() => toggleSaved(line.id)}
                          className="mt-1 text-xs text-primary-deep link-underline sm:hidden"
                        >
                          Save for later
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 hidden sm:table-cell">{formatGBP(line.unitPrice)}</td>
                  <td className="py-5">
                    <div className="inline-flex items-center border border-hairline">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(line.id, line.quantity - 1)}
                        className="p-2"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs">{line.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() => setQuantity(line.id, line.quantity + 1)}
                        className="p-2"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="py-5 text-right font-medium">
                    {formatGBP(line.unitPrice * line.quantity)}
                  </td>
                  <td className="py-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toggleSaved(line.id)}
                        className="hidden sm:inline text-xs text-muted hover:text-text"
                      >
                        Save for later
                      </button>
                      <button aria-label="Remove item" onClick={() => removeLine(line.id)}>
                        <X size={16} className="text-muted hover:text-text" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {savedLines.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-xl text-primary-deep">Saved for later</h2>
              <ul className="mt-4 divide-y divide-hairline">
                {savedLines.map((line) => (
                  <li key={line.id} className="py-4 flex items-center gap-4">
                    <div className="h-14 w-14 shrink-0 bg-primary/10 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {line.imageUrl && <img src={line.imageUrl} alt="" decoding="async" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-muted">{formatGBP(line.unitPrice)}</p>
                    </div>
                    <button
                      onClick={() => toggleSaved(line.id)}
                      className="text-xs text-primary-deep link-underline"
                    >
                      Move to cart
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="border border-hairline p-6 h-fit">
          <h2 className="font-display text-xl text-primary-deep">Order Summary</h2>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatGBP(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd>{shipping === 0 ? "Free" : formatGBP(shipping)}</dd>
            </div>
            {shipping > 0 && (
              <p className="text-xs text-muted">
                Add {formatGBP(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.
              </p>
            )}
            <div className="flex justify-between pt-3 border-t border-hairline font-medium text-base">
              <dt>Total</dt>
              <dd>{formatGBP(total)}</dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            className="mt-6 block text-center bg-primary-deep text-bg py-3.5 text-sm hover:bg-primary transition-colors"
          >
            Proceed to Checkout
          </Link>
          <Link
            href="/shop"
            className="mt-3 block text-center text-sm text-muted hover:text-text"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
