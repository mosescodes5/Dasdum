import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { adminLoginSchema } from "@/lib/validation/admin-auth";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

// NOTE: add stricter rate limiting here than the customer login route —
// this endpoint is a higher-value target.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as any;
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const db = await getDb();
  const user = (await db.select().from(adminUser).where(eq(adminUser.email, email)))[0];

  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id, "admin", user.role);
  // TODO: write an audit_log row for this login once the audit helper exists.
  return NextResponse.json({ ok: true });
}
