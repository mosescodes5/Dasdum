import { NextResponse } from "next/server";
import { desc, eq, and, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { order } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fulfillment = searchParams.get("fulfillment");

  const db = await getDb();
  const conditions: SQL[] = [];
  if (fulfillment) {
    conditions.push(
      eq(
        order.fulfillmentStatus,
        fulfillment as "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
      )
    );
  }

  const rows = await db
    .select()
    .from(order)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(order.createdAt));

  return NextResponse.json({ orders: rows });
}
