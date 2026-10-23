import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { requireAdmin, isDeveloperEmail } from "@/lib/auth/rbac";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { logAdminAction } from "@/lib/auth/audit";
import { checkTeamChange } from "@/lib/admin-team-shared";
import { updateTeamMemberSchema } from "@/lib/validation/admin-team";

// There is deliberately no DELETE: team members are deactivated, never
// removed, so orders and the audit log keep pointing at a real person.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin("super_admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const parsed = updateTeamMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const change = parsed.data;

  const db = await getDb();
  const viewer = (await db.select().from(adminUser).where(eq(adminUser.id, session.sub)))[0];
  const target = (await db.select().from(adminUser).where(eq(adminUser.id, id)))[0];
  if (!viewer || !target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const otherOwners = await db
    .select({ id: adminUser.id })
    .from(adminUser)
    .where(and(eq(adminUser.role, "super_admin"), eq(adminUser.isActive, true), ne(adminUser.id, target.id)));

  const decision = checkTeamChange({
    viewer: { id: viewer.id, role: viewer.role, isDeveloper: isDeveloperEmail(viewer.email) },
    target: { id: target.id, role: target.role, isActive: target.isActive, isDeveloper: isDeveloperEmail(target.email) },
    change,
    otherActiveOwners: otherOwners.length,
  });
  if (!decision.ok) return NextResponse.json({ error: decision.message }, { status: decision.status });

  const updates: Partial<typeof adminUser.$inferInsert> = {};
  if (change.name !== undefined) updates.name = change.name;
  if (change.role !== undefined) updates.role = change.role;
  if (change.isActive !== undefined) updates.isActive = change.isActive;
  let temporaryPassword: string | undefined;
  if (change.resetPassword) {
    temporaryPassword = generatePassword();
    updates.passwordHash = await hashPassword(temporaryPassword);
  }

  await db.update(adminUser).set(updates).where(eq(adminUser.id, target.id));
  await logAdminAction({
    adminUserId: session.sub,
    action: change.resetPassword ? "team.reset_password" : "team.update",
    entityType: "admin_user",
    entityId: target.id,
    metadata: { email: target.email, role: change.role, isActive: change.isActive, name: change.name },
  });

  return NextResponse.json({ ok: true, ...(temporaryPassword ? { temporaryPassword } : {}) });
}
