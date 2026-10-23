"use client";

import { useState } from "react";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type TeamMember, type TeamRole } from "@/lib/admin-team-shared";

const inputCls = "mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm bg-white";
const ROLE_ORDER: TeamRole[] = ["super_admin", "manager", "editor", "support"];

type Credential = { email: string; password: string; reason: "created" | "reset" };

export function TeamManager({
  initialTeam,
  viewerId,
  viewerIsDeveloper,
}: {
  initialTeam: TeamMember[];
  viewerId: string;
  viewerIsDeveloper: boolean;
}) {
  const [team, setTeam] = useState(initialTeam);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; role: TeamRole }>({ name: "", email: "", role: "editor" });

  // Only the developer can create Owners — the server enforces this too.
  const creatableRoles = ROLE_ORDER.filter((r) => r !== "super_admin" || viewerIsDeveloper);

  async function refresh() {
    const res = await fetch("/api/admin/team");
    if (res.ok) setTeam((await res.json()).team);
  }

  async function call(url: string, method: string, body: unknown) {
    setError(null);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const flat = data?.error?.fieldErrors ? Object.values(data.error.fieldErrors).flat().join(" ") : null;
      setError(flat || (typeof data?.error === "string" ? data.error : "Something went wrong."));
      return null;
    }
    return data;
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    const data = await call("/api/admin/team", "POST", form);
    setBusy(null);
    if (!data) return;
    setCredential({ email: form.email.trim().toLowerCase(), password: data.temporaryPassword, reason: "created" });
    setCopied(false);
    setForm({ name: "", email: "", role: "editor" });
    await refresh();
  }

  async function update(m: TeamMember, change: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(m.id);
    const data = await call(`/api/admin/team/${m.id}`, "PATCH", change);
    setBusy(null);
    if (!data) {
      await refresh(); // put any dropdown back to what is really saved
      return;
    }
    if (data.temporaryPassword) {
      setCredential({ email: m.email, password: data.temporaryPassword, reason: "reset" });
      setCopied(false);
    }
    await refresh();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8 pb-24">
      <div>
        <h1 className="font-display text-2xl text-primary-deep">Team</h1>
        <p className="mt-1 text-sm text-muted">
          Everyone who can sign in to this admin. Changes take effect immediately — a disabled person is signed out of everything at once.
        </p>
      </div>

      {error && (
        <p role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {credential && (
        <section className="border-2 border-gold bg-gold/10 p-5" aria-live="polite">
          <h2 className="text-sm font-medium text-primary-deep">
            {credential.reason === "created" ? "Account created" : "Password reset"} for {credential.email}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Temporary password — <b>shown only once</b>. Send it to them privately (a message or phone call, not in a shared channel) and ask them to change it under <b>My account</b> straight away.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="select-all bg-white px-3 py-2 font-mono text-base tracking-wide">{credential.password}</code>
            <button type="button" onClick={() => copy(credential.password)} className="border border-primary-deep px-3 py-2 text-sm hover:bg-primary-deep hover:text-white">
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={() => setCredential(null)} className="px-3 py-2 text-sm text-muted hover:text-primary-deep">
              I&rsquo;ve saved it — hide
            </button>
          </div>
        </section>
      )}

      <section className="border border-hairline bg-white">
        <h2 className="border-b border-hairline px-5 py-3 text-sm font-medium text-primary-deep">Members ({team.length})</h2>
        <ul>
          {team.map((m) => {
            const isSelf = m.id === viewerId;
            const protectedFromViewer = (m.isDeveloper && !viewerIsDeveloper) || (m.role === "super_admin" && !viewerIsDeveloper && !isSelf);
            const rowBusy = busy === m.id;
            return (
              <li key={m.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-5 py-4 last:border-b-0 ${m.isActive ? "" : "bg-soft/60"}`}>
                <div className="min-w-[200px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium ${m.isActive ? "" : "text-muted line-through"}`}>{m.name}</span>
                    {isSelf && <span className="bg-soft px-2 py-0.5 text-xs">You</span>}
                    {m.isDeveloper && <span className="bg-primary-deep px-2 py-0.5 text-xs text-white">Developer</span>}
                    {!m.isActive && <span className="bg-red-100 px-2 py-0.5 text-xs text-red-800">Disabled</span>}
                  </div>
                  <div className="text-sm text-muted">{m.email}</div>
                </div>

                {protectedFromViewer || isSelf ? (
                  <span className="text-sm">{ROLE_LABELS[m.role]}</span>
                ) : (
                  <select
                    aria-label={`Role for ${m.name}`}
                    value={m.role}
                    disabled={rowBusy}
                    onChange={(e) => update(m, { role: e.target.value }, `Change ${m.name} to ${ROLE_LABELS[e.target.value as TeamRole]}?`)}
                    className="border border-hairline bg-white px-2 py-2 text-sm"
                  >
                    {ROLE_ORDER.filter((r) => r !== "super_admin" || viewerIsDeveloper || m.role === "super_admin").map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                )}

                {!protectedFromViewer && !isSelf && (
                  <div className="flex gap-2 text-sm">
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => update(m, { resetPassword: true }, `Reset the password for ${m.name}? Their current password stops working immediately.`)}
                      className="border border-hairline px-3 py-2 hover:border-primary-deep disabled:opacity-50"
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() =>
                        update(m, { isActive: !m.isActive }, m.isActive ? `Disable ${m.name}? They'll be signed out immediately.` : undefined)
                      }
                      className={`border px-3 py-2 disabled:opacity-50 ${m.isActive ? "border-red-300 text-red-700 hover:bg-red-50" : "border-hairline hover:border-primary-deep"}`}
                    >
                      {m.isActive ? "Disable" : "Re-enable"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border border-hairline bg-white p-5">
        <h2 className="text-sm font-medium text-primary-deep">Add a team member</h2>
        <form onSubmit={addMember} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tm-name" className="text-sm">Name</label>
            <input id="tm-name" required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="tm-email" className="text-sm">Email (their sign-in)</label>
            <input id="tm-email" type="email" required className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tm-role" className="text-sm">Role</label>
            <select id="tm-role" className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamRole })}>
              {creatableRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted">{ROLE_DESCRIPTIONS[form.role]}</p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy === "create"} className="bg-primary-deep px-6 py-2.5 text-sm text-white hover:bg-primary disabled:opacity-60">
              {busy === "create" ? "Creating…" : "Create account"}
            </button>
            <p className="mt-2 text-xs text-muted">A temporary password is generated for you to pass on. No email is sent.</p>
          </div>
        </form>
      </section>

      <section className="border border-hairline bg-white p-5">
        <h2 className="text-sm font-medium text-primary-deep">What each role can do</h2>
        <dl className="mt-3 space-y-3 text-sm">
          {ROLE_ORDER.map((r) => (
            <div key={r}>
              <dt className="font-medium">{ROLE_LABELS[r]}</dt>
              <dd className="text-muted">{ROLE_DESCRIPTIONS[r]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted">
          Site Images and Site Content are developer-only and aren&rsquo;t tied to any role. Team members are disabled, never deleted, so past orders and the activity log keep a real name.
        </p>
      </section>
    </div>
  );
}
