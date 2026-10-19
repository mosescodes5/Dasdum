import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

// NOTE: add rate limiting here before production — e.g. a small MySQL- or
// in-memory-backed counter keyed on IP/email, since there's no edge-level
// rate limiting service available on shared hosting the way Workers had.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as any;
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { firstName, lastName, email, password } = parsed.data;

  const db = await getDb();
  const existing = (await db.select().from(customer).where(eq(customer.email, email)))[0];
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.insert(customer).values({
    id,
    email,
    passwordHash: await hashPassword(password),
    firstName,
    lastName,
    createdAt: now,
    updatedAt: now,
  });

  await createSession(id, "customer");
  return NextResponse.json({ ok: true });
}
