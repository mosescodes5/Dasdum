import { NextResponse } from "next/server";
import { desc, eq, like, and, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { blogPost } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { blogPostSchema } from "@/lib/validation/admin-blog";
import { logAdminAction } from "@/lib/auth/audit";
import { upsertBlogCategory } from "@/lib/db/blog-utils";

import { clearsCache } from "@/lib/cache";
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
  if (q) conditions.push(like(blogPost.title, `%${q}%`));
  if (status) conditions.push(eq(blogPost.status, status as "draft" | "published"));

  const rows = await db
    .select()
    .from(blogPost)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(blogPost.createdAt));

  return NextResponse.json({ posts: rows });
}

async function POST_handler(request: Request) {
  let session;
  try {
    session = await requireAdmin("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as any;
  const parsed = blogPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const values = parsed.data;

  const db = await getDb();
  const existing = (await db.select().from(blogPost).where(eq(blogPost.slug, values.slug)))[0];
  if (existing) {
    return NextResponse.json({ error: "A post with that slug already exists." }, { status: 409 });
  }

  const blogCategoryId = values.categoryName ? await upsertBlogCategory(values.categoryName) : null;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(blogPost).values({
    id,
    title: values.title,
    slug: values.slug,
    excerpt: values.excerpt,
    content: values.content,
    coverMediaId: values.coverMediaId ?? null,
    authorAdminId: session.sub,
    blogCategoryId,
    tags: values.tags ? JSON.stringify(values.tags.split(",").map((t) => t.trim())) : null,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    status: values.status,
    publishedAt: values.status === "published" ? now : null,
    createdAt: now,
  });

  await logAdminAction({ adminUserId: session.sub, action: "blog.create", entityType: "blog_post", entityId: id });

  return NextResponse.json({ ok: true, id });
}

async function DELETE_handler(request: Request) {
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
    await db.delete(blogPost).where(eq(blogPost.id, id));
  }

  await logAdminAction({ adminUserId: session.sub, action: "blog.bulk_delete", entityType: "blog_post", metadata: { ids } });

  return NextResponse.json({ ok: true });
}

export const POST = clearsCache(POST_handler);
export const DELETE = clearsCache(DELETE_handler);
