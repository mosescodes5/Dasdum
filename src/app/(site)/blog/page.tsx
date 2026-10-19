import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { blogPost, blogCategory, media } from "@/lib/db/schema";
import { getLocale } from "@/lib/currency";

export const metadata: Metadata = { title: "Journal" };

// Reads live data from MySQL — must never be statically generated at build
// time (there's no DB connection available during `next build`, and the
// content changes independently of deploys anyway).
export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const db = await getDb();
  const posts = await db
    .select()
    .from(blogPost)
    .where(eq(blogPost.status, "published"))
    .orderBy(desc(blogPost.publishedAt))

  const enriched = await Promise.all(
    posts.map(async (post) => {
      const category = post.blogCategoryId
        ? (await db.select().from(blogCategory).where(eq(blogCategory.id, post.blogCategoryId)))[0]
        : null;
      const cover = post.coverMediaId
        ? (await db.select().from(media).where(eq(media.id, post.coverMediaId)))[0]
        : null;
      return { ...post, categoryName: category?.name, coverUrl: cover?.url };
    })
  );

  return (
    <div className="container-editorial py-16">
      <h1 className="font-display text-4xl text-primary-deep max-w-lg">Journal</h1>
      <p className="mt-3 text-muted max-w-md">Notes on craft, design, and life at DASDUM.</p>

      {enriched.length === 0 ? (
        <p className="mt-12 text-sm text-muted">Nothing published yet — check back soon.</p>
      ) : (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          {enriched.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
              <div className="aspect-[4/3] overflow-hidden bg-primary/15">
                {post.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-primary/20" />
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                {post.categoryName && <span>{post.categoryName}</span>}
                {post.categoryName && <span aria-hidden="true">•</span>}
                <span>
                  {post.publishedAt &&
                    new Date(post.publishedAt).toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <h2 className="mt-2 font-display text-xl">{post.title}</h2>
              {post.excerpt && <p className="mt-1.5 text-sm text-muted">{post.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
