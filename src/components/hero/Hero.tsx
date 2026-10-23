import Link from "next/link";
import { preload } from "react-dom";
import { ArrowRight, Truck, RotateCcw, Lock } from "lucide-react";
import { ArcMotif } from "@/components/shared/ArcMotif";

// Content comes from getHeroContent() (admin-editable at /admin/settings);
// the defaults live there too, so there's one source of truth.
type HeroContent = {
  eyebrow?: string;
  heading: string;
  subheading: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

/** Splits a headline into lines at sentence ends, or at explicit newlines. */
function headlineLines(heading: string): string[] {
  const byNewline = heading.split("\n").map((l) => l.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  return heading.split(/(?<=[.!?])\s+/).filter(Boolean);
}

// Entrance, in order: headline lines rise out of a mask → tagline and
// sentence fade in → buttons → perks; the image panel slides in beside them.
// Everything is transform/opacity only (smooth on phones), plays once, and
// there's no scroll-linked effect on the big image. It is a server
// component animated with CSS (see globals.css), so the headline and photo
// are visible as soon as the HTML arrives — nothing waits for JavaScript.
export function Hero({
  content,
  imageUrl,
  tagline,
  freeShippingText,
}: {
  content: HeroContent;
  imageUrl?: string | null;
  /** Handwritten line under the headline (editable in Site Content). */
  tagline: string;
  /** e.g. "On orders over £120" — null hides the perk (no threshold set). */
  freeShippingText: string | null;
}) {
  const lines = headlineLines(content.heading);
  // Start downloading the banner photo right away, before the page is parsed.
  if (imageUrl) preload(imageUrl, { as: "image", fetchPriority: "high" });

  const perks = [
    freeShippingText && { Icon: Truck, title: "Free shipping", text: freeShippingText },
    { Icon: RotateCcw, title: "Easy returns", text: "See shipping and returns" },
    { Icon: Lock, title: "Secure checkout", text: "Safe, protected payment" },
  ].filter(Boolean) as { Icon: typeof Truck; title: string; text: string }[];

  return (
    <section className="relative overflow-hidden bg-soft">
      <div className="container-editorial relative grid min-h-[470px] grid-cols-1 items-center lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative z-10 py-10 lg:py-14">
          {content.eyebrow && (
            <div
              style={{ animationDelay: "0.1s" }}
              className="anim-fade mb-4 text-[0.8rem] font-medium uppercase tracking-[0.12em] text-gold-text"
            >
              {content.eyebrow}
            </div>
          )}

          <h1 className="text-[clamp(2.2rem,4.6vw,3.7rem)]">
            {lines.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.08em]">
                <span className="anim-mask block" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            style={{ animationDelay: "0.45s" }}
            className="anim-rise mt-4 mb-3 font-script text-[clamp(1.7rem,3vw,2.3rem)] leading-tight text-gold-text"
          >
            {tagline}
          </p>

          <p style={{ animationDelay: "0.55s" }} className="anim-rise mb-6 max-w-[34ch] text-muted">
            {content.subheading}
          </p>

          <div style={{ animationDelay: "0.65s" }} className="anim-rise flex flex-wrap gap-3">
            <Link href={content.primaryCta.href} className="btn">
              {content.primaryCta.label} <ArrowRight size={16} />
            </Link>
            <Link href={content.secondaryCta.href} className="btn btn-line">
              {content.secondaryCta.label}
            </Link>
          </div>

          <ul style={{ animationDelay: "0.85s" }} className="anim-fade mt-8 flex flex-wrap gap-x-6 gap-y-3 lg:max-w-[78%] lg:flex-col lg:gap-y-3.5">
            {perks.map(({ Icon, title, text }, i) => (
              <li
                key={title}
                className={`flex items-center gap-2.5 text-[0.72rem] leading-snug text-muted ${i > 0 ? "sm:border-l sm:border-hairline sm:pl-6 lg:border-l-0 lg:pl-0" : ""}`}
              >
                <Icon size={22} strokeWidth={1.6} className="shrink-0 text-text" />
                <span>
                  <b className="block text-[0.7rem] font-bold uppercase tracking-[0.06em] text-text">{title}</b>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Angled image panel. The angle is a fixed clip-path (never animated);
            only its position and opacity animate on the way in. */}
        <div
          aria-hidden="true"
          style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
          className="anim-panel relative -mx-5 h-[340px] overflow-hidden bg-soft2 sm:-mx-10 lg:absolute lg:inset-y-0 lg:right-0 lg:mx-0 lg:h-auto lg:w-[62%]"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" fetchPriority="high" decoding="async" className="anim-settle absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              {/* Before a banner photo is uploaded (Site Images): brand shapes, not a stock image */}
              <div className="absolute left-[34%] top-[16%] aspect-square h-[58%] rounded-full bg-primary" />
              <div className="absolute bottom-[14%] right-[10%] aspect-square h-[26%] rounded-full bg-gold" />
              <ArcMotif variant="gold" className="absolute bottom-[-4%] left-[24%] h-[46%] w-auto opacity-90" />
            </>
          )}
        </div>

        {/* Badge: pops in once, then stays still */}
        <div
          aria-hidden="true"
          className="anim-badge absolute bottom-[62%] right-[6%] top-auto z-20 lg:bottom-auto lg:left-[36%] lg:right-auto lg:top-[9%]"
        >
          <div className="grid aspect-square w-[104px] -rotate-6 place-items-center rounded-full bg-primary-deep text-center text-[0.75rem] font-black leading-[1.05] tracking-[0.04em] text-white shadow-md">
            <span>
              NEW
              <strong className="block text-[1.6rem]">IN</strong>
              THIS SEASON
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
