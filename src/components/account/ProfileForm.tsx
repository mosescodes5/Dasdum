"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initial: { firstName: string; lastName: string; email: string; phone: string | null };
};

export function ProfileForm({ initial }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved.");
      router.refresh();
    } else {
      setMessage("Couldn't save your changes — please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-md space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm">First name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold"
          />
        </div>
        <div>
          <label className="text-sm">Last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold"
          />
        </div>
      </div>
      <div>
        <label className="text-sm">Email address</label>
        <input value={initial.email} disabled className="mt-1.5 w-full border border-hairline bg-hairline/10 px-3 py-2.5 text-sm text-muted" />
      </div>
      <div>
        <label className="text-sm">Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="bg-primary-deep text-bg px-6 py-2.5 text-sm hover:bg-primary transition-colors disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </form>
  );
}
