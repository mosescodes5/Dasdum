import Link from "next/link";
import { sql, eq, inArray, lte, and, desc, asc } from "drizzle-orm";
import { Package, ShoppingCart, Users, Wallet, AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { product, order, customer } from "@/lib/db/schema";
import { StatCard } from "@/components/admin/StatCard";
import { formatMoney, getLocale } from "@/lib/currency";

const LOW_STOCK_THRESHOLD = 5;

// Every number here is a real query against MySQL — no demo/placeholder
// data. Keep it that way: it's tempting to add a chart or a "vs last
// period" figure, but that either needs more schema (a snapshot table)
// or gets faked, and a shop owner trusting a fake number here is worse
// than not showing it at all.
export default async function AdminDashboardPage() {
  const db = await getDb();

  const [[{ count: totalProducts }], [{ count: publishedProducts }], [{ count: totalOrders }], [{ count: pendingOrders }], [{ count: totalCustomers }], [{ revenue }], recentOrders, lowStock] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(product),
      db.select({ count: sql<number>`count(*)` }).from(product).where(eq(product.status, "published")),
      db.select({ count: sql<number>`count(*)` }).from(order),
      db
        .select({ count: sql<number>`count(*)` })
        .from(order)
        .where(inArray(order.fulfillmentStatus, ["pending", "processing"])),
      db.select({ count: sql<number>`count(*)` }).from(customer),
      db
        .select({ revenue: sql<number>`coalesce(sum(${order.grandTotal}), 0)` })
        .from(order)
        .where(eq(order.paymentStatus, "paid")),
      db.select().from(order).orderBy(desc(order.createdAt)).limit(5),
      db
        .select({ id: product.id, name: product.name, sku: product.sku, stock: product.stock })
        .from(product)
        .where(and(eq(product.status, "published"), lte(product.stock, LOW_STOCK_THRESHOLD)))
        .orderBy(asc(product.stock))
        .limit(5),
    ]);

  return (
    <div>
      <h1 className="font-display text-2xl text-primary-deep">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">An overview of your store.</p>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Revenue (paid orders)" value={formatMoney(revenue)} icon={Wallet} />
        <StatCard label="Orders" value={String(totalOrders)} icon={ShoppingCart} />
        <StatCard label="Awaiting action" value={String(pendingOrders)} icon={AlertTriangle} />
        <StatCard label="Products (published)" value={`${publishedProducts} / ${totalProducts}`} icon={Package} />
        <StatCard label="Customers" value={String(totalCustomers)} icon={Users} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-hairline bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-primary-deep">Recent orders</h3>
            <Link href="/admin/orders" className="text-xs text-primary-deep link-underline">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No orders yet.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-hairline">
                  <th className="pb-2 font-normal">Order</th>
                  <th className="pb-2 font-normal">Status</th>
                  <th className="pb-2 font-normal text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-hairline last:border-0">
                    <td className="py-2.5">
                      <Link href={`/admin/orders/${o.id}`} className="hover:text-primary">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-muted">
                        {new Date(o.createdAt).toLocaleDateString(getLocale(), { day: "numeric", month: "short" })}
                      </p>
                    </td>
                    <td className="py-2.5 capitalize">{o.fulfillmentStatus}</td>
                    <td className="py-2.5 text-right">{formatMoney(o.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border border-hairline bg-white p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-gold" />
            <h3 className="text-sm font-medium text-primary-deep">Low stock</h3>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing low on stock right now.</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <Link href={`/admin/products/${p.id}`} className="hover:text-primary">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted">{p.sku}</p>
                  </div>
                  <span className="text-xs font-medium text-red-600">
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
