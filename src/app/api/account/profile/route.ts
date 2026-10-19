import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

export async function PATCH(request: Request) {
  const session = await getSession("customer");
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as any;
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }

  const db = await getDb();
  await db
    .update(customer)
    .set({ firstName, lastName, phone, updatedAt: new Date().toISOString() })
    .where(eq(customer.id, session.sub));

  return NextResponse.json({ ok: true });
}
