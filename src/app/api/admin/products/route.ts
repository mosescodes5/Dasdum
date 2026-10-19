import { NextResponse } from "next/server";
import { desc, eq, like, and, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { productSchema } from "@/lib/validation/admin-product";
import { logAdminAction } from "@/lib/auth/audit";
import { setProductGallery } from "@/lib/db/catalog";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const status = searchParams.get("status");

  const db = await getDb();
  const conditions: SQL[] = [];
  if (q) conditions.push(like(product.name, `%${q}%`));
  if (status) conditions.push(eq(product.status, status as "draft" | "published" | "archived"));

  const rows = await db
    .select()
    .from(product)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(product.updatedAt));

  return NextResponse.json({ products: rows });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireAdmin("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as any;
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const values = parsed.data;

  const db = await getDb();
  const existing = (await db.select().from(product).where(eq(product.slug, values.slug)))[0];
  if (existing) {
    return NextResponse.json({ error: "A product with that slug already exists." }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(product).values({
    id,
    name: values.name,
    slug: values.slug,
    shortDescription: values.shortDescription,
    description: values.description,
    price: values.price,
    salePrice: values.salePrice ?? null,
    sku: values.sku,
    stock: values.stock,
    categoryId: values.categoryId,
    tags: values.tags ? JSON.stringify(values.tags.split(",").map((t) => t.trim())) : null,
    featuredImageMediaId: values.featuredImageMediaId ?? null,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    status: values.status,
    createdAt: now,
    updatedAt: now,
  });
  await setProductGallery(id, values.galleryMediaIds ?? []);

  await logAdminAction({
    adminUserId: session.sub,
    action: "product.create",
    entityType: "product",
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
  if (ids.length === 0) {
    return NextResponse.json({ error: "No ids provided." }, { status: 400 });
  }

  const db = await getDb();
  for (const id of ids) {
    await setProductGallery(id, []);
    await db.delete(product).where(eq(product.id, id));
  }

  await logAdminAction({
    adminUserId: session.sub,
    action: "product.bulk_delete",
    entityType: "product",
    metadata: { ids },
  });

  return NextResponse.json({ ok: true });
}
