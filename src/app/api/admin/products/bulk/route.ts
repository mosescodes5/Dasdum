import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { product, category } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { logAdminAction } from "@/lib/auth/audit";
import { slugify, skuPrefix } from "@/lib/autogen";
import { clearsCache } from "@/lib/cache";

// Creates many products at once from already-uploaded photos. Each photo
// becomes one product in the chosen category with an auto-generated slug and
// SKU. Products with no name become drafts called "Untitled product …" so
// nothing half-finished can appear in the shop by accident.

const bodySchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  // Price/stock used for any item that doesn't have its own. Minor units (pence).
  defaultPrice: z.coerce.number().int().min(0).default(0),
  defaultStock: z.coerce.number().int().min(0).default(0),
  // Publish items that have a name and a price above zero; everything else stays a draft.
  publishReady: z.boolean().default(false),
  items: z
    .array(
      z.object({
        mediaId: z.string().min(1),
        name: z.string().trim().max(255).optional(),
        shortDescription: z.string().trim().max(200).optional(),
        description: z.string().trim().max(4000).optional(),
        price: z.coerce.number().int().min(0).optional(),
        stock: z.coerce.number().int().min(0).optional(),
      })
    )
    .min(1)
    .max(100),
});

async function POST_handler(request: Request) {
  let session;
  try {
    session = await requireAdmin("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { categoryId, defaultPrice, defaultStock, publishReady, items } = parsed.data;

  const db = await getDb();
  const cat = (await db.select({ name: category.name }).from(category).where(eq(category.id, categoryId)))[0];
  if (!cat) return NextResponse.json({ error: "That category doesn't exist." }, { status: 400 });

  // Everything already taken, so generated slugs/SKUs never collide.
  const existing = await db.select({ slug: product.slug, sku: product.sku }).from(product);
  const slugs = new Set(existing.map((r) => r.slug));
  const skus = new Set(existing.map((r) => r.sku));

  const prefix = skuPrefix(cat.name);
  let nextSku = existing.reduce((max, r) => {
    const m = new RegExp(`^${prefix}-(\\d+)$`).exec(r.sku);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  let untitled = existing.filter((r) => r.slug.startsWith("untitled-product")).length;

  const now = new Date().toISOString();
  const created: string[] = [];
  let published = 0;

  for (const item of items) {
    const hasName = !!item.name;
    const name = hasName ? item.name! : `Untitled product ${++untitled}`;

    const base = slugify(name) || "product";
    let slug = base;
    for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`;
    slugs.add(slug);

    let sku: string;
    do {
      sku = `${prefix}-${String(++nextSku).padStart(4, "0")}`;
    } while (skus.has(sku));
    skus.add(sku);

    const price = item.price ?? defaultPrice;
    const live = publishReady && hasName && price > 0;
    if (live) published++;

    const id = crypto.randomUUID();
    await db.insert(product).values({
      id,
      name,
      slug,
      shortDescription: item.shortDescription || null,
      description: item.description || null,
      price,
      salePrice: null,
      sku,
      stock: item.stock ?? defaultStock,
      categoryId,
      tags: null,
      featuredImageMediaId: item.mediaId,
      seoTitle: null,
      seoDescription: null,
      status: live ? "published" : "draft",
      createdAt: now,
      updatedAt: now,
    });
    created.push(id);
  }

  await logAdminAction({
    adminUserId: session.sub,
    action: "product.bulk_create",
    entityType: "product",
    metadata: { count: created.length, published },
  });

  return NextResponse.json({ ok: true, created: created.length, published, drafts: created.length - published });
}

export const POST = clearsCache(POST_handler);
