import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { blogPost, blogCategory, media } from "@/lib/db/schema";
import { getLocale } from "@/lib/currency";

// Reads live data from MySQL — must never be statically generated at build
// time (there's no DB connection available during `next build`).
export const dynamic = "force-dynamic";

async function getPost(slug: string) {
  const db = await getDb();
  const post = (await db.select().from(blogPost).where(eq(blogPost.slug, slug)))[0];
  if (!post || post.status !== "published") return null;

  const category = post.blogCategoryId
    ? (await db.select().from(blogCategory).where(eq(blogCategory.id, post.blogCategoryId)))[0]
    : null;
  const cover = post.coverMediaId
    ? (await db.select().from(media).where(eq(media.id, post.coverMediaId)))[0]
    : null;

  return { ...post, categoryName: category?.name, coverUrl: cover?.url };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    openGraph: { title: post.title, description: post.excerpt ?? undefined, images: post.coverUrl ? [post.coverUrl] : undefined },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt,
    image: post.coverUrl ? [post.coverUrl] : undefined,
    publisher: { "@type": "Organization", name: "DASDUM" },
  };

  return (
    <article className="container-editorial anim-rise py-16 max-w-2xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex items-center gap-2 text-xs text-muted">
        {post.categoryName && <span>{post.categoryName}</span>}
        {post.categoryName && <span aria-hidden="true">•</span>}
        <span>
          {post.publishedAt &&
            new Date(post.publishedAt).toLocaleDateString(getLocale(), { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <h1 className="mt-3 font-display text-4xl text-primary-deep">{post.title}</h1>

      {post.coverUrl && (
        <div className="mt-8 aspect-[16/9] overflow-hidden bg-primary/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverUrl} alt="" decoding="async" fetchPriority="high" className="h-full w-full object-cover" />
        </div>
      )}

      {/* content is plain text/Markdown for now — render through a Markdown
          renderer here once the admin editor produces Markdown/HTML */}
      <div className="mt-8 text-sm leading-relaxed text-text whitespace-pre-line">{post.content}</div>
    </article>
  );
}
