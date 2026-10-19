"use client";

import { useEffect, useState } from "react";

type Address = {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
};

const EMPTY_FORM = {
  label: "",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United Kingdom",
};

export function AddressManager() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/account/addresses");
    if (res.ok) {
      const data = (await res.json()) as any;
      setAddresses(data.addresses);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      {addresses === null ? (
        <p className="mt-4 text-sm text-muted">Loading addresses…</p>
      ) : addresses.length === 0 && !showForm ? (
        <p className="mt-4 text-sm text-muted">No saved addresses yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="border border-hairline p-4 text-sm">
              {a.label && <p className="text-xs text-muted mb-1">{a.label}</p>}
              <p className="font-medium">{a.fullName}</p>
              <p className="text-muted mt-1">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {a.state} {a.postalCode}
                <br />
                {a.country}
              </p>
              <button onClick={() => remove(a.id)} className="mt-3 text-xs text-red-600 hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="mt-6 border border-primary-deep px-5 py-2.5 text-sm hover:bg-primary-deep hover:text-bg transition-colors"
        >
          Add address
        </button>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 max-w-md space-y-3 border border-hairline p-5">
          <input placeholder="Label (e.g. Home)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full border border-hairline px-3 py-2 text-sm" />
          <input placeholder="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full border border-hairline px-3 py-2 text-sm" />
          <input placeholder="Address line 1" required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="w-full border border-hairline px-3 py-2 text-sm" />
          <input placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="w-full border border-hairline px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border border-hairline px-3 py-2 text-sm" />
            <input placeholder="County" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="border border-hairline px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Postcode" required value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="border border-hairline px-3 py-2 text-sm" />
            <input placeholder="Country" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="border border-hairline px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-primary-deep text-bg px-5 py-2.5 text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save address"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-muted">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
