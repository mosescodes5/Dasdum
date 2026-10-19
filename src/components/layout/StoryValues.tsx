import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SiteContent } from "@/lib/site-content";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

/** Brand story + the five values, from the design. All wording comes from
 * Site Content (admin-editable); the photo from Site Images. */
export function StoryValues({ content, imageUrl }: { content: SiteContent; imageUrl?: string | null }) {
  const { brandStory, whyDasdum } = content;
  return (
    <section className="bg-soft py-16">
      <div className="container-editorial">
        {imageUrl && (
          <Reveal className="mb-12">
            <div className="relative aspect-[16/8] overflow-hidden rounded-lg bg-primary-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </Reveal>
        )}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="mb-4 text-[clamp(1.6rem,3vw,2.2rem)]">{brandStory.heading}</h2>
            <p className="mb-4 font-script text-[1.7rem] leading-tight text-gold-text">{brandStory.tagline}</p>
            {brandStory.paragraphs.map((text, i) => (
              <p key={i} className="mb-3.5 max-w-[56ch] text-muted">{text}</p>
            ))}
            <Link href="/about" className="btn mt-2">
              {brandStory.linkLabel} <ArrowRight size={16} />
            </Link>
          </Reveal>

          <div>
            <h2 className="sr-only">{whyDasdum.heading}</h2>
            <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {whyDasdum.pillars.map((p, i) => (
                <StaggerItem
                  key={i}
                  className={`rounded-lg bg-surface p-5 transition-transform duration-300 hover:-translate-y-1 ${
                    i === whyDasdum.pillars.length - 1 && whyDasdum.pillars.length % 2 === 1 ? "sm:col-span-2" : ""
                  }`}
                >
                  <h3 className="mb-1.5 text-[0.8rem] tracking-[0.06em]">{p.title}</h3>
                  <p className="text-[0.84rem] text-muted">{p.body}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </div>
    </section>
  );
}
