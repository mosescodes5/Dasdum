"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "./CartContext";
import { FreeShippingMeter } from "./FreeShippingMeter";
import { formatMoney as formatGBP } from "@/lib/currency";


export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, removeLine, setQuantity, toggleSaved, subtotal } = useCart();
  const activeLines = lines.filter((l) => !l.savedForLater);
  const savedLines = lines.filter((l) => l.savedForLater);

  // While the drawer is open: Escape closes it and the page behind stops scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-primary-deep/40"
          />
          <m.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 z-50 h-full w-full sm:w-[420px] bg-bg flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-hairline">
              <h2 className="font-display text-xl">Your Cart</h2>
              <button aria-label="Close cart" onClick={onClose}>
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeLines.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="font-display text-lg text-primary-deep">Your cart is empty</p>
                  <p className="mt-1 text-sm text-muted">Find something you’ll love.</p>
                  <Link href="/shop" onClick={onClose} className="btn mt-6">
                    Start shopping
                  </Link>
                </div>
              ) : (
                <ul className="space-y-6">
                  {activeLines.map((line) => (
                    <li key={line.id} className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 bg-primary/15 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {line.imageUrl && <img src={line.imageUrl} alt="" decoding="async" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${line.slug}`} className="text-sm font-medium hover:text-primary">
                          {line.name}
                        </Link>
                        {line.variantLabel && (
                          <p className="text-xs text-muted mt-0.5">{line.variantLabel}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center border border-hairline">
                            <button
                              aria-label="Decrease quantity"
                              onClick={() => setQuantity(line.id, line.quantity - 1)}
                              className="p-1.5"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-xs">{line.quantity}</span>
                            <button
                              aria-label="Increase quantity"
                              onClick={() => setQuantity(line.id, line.quantity + 1)}
                              className="p-1.5"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="text-sm">{formatGBP(line.unitPrice * line.quantity)}</span>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-muted">
                          <button onClick={() => toggleSaved(line.id)} className="hover:text-text">
                            Save for later
                          </button>
                          <button onClick={() => removeLine(line.id)} className="hover:text-text">
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {savedLines.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-sm text-muted">Saved for later</h3>
                  <ul className="mt-4 space-y-4">
                    {savedLines.map((line) => (
                      <li key={line.id} className="flex items-center gap-4">
                        <div className="h-14 w-14 shrink-0 bg-primary/10 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {line.imageUrl && <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{line.name}</p>
                          <button
                            onClick={() => toggleSaved(line.id)}
                            className="mt-1 text-xs text-primary-deep link-underline"
                          >
                            Move to cart
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {activeLines.length > 0 && (
              <div className="border-t border-hairline px-6 py-5">
                <FreeShippingMeter subtotal={subtotal} className="mb-4" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-medium">{formatGBP(subtotal)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">Shipping and taxes calculated at checkout.</p>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="btn mt-4 w-full"
                >
                  Checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="mt-2 block text-center text-sm border border-hairline py-3 hover:border-gold"
                >
                  View Cart
                </Link>
              </div>
            )}
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}
