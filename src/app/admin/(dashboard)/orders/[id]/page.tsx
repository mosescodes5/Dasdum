"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatMoney as formatGBP, getLocale } from "@/lib/currency";

type OrderItem = { id: string; productNameSnapshot: string; unitPrice: number; quantity: number };
type Order = {
  id: string;
  orderNumber: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
};


const FULFILLMENT_OPTIONS = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
const PAYMENT_OPTIONS = ["pending", "paid", "failed", "refunded"];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/orders/${params.id}`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    const data = (await res.json()) as any;
    setOrder(data.order);
    setItems(data.items);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function updateStatus(field: "fulfillmentStatus" | "paymentStatus", value: string) {
    setSaving(true);
    await fetch(`/api/admin/orders/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await load();
    setSaving(false);
  }

  if (notFound) return <p className="text-sm text-muted">That order couldn&rsquo;t be found.</p>;
  if (!order) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl text-primary-deep">{order.orderNumber}</h1>
        <span className="text-sm text-muted">
          {new Date(order.createdAt).toLocaleDateString(getLocale(), { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="border border-hairline bg-white divide-y divide-hairline">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4">
              <div className="h-14 w-14 shrink-0 bg-primary/15" />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.productNameSnapshot}</p>
                <p className="text-xs text-muted">Qty {item.quantity}</p>
              </div>
              <span className="text-sm">{formatGBP(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          <dl className="p-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatGBP(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{formatGBP(order.shippingTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{formatGBP(order.discountTotal)}</dd></div>
            <div className="flex justify-between pt-2 border-t border-hairline font-medium"><dt>Total</dt><dd>{formatGBP(order.grandTotal)}</dd></div>
          </dl>
        </div>

        <aside className="border border-hairline bg-white p-5 space-y-5 h-fit">
          <div>
            <p className="text-xs text-muted mb-1.5">Payment status</p>
            <StatusBadge status={order.paymentStatus} />
            <select
              disabled={saving}
              value={order.paymentStatus}
              onChange={(e) => updateStatus("paymentStatus", e.target.value)}
              className="mt-2 w-full border border-hairline px-3 py-2 text-sm"
            >
              {PAYMENT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs text-muted mb-1.5">Fulfillment status</p>
            <StatusBadge status={order.fulfillmentStatus} />
            <select
              disabled={saving}
              value={order.fulfillmentStatus}
              onChange={(e) => updateStatus("fulfillmentStatus", e.target.value)}
              className="mt-2 w-full border border-hairline px-3 py-2 text-sm"
            >
              {FULFILLMENT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </aside>
      </div>
    </div>
  );
}
