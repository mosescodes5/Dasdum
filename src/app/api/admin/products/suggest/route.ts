import { NextResponse } from "next/server";
import { and, eq, like, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { product, category } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { slugify, skuPrefix } from "@/lib/autogen";

// Suggests a slug and SKU that are FREE right now, for the product form's
// auto-generation. Read-only: nothing is reserved, and the create/update
// routes still enforce uniqueness when the product is actually saved.
export async function GET(request: Request) {
  try {
    await requireAdmin("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const name = (params.get("name") ?? "").trim();
  const categoryId = params.get("categoryId") ?? "";
  const excludeId = params.get("excludeId") ?? "";
  const db = await getDb();

  // --- slug: name-based, with -2, -3... if taken (ignoring this product itself)
  let slug: string | null = null;
  if (name) {
    const base = slugify(name) || "product";
    const taken = new Set(
      (
        await db
          .select({ slug: product.slug })
          .from(product)
          .where(excludeId ? and(like(product.slug, `${base}%`), ne(product.id, excludeId)) : like(product.slug, `${base}%`))
      ).map((r) => r.slug)
    );
    slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  }

  // --- sku: CATEGORY-0001, counting up; keeps this product's own SKU if it already fits
  let sku: string | null = null;
  if (categoryId) {
    const cat = (await db.select({ name: category.name }).from(category).where(eq(category.id, categoryId)))[0];
    const prefix = skuPrefix(cat?.name);
    const rows = await db
      .select({ id: product.id, sku: product.sku })
      .from(product)
      .where(like(product.sku, `${prefix}-%`));
    const own = excludeId ? rows.find((r) => r.id === excludeId) : undefined;
    if (own) {
      sku = own.sku;
    } else {
      const used = new Set(rows.map((r) => r.sku));
      const highest = rows.reduce((max, r) => {
        const m = /^[A-Z0-9]+-(\d+)$/.exec(r.sku);
        return m ? Math.max(max, Number(m[1])) : max;
      }, 0);
      let n = highest + 1;
      while (used.has(`${prefix}-${String(n).padStart(4, "0")}`)) n++;
      sku = `${prefix}-${String(n).padStart(4, "0")}`;
    }
  }

  return NextResponse.json({ slug, sku });
}
