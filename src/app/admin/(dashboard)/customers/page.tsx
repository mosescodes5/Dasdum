"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { getLocale } from "@/lib/currency";

type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isDisabled: boolean;
  createdAt: string;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/customers?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      setCustomers(data.customers);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <Link href={`/admin/customers/${c.id}`} className="font-medium hover:text-primary">
          {c.firstName} {c.lastName}
        </Link>
      ),
    },
    { key: "email", header: "Email", render: (c) => <span className="text-muted">{c.email}</span> },
    { key: "joined", header: "Joined", render: (c) => new Date(c.createdAt).toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" }) },
    { key: "status", header: "Status", render: (c) => (c.isDisabled ? <span className="text-red-600 text-xs">Disabled</span> : <span className="text-green-700 text-xs">Active</span>) },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-primary-deep">Customers</h1>

      <div className="mt-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email…"
          className="border border-hairline px-3 py-2 text-sm w-full max-w-xs"
        />
      </div>

      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={customers ?? []}
          getRowId={(c) => c.id}
          emptyMessage={customers === null ? "Loading…" : "No customers found."}
        />
      </div>
    </div>
  );
}
