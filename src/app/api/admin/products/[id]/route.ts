import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { product, media } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { productSchema } from "@/lib/validation/admin-product";
import { logAdminAction } from "@/lib/auth/audit";
import { setProductGallery, getProductGallery } from "@/lib/db/catalog";

import { clearsCache } from "@/lib/cache";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getDb();
  const row = (await db.select().from(product).where(eq(product.id, id)))[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let featuredImageUrl: string | null = null;
  if (row.featuredImageMediaId) {
    const img = (await db.select().from(media).where(eq(media.id, row.featuredImageMediaId)))[0];
    featuredImageUrl = img?.url ?? null;
  }

  const galleryImages = await getProductGallery(id);

  return NextResponse.json({ product: { ...row, featuredImageUrl, galleryImages } });
}

async function PATCH_handler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as any;
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const values = parsed.data;

  const db = await getDb();
  await db
    .update(product)
    .set({
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
      updatedAt: new Date().toISOString(),
    })
    .where(eq(product.id, id));
  await setProductGallery(id, values.galleryMediaIds ?? []);

  await logAdminAction({
    adminUserId: session.sub,
    action: "product.update",
    entityType: "product",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

async function DELETE_handler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin("manager");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getDb();
  await setProductGallery(id, []);
  await db.delete(product).where(eq(product.id, id));

  await logAdminAction({
    adminUserId: session.sub,
    action: "product.delete",
    entityType: "product",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

export const PATCH = clearsCache(PATCH_handler);
export const DELETE = clearsCache(DELETE_handler);
