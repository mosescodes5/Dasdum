import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { category } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { categorySchema } from "@/lib/validation/admin-category";
import { logAdminAction } from "@/lib/auth/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getDb();
  const row = (await db.select().from(category).where(eq(category.id, id)))[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ category: row });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as any;
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  await db.update(category).set(parsed.data).where(eq(category.id, id));

  await logAdminAction({
    adminUserId: session.sub,
    action: "category.update",
    entityType: "category",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin("manager");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getDb();
  await db.delete(category).where(eq(category.id, id));

  await logAdminAction({
    adminUserId: session.sub,
    action: "category.delete",
    entityType: "category",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
