import { NextResponse } from "next/server";
import { z } from "zod";
import { inArray, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { product, order, orderItem } from "@/lib/db/schema";
import { checkoutSchema } from "@/lib/validation/checkout";
import { shippingFor } from "@/lib/shipping";
import { stripeRequest } from "@/lib/stripe";
import { stripeCurrency } from "@/lib/currency";

const bodySchema = z.object({
  values: checkoutSchema,
  lines: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout details." }, { status: 400 });
  }
  const { values, lines } = parsed.data;

  // Merge duplicate products (e.g. same product, different variant lines).
  const qtyByProduct = new Map<string, number>();
  for (const l of lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);

  const db = await getDb();
  const rows = await db.select().from(product).where(inArray(product.id, [...qtyByProduct.keys()]));

  // Prices come from the database, never from the browser.
  const items: { id: string; name: string; unitPrice: number; quantity: number }[] = [];
  for (const [productId, quantity] of qtyByProduct) {
    const p = rows.find((r) => r.id === productId);
    if (!p || p.status !== "published") {
      return NextResponse.json({ error: "An item in your basket is no longer available." }, { status: 409 });
    }
    if (p.stock < quantity) {
      return NextResponse.json({ error: `Sorry, only ${p.stock} of “${p.name}” left in stock.` }, { status: 409 });
    }
    items.push({ id: p.id, name: p.name, unitPrice: p.salePrice ?? p.price, quantity });
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shipping = shippingFor(subtotal, values.deliveryMethod);
  const grandTotal = subtotal + shipping;

  const orderId = crypto.randomUUID();
  const orderNumber = `DSD-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 36 ** 2)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0")}`;
  const now = new Date().toISOString();

  await db.insert(order).values({
    id: orderId,
    orderNumber,
    subtotal,
    shippingTotal: shipping,
    grandTotal,
    customerEmail: values.email,
    deliveryMethod: values.deliveryMethod,
    shippingAddress: JSON.stringify({
      name: `${values.firstName} ${values.lastName}`,
      line1: values.line1,
      line2: values.line2 ?? "",
      city: values.city,
      postalCode: values.postalCode,
      country: values.country,
      phone: values.phone,
    }),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(orderItem).values(
    items.map((i) => ({
      id: crypto.randomUUID(),
      orderId,
      productId: i.id,
      productNameSnapshot: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
    }))
  );

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!site) {
    // Stripe needs absolute return URLs. Guessing a domain here could send a
    // paying customer to the wrong site, so fail loudly instead.
    console.error("NEXT_PUBLIC_SITE_URL is not set — cannot create a Stripe Checkout session");
    await db.update(order).set({ paymentStatus: "failed", updatedAt: new Date().toISOString() }).where(eq(order.id, orderId));
    return NextResponse.json({ error: "Checkout is not available right now. Please try again later." }, { status: 503 });
  }
  try {
    const session = await stripeRequest<{ id: string; url: string }>("checkout/sessions", {
      mode: "payment",
      client_reference_id: orderId,
      customer_email: values.email,
      success_url: `${site}/checkout/success?order=${orderNumber}`,
      cancel_url: `${site}/checkout`,
      metadata: { order_id: orderId, order_number: orderNumber },
      // Makes Stripe email its own payment receipt (live mode) to the buyer.
      payment_intent_data: { receipt_email: values.email, metadata: { order_id: orderId, order_number: orderNumber } },
      line_items: items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: stripeCurrency(),
          unit_amount: i.unitPrice,
          product_data: { name: i.name },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: values.deliveryMethod === "express" ? "Express delivery" : "Standard delivery",
            fixed_amount: { amount: shipping, currency: stripeCurrency() },
          },
        },
      ],
    }, { idempotencyKey: `checkout-${orderId}` });
    await db.update(order).set({ stripeSessionId: session.id }).where(eq(order.id, orderId));
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session creation failed", err);
    await db.update(order).set({ paymentStatus: "failed", updatedAt: new Date().toISOString() }).where(eq(order.id, orderId));
    return NextResponse.json({ error: "We couldn't start the payment. Please try again." }, { status: 502 });
  }
}
