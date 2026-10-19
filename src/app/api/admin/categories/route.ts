import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { category } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { categorySchema } from "@/lib/validation/admin-category";
import { logAdminAction } from "@/lib/auth/audit";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getDb();
  const rows = await db.select().from(category).orderBy(asc(category.sortOrder));
  return NextResponse.json({ categories: rows });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireAdmin("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as any;
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const values = parsed.data;

  const db = await getDb();
  const existing = (await db.select().from(category).where(eq(category.slug, values.slug)))[0];
  if (existing) {
    return NextResponse.json({ error: "A category with that slug already exists." }, { status: 409 });
  }

  const id = crypto.randomUUID();
  await db.insert(category).values({ id, ...values });

  await logAdminAction({
    adminUserId: session.sub,
    action: "category.create",
    entityType: "category",
    entityId: id,
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  let session;
  try {
    session = await requireAdmin("manager");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as any;
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  if (ids.length === 0) return NextResponse.json({ error: "No ids provided." }, { status: 400 });

  const db = await getDb();
  for (const id of ids) {
    await db.delete(category).where(eq(category.id, id));
  }

  await logAdminAction({
    adminUserId: session.sub,
    action: "category.bulk_delete",
    entityType: "category",
    metadata: { ids },
  });

  return NextResponse.json({ ok: true });
}
