import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { blogCategory } from "@/lib/db/schema";

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Finds a blog_category by slugified name, creating it if it doesn't exist yet. */
export async function upsertBlogCategory(name: string): Promise<string> {
  const db = await getDb();
  const slug = slugify(name);
  const existing = (await db.select().from(blogCategory).where(eq(blogCategory.slug, slug)))[0];
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.insert(blogCategory).values({ id, name, slug });
  return id;
}
