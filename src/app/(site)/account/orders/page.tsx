import Link from "next/link";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { getOrdersForCustomerEmail } from "@/lib/db/catalog";
import { formatMoney, getLocale } from "@/lib/currency";

export const metadata: Metadata = { title: "Your Orders" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  delivered: "text-green-700",
  shipped: "text-primary-deep",
  processing: "text-gold",
  pending: "text-muted",
  cancelled: "text-red-600",
  refunded: "text-red-600",
};

export default async function AccountOrdersPage() {
  const session = await getSession("customer"); // layout already guarantees this exists
  const db = await getDb();
  const user = (await db.select().from(customer).where(eq(customer.id, session!.sub)))[0];
  const orders = user ? await getOrdersForCustomerEmail(user.email) : [];

  return (
    <div>
      <h1 className="font-display text-3xl text-primary-deep">Orders</h1>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-muted">You haven&rsquo;t placed any orders yet.</p>
      ) : (
        <div className="mt-6 border border-hairline divide-y divide-hairline">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-surface transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{order.orderNumber}</p>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className={`text-xs font-medium capitalize ${STATUS_STYLES[order.fulfillmentStatus] ?? ""}`}>
                {order.fulfillmentStatus}
              </span>
              <span className="text-sm font-medium">{formatMoney(order.grandTotal)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
