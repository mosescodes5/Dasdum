"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/validation/checkout";
import { useCart } from "@/components/cart/CartContext";
import { standardShipping, expressShipping, shippingFor } from "@/lib/shipping";
import { formatMoney as formatGBP } from "@/lib/currency";


export default function CheckoutPage() {
  const { lines, subtotal } = useCart();
  const activeLines = lines.filter((l) => !l.savedForLater);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);

  // Shown only while Stripe is on a test key (sk_test_...), so nobody
  // mistakes a rehearsal for a real sale — and it vanishes on live keys.
  useEffect(() => {
    fetch("/api/checkout/mode")
      .then((r) => r.json())
      .then((d) => setTestMode(Boolean(d.test)))
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { country: "United Kingdom", deliveryMethod: "standard" },
  });

  const deliveryMethod = watch("deliveryMethod");
  const shipping = shippingFor(subtotal, deliveryMethod);
  const shippingFree = shipping === 0;
  const total = subtotal + shipping;

  // On submit: the server re-prices the basket from the database, creates
  // a pending order, and returns a Stripe Checkout URL to redirect to.
  // Card details are entered on Stripe's page, never on this site.
  async function onSubmit(values: CheckoutFormValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values,
          lines: activeLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setServerError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (activeLines.length === 0) {
    return (
      <div className="container-editorial py-24 text-center">
        <h1 className="font-display text-3xl text-primary-deep">Nothing to check out</h1>
        <p className="mt-3 text-muted">Add something to your cart first.</p>
        <Link href="/shop" className="mt-8 inline-block bg-primary-deep text-bg px-7 py-3.5 text-sm">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="anim-rise container-editorial py-12">
      <h1 className="font-display text-4xl text-primary-deep">Checkout</h1>
      {testMode && (
        <div role="note" className="mt-4 border border-gold bg-gold/15 px-4 py-3 text-sm text-primary-deep">
          <b>Test mode.</b> No real money moves. On Stripe&rsquo;s page, pay with card{" "}
          <code className="font-bold">4242 4242 4242 4242</code>, any future expiry, any 3-digit CVC.
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12"
      >
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-xl text-primary-deep">Contact</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm">Email address</label>
                <input {...register("email")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="text-sm">First name</label>
                <input {...register("firstName")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-sm">Last name</label>
                <input {...register("lastName")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary-deep">Shipping Address</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm">Address line 1</label>
                <input {...register("line1")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
                {errors.line1 && <p className="mt-1 text-xs text-red-600">{errors.line1.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm">Address line 2 (optional)</label>
                <input {...register("line2")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
              </div>
              <div>
                <label className="text-sm">City</label>
                <input {...register("city")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
              </div>
              <div>
                <label className="text-sm">Postcode</label>
                <input {...register("postalCode")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
                {errors.postalCode && <p className="mt-1 text-xs text-red-600">{errors.postalCode.message}</p>}
              </div>
              <div>
                <label className="text-sm">Country</label>
                <input {...register("country")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
                {errors.country && <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>}
              </div>
              <div>
                <label className="text-sm">Phone</label>
                <input {...register("phone")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary-deep">Delivery Method</h2>
            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between border border-hairline p-4 text-sm cursor-pointer has-[:checked]:border-gold">
                <span className="flex items-center gap-3">
                  <input type="radio" value="standard" {...register("deliveryMethod")} />
                  Standard (3–7 business days)
                </span>
                <span>{shippingFree ? "Free" : formatGBP(standardShipping())}</span>
              </label>
              <label className="flex items-center justify-between border border-hairline p-4 text-sm cursor-pointer has-[:checked]:border-gold">
                <span className="flex items-center gap-3">
                  <input type="radio" value="express" {...register("deliveryMethod")} />
                  Express (1–2 business days)
                </span>
                <span>{shippingFree ? "Free" : formatGBP(expressShipping())}</span>
              </label>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl text-primary-deep">Payment</h2>
            <p className="mt-3 text-sm text-muted">
              You&rsquo;ll securely enter card details on Stripe&rsquo;s payment page on the next step —
              DASDUM never sees or stores your card information.
            </p>
            {serverError && <p className="mt-4 text-sm text-red-600">{serverError}</p>}
          </section>
        </div>

        <aside className="border border-hairline p-6 h-fit">
          <h2 className="font-display text-xl text-primary-deep">Order Summary</h2>
          <ul className="mt-5 space-y-4">
            {activeLines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 text-sm">
                <div className="h-12 w-12 shrink-0 bg-primary/15" />
                <div className="flex-1">
                  <p className="font-medium">{line.name}</p>
                  <p className="text-xs text-muted">Qty {line.quantity}</p>
                </div>
                <span>{formatGBP(line.unitPrice * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-3 text-sm border-t border-hairline pt-4">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatGBP(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd>{shipping === 0 ? "Free" : formatGBP(shipping)}</dd>
            </div>
            <div className="flex justify-between pt-3 border-t border-hairline font-medium text-base">
              <dt>Total</dt>
              <dd>{formatGBP(total)}</dd>
            </div>
          </dl>
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full bg-primary-deep text-bg py-3.5 text-sm hover:bg-primary transition-colors disabled:opacity-60"
          >
            {submitting ? "Processing…" : "Pay & Place Order"}
          </button>
        </aside>
      </form>
    </div>
  );
}
