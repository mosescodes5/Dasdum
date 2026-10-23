import { eq } from "drizzle-orm";
import { getSession, type SessionPayload } from "./session";
import { getDb } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";

export type AdminRole = NonNullable<SessionPayload["adminRole"]>;

const ROLE_RANK: Record<AdminRole, number> = {
  support: 0,
  editor: 1,
  manager: 2,
  super_admin: 3,
};

/** Throws if there's no valid admin session, or the session's role is below `minRole`.
 * Call this at the top of every admin server action / route handler / server
 * component that mutates or reveals sensitive data — middleware.ts is a UX
 * redirect only, not the security boundary. */
export async function requireAdmin(minRole: AdminRole = "support"): Promise<SessionPayload> {
  const session = await getSession("admin");
  if (!session || session.role !== "admin" || !session.adminRole) {
    throw new Error("UNAUTHORIZED");
  }
  // The cookie only proves who logged in, not that they may still act.
  // Re-read the account on every call so that disabling or demoting a team
  // member takes effect immediately — not when their 14-day session expires.
  const db = await getDb();
  const admin = (
    await db.select({ role: adminUser.role, isActive: adminUser.isActive }).from(adminUser).where(eq(adminUser.id, session.sub))
  )[0];
  if (!admin || !admin.isActive) {
    throw new Error("UNAUTHORIZED");
  }
  if (ROLE_RANK[admin.role] < ROLE_RANK[minRole]) {
    throw new Error("FORBIDDEN");
  }
  return { ...session, adminRole: admin.role };
}

/** True for exactly one admin email, set via DEVELOPER_EMAIL — gates
 * things that aren't really store-management (editing the homepage/brand
 * imagery) and are only meant for whoever maintains the site, not every
 * admin account. Not a role: a manager or editor stays unable to see this
 * no matter their role, and the one matching email stays able to even as
 * super_admin. Compares case-insensitively since email addresses are. */
export function isDeveloperEmail(email: string): boolean {
  const developerEmail = process.env.DEVELOPER_EMAIL?.trim().toLowerCase();
  return Boolean(developerEmail) && email.trim().toLowerCase() === developerEmail;
}

/** Like requireAdmin, but also requires the session's admin to be the one
 * configured in DEVELOPER_EMAIL. Throws the same way requireAdmin does. */
export async function requireDeveloper(): Promise<SessionPayload> {
  const session = await requireAdmin();
  const db = await getDb();
  const admin = (await db.select().from(adminUser).where(eq(adminUser.id, session.sub)))[0];
  if (!admin || !isDeveloperEmail(admin.email)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireCustomer(): Promise<SessionPayload> {
  const session = await getSession("customer");
  if (!session || session.role !== "customer") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
