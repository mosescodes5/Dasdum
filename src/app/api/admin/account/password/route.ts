import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logAdminAction } from "@/lib/auth/audit";
import { changePasswordSchema } from "@/lib/validation/admin-team";

// Any signed-in team member can change their own password (needed because
// new accounts start with a temporary one). Requires the current password,
// so a borrowed, unlocked laptop can't be used to take over the account.
export async function POST(request: Request) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const db = await getDb();
  const me = (await db.select().from(adminUser).where(eq(adminUser.id, session.sub)))[0];
  if (!me || !(await verifyPassword(currentPassword, me.passwordHash))) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "Choose a password you haven't used here." }, { status: 400 });
  }

  await db.update(adminUser).set({ passwordHash: await hashPassword(newPassword) }).where(eq(adminUser.id, me.id));
  await logAdminAction({ adminUserId: me.id, action: "account.change_password", entityType: "admin_user", entityId: me.id });
  return NextResponse.json({ ok: true });
}
