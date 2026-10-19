import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { order, orderItem } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { logAdminAction } from "@/lib/auth/audit";

const statusSchema = z.object({
  fulfillmentStatus: z
    .enum(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"])
    .optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getDb();
  const row = (await db.select().from(order).where(eq(order.id, id)))[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await db.select().from(orderItem).where(eq(orderItem.orderId, id));
  return NextResponse.json({ order: row, items });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin("support"); // support staff can update fulfillment status
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as any;
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const db = await getDb();
  await db
    .update(order)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(order.id, id));

  await logAdminAction({
    adminUserId: session.sub,
    action: "order.status_update",
    entityType: "order",
    entityId: id,
    metadata: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
