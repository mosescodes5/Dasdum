import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { customer, address } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { logAdminAction } from "@/lib/auth/audit";

const updateSchema = z.object({ isDisabled: z.boolean() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getDb();
  const row = (await db.select().from(customer).where(eq(customer.id, id)))[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const addresses = await db.select().from(address).where(eq(address.customerId, id));
  const { passwordHash: _passwordHash, ...safeRow } = row;
  return NextResponse.json({ customer: safeRow, addresses });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin("manager"); // disabling an account is a manager-level action
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as any;
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  await db
    .update(customer)
    .set({ isDisabled: parsed.data.isDisabled, updatedAt: new Date().toISOString() })
    .where(eq(customer.id, id));

  await logAdminAction({
    adminUserId: session.sub,
    action: parsed.data.isDisabled ? "customer.disable" : "customer.enable",
    entityType: "customer",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
