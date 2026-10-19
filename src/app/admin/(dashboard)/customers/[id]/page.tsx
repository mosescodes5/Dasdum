"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getLocale } from "@/lib/currency";

type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isDisabled: boolean;
  createdAt: string;
};
type Address = { id: string; fullName: string; line1: string; city: string; postalCode: string | null; country: string };

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/customers/${params.id}`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    const data = (await res.json()) as any;
    setCustomer(data.customer);
    setAddresses(data.addresses);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function toggleDisabled() {
    if (!customer) return;
    const next = !customer.isDisabled;
    if (next && !confirm("Disable this account? They won't be able to sign in.")) return;
    setSaving(true);
    await fetch(`/api/admin/customers/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDisabled: next }),
    });
    await load();
    setSaving(false);
  }

  if (notFound) return <p className="text-sm text-muted">That customer couldn&rsquo;t be found.</p>;
  if (!customer) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary-deep">
          {customer.firstName} {customer.lastName}
        </h1>
        <button
          onClick={toggleDisabled}
          disabled={saving}
          className={`px-4 py-2 text-sm border disabled:opacity-60 ${
            customer.isDisabled ? "border-green-600 text-green-700 hover:bg-green-50" : "border-red-300 text-red-600 hover:bg-red-50"
          }`}
        >
          {customer.isDisabled ? "Re-enable account" : "Disable account"}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="border border-hairline bg-white p-5">
          <h2 className="text-sm font-medium text-primary-deep">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{customer.email}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Phone</dt><dd>{customer.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Joined</dt><dd>{new Date(customer.createdAt).toLocaleDateString(getLocale())}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Status</dt><dd>{customer.isDisabled ? "Disabled" : "Active"}</dd></div>
          </dl>
        </section>

        <section className="border border-hairline bg-white p-5">
          <h2 className="text-sm font-medium text-primary-deep">Saved addresses</h2>
          {addresses.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No saved addresses.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {addresses.map((a) => (
                <li key={a.id} className="border-t border-hairline pt-3 first:border-0 first:pt-0">
                  <p>{a.fullName}</p>
                  <p className="text-muted">{a.line1}, {a.city} {a.postalCode}, {a.country}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 border border-dashed border-hairline p-8 text-center text-sm text-muted">
        Order history for this customer will appear here once checkout persists real orders (see /admin/orders).
      </section>
    </div>
  );
}
