import { NextResponse } from "next/server";
import { desc, like } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  const db = await getDb();
  const rows = await db
    .select({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      isDisabled: customer.isDisabled,
      createdAt: customer.createdAt,
    })
    .from(customer)
    .where(q ? like(customer.email, `%${q}%`) : undefined)
    .orderBy(desc(customer.createdAt))

  return NextResponse.json({ customers: rows });
}
