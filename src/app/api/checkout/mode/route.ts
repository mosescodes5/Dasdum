import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Tells the checkout page whether Stripe is in TEST mode, so it can show a
// notice. Returns only a yes/no — never any part of the key itself.
export async function GET() {
  return NextResponse.json({ test: (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_") });
}
