import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { blogPost, blogCategory, media } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { blogPostSchema } from "@/lib/validation/admin-blog";
import { logAdminAction } from "@/lib/auth/audit";
import { upsertBlogCategory } from "@/lib/db/blog-utils";

import { clearsCache } from "@/lib/cache";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const db = await getDb();
  const row = (await db.select().from(blogPost).where(eq(blogPost.id, id)))[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let categoryName: string | null = null;
  if (row.blogCategoryId) {
    const cat = (await db.select().from(blogCategory).where(eq(blogCategory.id, row.blogCategoryId)))[0];
    categoryName = cat?.name ?? null;
  }
  let coverImageUrl: string | null = null;
  if (row.coverMediaId) {
    const img = (await db.select().from(media).where(eq(media.id, row.coverMediaId)))[0];
    coverImageUrl = img?.url ?? null;
  }

  return NextResponse.json({ post: { ...row, categoryName, coverImageUrl } });
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
  const parsed = blogPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const values = parsed.data;

  const db = await getDb();
  const existingPost = (await db.select().from(blogPost).where(eq(blogPost.id, id)))[0];
  const blogCategoryId = values.categoryName ? await upsertBlogCategory(values.categoryName) : null;
  const wasPublished = existingPost?.status === "published";

  await db
    .update(blogPost)
    .set({
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt,
      content: values.content,
      coverMediaId: values.coverMediaId ?? null,
      blogCategoryId,
      tags: values.tags ? JSON.stringify(values.tags.split(",").map((t) => t.trim())) : null,
      seoTitle: values.seoTitle,
      seoDescription: values.seoDescription,
      status: values.status,
      publishedAt: values.status === "published" && !wasPublished ? new Date().toISOString() : existingPost?.publishedAt,
    })
    .where(eq(blogPost.id, id));

  await logAdminAction({ adminUserId: session.sub, action: "blog.update", entityType: "blog_post", entityId: id });

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
  await db.delete(blogPost).where(eq(blogPost.id, id));

  await logAdminAction({ adminUserId: session.sub, action: "blog.delete", entityType: "blog_post", entityId: id });

  return NextResponse.json({ ok: true });
}

export const PATCH = clearsCache(PATCH_handler);
export const DELETE = clearsCache(DELETE_handler);
