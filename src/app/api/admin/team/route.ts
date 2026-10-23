import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { requireAdmin, isDeveloperEmail } from "@/lib/auth/rbac";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { logAdminAction } from "@/lib/auth/audit";
import { listTeam } from "@/lib/admin-team";
import { createTeamMemberSchema } from "@/lib/validation/admin-team";

// Team management: Owners only (and the role is re-checked against the
// database on every call, so a demoted Owner loses access at once).

export async function GET() {
  try {
    await requireAdmin("super_admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ team: await listTeam() });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireAdmin("super_admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createTeamMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, role } = parsed.data;

  const db = await getDb();
  const viewer = (await db.select().from(adminUser).where(eq(adminUser.id, session.sub)))[0];
  if (role === "super_admin" && !(viewer && isDeveloperEmail(viewer.email))) {
    return NextResponse.json({ error: "Only the developer account can create an Owner." }, { status: 403 });
  }
  const existing = (await db.select().from(adminUser).where(eq(adminUser.email, email)))[0];
  if (existing) {
    return NextResponse.json({ error: "A team member with that email already exists." }, { status: 409 });
  }

  // A random temporary password, shown ONCE in the response and stored only as a hash.
  const temporaryPassword = generatePassword();
  const id = crypto.randomUUID();
  await db.insert(adminUser).values({
    id,
    email,
    name,
    role,
    passwordHash: await hashPassword(temporaryPassword),
    isActive: true,
    createdAt: new Date().toISOString(),
  });
  await logAdminAction({ adminUserId: session.sub, action: "team.create", entityType: "admin_user", entityId: id, metadata: { email, role } });

  return NextResponse.json({ ok: true, id, temporaryPassword }, { status: 201 });
}
