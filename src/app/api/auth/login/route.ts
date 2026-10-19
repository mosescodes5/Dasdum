import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

// NOTE: add rate limiting here before production (see register/route.ts).

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as any;
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const db = await getDb();
  const user = (await db.select().from(customer).where(eq(customer.email, email)))[0];

  // Same generic error whether the email is unknown or the password is
  // wrong — don't leak which one it was.
  if (!user || user.isDisabled || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id, "customer");
  return NextResponse.json({ ok: true });
}
