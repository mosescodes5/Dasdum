import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { getOwnOrderWithItems } from "@/lib/db/catalog";
import { formatMoney, getLocale } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getSession("customer"); // layout already guarantees this exists
  const db = await getDb();
  const user = (await db.select().from(customer).where(eq(customer.id, session!.sub)))[0];
  // Looking up by (id AND customerEmail) together — not id alone, then
  // checking ownership after — so a guessed/incremented order id for
  // someone else's order returns the same "not found" as a wrong one.
  const result = user ? await getOwnOrderWithItems(id, user.email) : null;
  if (!result) notFound();
  const { order, items } = result;

  const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div>
      <Link href="/account/orders" className="text-xs text-muted hover:text-text">
        ← Back to orders
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl text-primary-deep">{order.orderNumber}</h1>
        <span className="text-sm text-muted">
          Placed {new Date(order.createdAt).toLocaleDateString(getLocale(), { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="mt-4 flex gap-6 text-sm">
        <div>
          <span className="text-muted">Fulfillment: </span>
          <span className="font-medium capitalize">{order.fulfillmentStatus}</span>
        </div>
        <div>
          <span className="text-muted">Payment: </span>
          <span className="font-medium capitalize">{order.paymentStatus}</span>
        </div>
      </div>

      <div className="mt-8 border border-hairline divide-y divide-hairline">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            <div className="h-14 w-14 shrink-0 bg-primary/15" />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.productNameSnapshot}</p>
              <p className="text-xs text-muted">Qty {item.quantity}</p>
            </div>
            <span className="text-sm">{formatMoney(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
      </div>

      <dl className="mt-6 max-w-xs ml-auto space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Items</dt>
          <dd>{formatMoney(itemsTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd>{order.shippingTotal === 0 ? "Free" : formatMoney(order.shippingTotal)}</dd>
        </div>
        <div className="flex justify-between pt-2 border-t border-hairline font-medium">
          <dt>Total</dt>
          <dd>{formatMoney(order.grandTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}
