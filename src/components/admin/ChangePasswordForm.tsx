"use client";

import { useState } from "react";

const inputCls = "mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm bg-white";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "saving" | "done" | "error"; message?: string }>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirmNext) return setState({ kind: "error", message: "The two new passwords don't match." });
    setState({ kind: "saving" });
    const res = await fetch("/api/admin/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const flat = data?.error?.fieldErrors ? Object.values(data.error.fieldErrors).flat().join(" ") : null;
      return setState({ kind: "error", message: flat || (typeof data?.error === "string" ? data.error : "Couldn't change the password.") });
    }
    setCurrent("");
    setNext("");
    setConfirmNext("");
    setState({ kind: "done" });
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div>
        <label htmlFor="cp-current" className="text-sm">Current password</label>
        <input id="cp-current" type="password" autoComplete="current-password" required className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label htmlFor="cp-new" className="text-sm">New password (at least 10 characters)</label>
        <input id="cp-new" type="password" autoComplete="new-password" required minLength={10} className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div>
        <label htmlFor="cp-confirm" className="text-sm">Repeat new password</label>
        <input id="cp-confirm" type="password" autoComplete="new-password" required className={inputCls} value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} />
      </div>
      <button type="submit" disabled={state.kind === "saving"} className="bg-primary-deep px-6 py-2.5 text-sm text-white hover:bg-primary disabled:opacity-60">
        {state.kind === "saving" ? "Saving…" : "Change password"}
      </button>
      <p role="status" className={`text-sm ${state.kind === "error" ? "text-red-700" : "text-green-700"}`}>
        {state.kind === "done" && "Password changed."}
        {state.kind === "error" && state.message}
      </p>
    </form>
  );
}
