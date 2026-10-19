import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { getLocale } from "@/lib/currency";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

// The fake "What people are saying" testimonials were removed: there is no
// review/testimonial table, so anything shown there would be invented.
// Add the section back once real reviews are stored.

type JournalPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date | string | null;
  categoryName: string | null;
  coverUrl: string | null;
};

/** Latest published journal posts (from the admin's Blog section). Renders
 * nothing when there are none. */
export function JournalPreview({ posts }: { posts: JournalPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="py-12">
      <div className="container-editorial">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[0.95rem] tracking-[0.04em]">Journal</h2>
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.06em] hover:text-gold-text">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <StaggerItem key={post.id}>
              <Link href={`/blog/${post.slug}`} className="group block overflow-hidden rounded-lg border border-hairline bg-surface">
                <div className="relative aspect-[4/3] overflow-hidden bg-soft">
                  {post.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {post.categoryName && <span>{post.categoryName}</span>}
                    {post.categoryName && post.publishedAt && <span aria-hidden="true">/</span>}
                    {post.publishedAt && (
                      <span>{new Date(post.publishedAt).toLocaleDateString(getLocale(), { month: "short", year: "numeric" })}</span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg leading-snug transition-colors group-hover:text-gold-text">{post.title}</h3>
                  {post.excerpt && <p className="mt-2 text-sm text-muted">{post.excerpt}</p>}
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function Newsletter() {
  return (
    <section id="news" className="py-8 pb-12">
      <Reveal className="container-editorial">
        <div className="grid grid-cols-1 items-center gap-8 rounded-lg border border-hairline p-6 md:grid-cols-2 md:px-8">
          <div className="flex items-center gap-4">
            <Lock strokeWidth={1.2} className="h-11 w-11 shrink-0" />
            <div>
              <h3 className="mb-1 text-[0.85rem]">Secure checkout</h3>
              <p className="text-sm text-muted">Card payments are processed securely by Stripe.</p>
            </div>
          </div>
          <div>
            <h4 className="mb-1 text-[0.78rem]">Stay in the DASDUM circle</h4>
            <p className="text-sm text-muted">New arrivals, journal stories and early access to limited runs. No spam.</p>
            <NewsletterForm />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
