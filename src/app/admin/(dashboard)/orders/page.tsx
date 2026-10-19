"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatMoney as formatGBP, getLocale } from "@/lib/currency";

type Order = {
  id: string;
  orderNumber: string;
  grandTotal: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
};


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [fulfillment, setFulfillment] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (fulfillment) params.set("fulfillment", fulfillment);
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      setOrders(data.orders);
    }
  }, [fulfillment]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<Order>[] = [
    { key: "orderNumber", header: "Order", render: (o) => <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-primary">{o.orderNumber}</Link> },
    { key: "date", header: "Date", render: (o) => new Date(o.createdAt).toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" }) },
    { key: "payment", header: "Payment", render: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: "fulfillment", header: "Fulfillment", render: (o) => <StatusBadge status={o.fulfillmentStatus} /> },
    { key: "total", header: "Total", render: (o) => formatGBP(o.grandTotal), className: "text-right" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-primary-deep">Orders</h1>

      <div className="mt-5">
        <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)} className="border border-hairline px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={orders ?? []}
          getRowId={(o) => o.id}
          emptyMessage={orders === null ? "Loading…" : "No orders yet — once checkout persists orders, they'll show up here."}
        />
      </div>
    </div>
  );
}
