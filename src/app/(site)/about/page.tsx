import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "About",
  description: "The story, mission, and philosophy behind DASDUM.",
};

// Copy is admin-editable (Site Content), so read it per request.
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const { about } = await getSiteContent();

  return (
    <div className="container-editorial py-16 max-w-3xl">
      <span className="gold-rule block mb-5" />
      <h1 className="font-display text-4xl md:text-5xl text-primary-deep">{about.heading}</h1>
      <p className="mt-5 text-lg text-muted leading-relaxed">{about.intro}</p>

      <div className="mt-12 space-y-10">
        {about.sections.map((s, i) => (
          <section key={i}>
            <h2 className="font-display text-2xl text-primary-deep">{s.title}</h2>
            <p className="mt-3 text-muted leading-relaxed whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-14 border-t border-hairline pt-8">
        <Link
          href="/shop"
          className="inline-block bg-primary-deep text-bg px-7 py-3.5 text-sm hover:bg-primary transition-colors"
        >
          Explore the Collection
        </Link>
      </div>
    </div>
  );
}
