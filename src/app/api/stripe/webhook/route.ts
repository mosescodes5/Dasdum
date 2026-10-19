import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { order, orderItem, product } from "@/lib/db/schema";
import { verifyStripeSignature } from "@/lib/stripe";
import { sendEmail, orderConfirmationEmail, adminOrderNotificationEmail, escapeHtml } from "@/lib/email";
import { stripeCurrency } from "@/lib/currency";

// Stripe calls this after a payment. It is the ONLY place an order is
// marked paid — never trust the browser being redirected to the success page.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as { type: string; data: { object: any } };

  // A refund made in the Stripe dashboard arrives as a charge event, which
  // carries a payment intent id (saved on the order when it was paid), not
  // a checkout session — so it's handled before the session logic below.
  if (event.type === "charge.refunded") {
    await handleChargeRefunded(event.data.object);
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const orderId: string | undefined = session?.client_reference_id ?? session?.metadata?.order_id;
  if (!orderId) return NextResponse.json({ received: true });

  const db = await getDb();
  const now = new Date().toISOString();

  if (
    (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
    session.payment_status === "paid"
  ) {
    // Cross-check what Stripe actually collected against what we asked for.
    // A mismatch means a bug or misconfiguration (the session is created
    // server-side with our own amounts), so don't quietly mark it paid:
    // leave the order pending and tell the shop owner to look at it.
    const existing = (await db.select().from(order).where(eq(order.id, orderId)))[0];
    if (!existing) return NextResponse.json({ received: true });
    const amountOk = session.amount_total === existing.grandTotal;
    const currencyOk = String(session.currency ?? "").toLowerCase() === stripeCurrency();
    if (existing.paymentStatus === "pending" && (!amountOk || !currencyOk)) {
      console.error("Stripe payment does not match order — left pending", {
        orderNumber: existing.orderNumber,
        expected: existing.grandTotal,
        received: session.amount_total,
        currency: session.currency,
      });
      const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (adminTo) {
        await sendEmail({
          to: adminTo,
          subject: `Check payment — ${existing.orderNumber}`,
          html: `<p>Stripe reports a payment of ${escapeHtml(String(session.amount_total))} ${escapeHtml(String(session.currency))} for order <strong>${escapeHtml(existing.orderNumber)}</strong>, but the order total is ${existing.grandTotal}. The order was NOT marked paid — check it in the Stripe dashboard.</p>`,
        }).catch((err) => console.error("Mismatch alert email failed:", err));
      }
      return NextResponse.json({ received: true });
    }

    // Only the first delivery flips pending -> paid, so retries can't double-decrement stock.
    const [result] = await db
      .update(order)
      .set({
        paymentStatus: "paid",
        fulfillmentStatus: "processing",
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        updatedAt: now,
      })
      .where(and(eq(order.id, orderId), eq(order.paymentStatus, "pending")));
    if (result.affectedRows > 0) {
      const items = await db.select().from(orderItem).where(eq(orderItem.orderId, orderId));
      for (const item of items) {
        await db
          .update(product)
          .set({ stock: sql`GREATEST(${product.stock} - ${item.quantity}, 0)` })
          .where(eq(product.id, item.productId));
      }

      // Best-effort: an email failure here must never turn into a 5xx
      // response to Stripe, or Stripe will keep retrying a webhook whose
      // actual job (marking the order paid, decrementing stock) already
      // succeeded above.
      const paidOrder = (await db.select().from(order).where(eq(order.id, orderId)))[0];
      if (paidOrder) {
        if (paidOrder.customerEmail) {
          await sendEmail({
            to: paidOrder.customerEmail,
            subject: `Order confirmed — ${paidOrder.orderNumber}`,
            html: orderConfirmationEmail(paidOrder, items),
          }).catch((err) => console.error("Order confirmation email failed:", err));
        }
        const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL;
        if (adminTo) {
          await sendEmail({
            to: adminTo,
            subject: `New order — ${paidOrder.orderNumber}`,
            html: adminOrderNotificationEmail(paidOrder, items),
          }).catch((err) => console.error("Admin order notification email failed:", err));
        }
      }
    }
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    await db
      .update(order)
      .set({ paymentStatus: "failed", updatedAt: now })
      .where(and(eq(order.id, orderId), eq(order.paymentStatus, "pending")));
  }

  return NextResponse.json({ received: true });
}

/** Marks an order refunded when Stripe reports a FULL refund. Partial
 * refunds are only logged — the order statuses have no "partially
 * refunded" state, so changing them would be wrong. Stock is not put back
 * automatically (the goods may never have come back). */
async function handleChargeRefunded(charge: any) {
  const db = await getDb();
  const paymentIntentId: string | undefined = typeof charge?.payment_intent === "string" ? charge.payment_intent : undefined;
  const metaOrderId: string | undefined = charge?.metadata?.order_id;
  const target = paymentIntentId
    ? (await db.select().from(order).where(eq(order.stripePaymentIntentId, paymentIntentId)))[0]
    : metaOrderId
      ? (await db.select().from(order).where(eq(order.id, metaOrderId)))[0]
      : undefined;
  if (!target) {
    console.warn("charge.refunded for a payment not linked to any order", { paymentIntentId });
    return;
  }
  if (charge.amount_refunded !== charge.amount) {
    console.warn("Partial refund — order status left unchanged", {
      orderNumber: target.orderNumber,
      refunded: charge.amount_refunded,
      of: charge.amount,
    });
    return;
  }
  // Pre-shipment orders become "refunded"; shipped/delivered keep their
  // fulfillment status (the parcel still happened), only payment changes.
  const stillOpen = target.fulfillmentStatus === "pending" || target.fulfillmentStatus === "processing";
  await db
    .update(order)
    .set({
      paymentStatus: "refunded",
      ...(stillOpen ? { fulfillmentStatus: "refunded" as const } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(order.id, target.id));
}
