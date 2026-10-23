import Link from "next/link";
import type { Metadata } from "next";
import { getLatestJournalPosts } from "@/lib/db/catalog";
import { getLocale } from "@/lib/currency";
import { PageHeader } from "@/components/shared/PageHeader";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";

export const metadata: Metadata = { title: "Journal" };

// Reads live data from MySQL — must never be statically generated at build
// time (there's no DB connection available during `next build`, and the
// content changes independently of deploys anyway).
export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  // One joined (and cached) query instead of two extra queries per post.
  const posts = await getLatestJournalPosts(60);

  return (
    <>
      <PageHeader eyebrow="The journal" title="Journal" intro="Notes on craft, design, and life at DASDUM." />
      <div className="container-editorial py-12">
        {posts.length === 0 ? (
          <p className="text-sm text-muted">Nothing published yet — check back soon.</p>
        ) : (
          <Stagger className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {posts.map((post) => (
              <StaggerItem key={post.id}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden bg-soft">
                    {post.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-soft2/60" />
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
                  <h2 className="mt-2 text-lg transition-colors group-hover:text-gold-text">{post.title}</h2>
                  {post.excerpt && <p className="mt-1.5 text-sm text-muted">{post.excerpt}</p>}
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}
