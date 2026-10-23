import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";

import { PageHeader } from "@/components/shared/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
export const metadata: Metadata = {
  title: "About",
  description: "The story, mission, and philosophy behind DASDUM.",
};

// Copy is admin-editable (Site Content), so read it per request.
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const { about } = await getSiteContent();

  return (
    <>
      <PageHeader eyebrow="Our story" title={about.heading} intro={about.intro} width="3xl" />
      <div className="container-editorial max-w-3xl py-14">
        <div className="space-y-12">
          {about.sections.map((s, i) => (
            <Reveal key={i}>
              <section className="grid gap-4 md:grid-cols-[3rem_1fr] md:gap-6">
                <span className="font-script text-4xl leading-none text-gold-text">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h2 className="text-xl text-primary-deep">{s.title}</h2>
                  <p className="mt-3 text-muted leading-relaxed whitespace-pre-line">{s.body}</p>
                </div>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-14 border-t border-hairline pt-8">
            <Link href="/shop" className="btn">
              Explore the Collection
            </Link>
          </div>
        </Reveal>
      </div>
    </>
  );
}
