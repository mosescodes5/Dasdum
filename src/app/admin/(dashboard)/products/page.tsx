"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatMoney as formatGBP } from "@/lib/currency";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  status: "draft" | "published" | "archived";
};


export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/products?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      setProducts(data.products);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
  }, [load]);

  async function bulkDelete(ids: string[]) {
    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    load();
  }

  const columns: Column<Product>[] = [
    { key: "name", header: "Product", render: (p) => <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link> },
    { key: "sku", header: "SKU", render: (p) => <span className="text-muted">{p.sku}</span> },
    {
      key: "price",
      header: "Price",
      render: (p) =>
        p.salePrice ? (
          <span>
            <span className="line-through text-muted mr-1.5">{formatGBP(p.price)}</span>
            {formatGBP(p.salePrice)}
          </span>
        ) : (
          formatGBP(p.price)
        ),
    },
    { key: "stock", header: "Stock", render: (p) => (p.stock <= 5 ? <span className="text-red-600">{p.stock}</span> : p.stock) },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary-deep">Products</h1>
        <Link href="/admin/products/new" className="flex items-center gap-1.5 bg-primary-deep text-bg px-4 py-2 text-sm hover:bg-primary">
          <Plus size={15} /> New product
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="border border-hairline px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-hairline px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={products ?? []}
          getRowId={(p) => p.id}
          onBulkDelete={bulkDelete}
          emptyMessage={products === null ? "Loading…" : "No products found."}
        />
      </div>
    </div>
  );
}
