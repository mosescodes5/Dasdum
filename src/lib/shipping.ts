import { toMinor } from "@/lib/currency";

// Shipping rules are configured in .env in MAJOR units (e.g. 4.95), so they
// stay correct for whatever currency the store uses. Inlined at build time.
//   NEXT_PUBLIC_SHIPPING_STANDARD=4.95
//   NEXT_PUBLIC_SHIPPING_EXPRESS=12.95
//   NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD=120     (leave empty/0 to disable free shipping)
//
// Shared by the cart, checkout page and /api/checkout so the amount shown
// is always the amount charged. All results are minor units.

function num(value: string | undefined, name: string): number {
  const n = Number(value);
  if (value === undefined || value.trim() === "" || !Number.isFinite(n) || n < 0) {
    throw new Error(`${name} is not set to a valid number in .env`);
  }
  return n;
}

export function standardShipping(): number {
  return toMinor(num(process.env.NEXT_PUBLIC_SHIPPING_STANDARD, "NEXT_PUBLIC_SHIPPING_STANDARD"));
}

export function expressShipping(): number {
  return toMinor(num(process.env.NEXT_PUBLIC_SHIPPING_EXPRESS, "NEXT_PUBLIC_SHIPPING_EXPRESS"));
}

/** Minor-unit subtotal at/above which shipping is free, or null if disabled. */
export function freeShippingThreshold(): number | null {
  const raw = process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD;
  if (raw === undefined || raw.trim() === "" || Number(raw) <= 0) return null;
  return toMinor(num(raw, "NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD"));
}

export function shippingFor(subtotal: number, method: "standard" | "express"): number {
  const threshold = freeShippingThreshold();
  if (threshold !== null && subtotal >= threshold) return 0;
  return method === "express" ? expressShipping() : standardShipping();
}
