import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { address } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("customer");
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  // customerId check ensures a customer can only delete their own address,
  // regardless of what id they pass in.
  await db.delete(address).where(and(eq(address.id, id), eq(address.customerId, session.sub)));

  return NextResponse.json({ ok: true });
}
