"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
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

const EASE = [0.22, 1, 0.36, 1] as const;

/** Splits a headline into lines at sentence ends, or at explicit newlines. */
function headlineLines(heading: string): string[] {
  const byNewline = heading.split("\n").map((l) => l.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  return heading.split(/(?<=[.!?])\s+/).filter(Boolean);
}

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
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const lines = headlineLines(content.heading);

  const perks = [
    freeShippingText && { Icon: Truck, title: "Free shipping", text: freeShippingText },
    { Icon: RotateCcw, title: "Easy returns", text: "See shipping and returns" },
    { Icon: Lock, title: "Secure checkout", text: "Safe, protected payment" },
  ].filter(Boolean) as { Icon: typeof Truck; title: string; text: string }[];

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-soft">
      <div className="container-editorial relative grid min-h-[470px] grid-cols-1 items-center lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative z-10 py-10 lg:py-14">
          {content.eyebrow && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
              className="mb-4 text-[0.8rem] font-medium uppercase tracking-[0.12em] text-gold-text"
            >
              {content.eyebrow}
            </motion.div>
          )}

          {/* Each line slides up out of its own mask */}
          <h1 className="text-[clamp(2.2rem,4.6vw,3.7rem)]">
            {lines.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  className="block"
                  initial={{ y: "110%", rotate: 3 }}
                  animate={{ y: "0%", rotate: 0 }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.14 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* Tagline is "written" in with a left-to-right wipe */}
          <motion.p
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 1.1, ease: "easeInOut", delay: 0.7 }}
            className="mt-4 mb-3 font-script text-[clamp(1.7rem,3vw,2.3rem)] leading-tight text-gold-text"
          >
            {tagline}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.9 }}
            className="mb-6 max-w-[34ch] text-muted"
          >
            {content.subheading}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18, delay: 1.0 }}
            className="flex flex-wrap gap-3"
          >
            <Link href={content.primaryCta.href} className="btn">
              {content.primaryCta.label} <ArrowRight size={16} />
            </Link>
            <Link href={content.secondaryCta.href} className="btn btn-line">
              {content.secondaryCta.label}
            </Link>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 1.2 } } }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-3"
          >
            {perks.map(({ Icon, title, text }, i) => (
              <motion.li
                key={title}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                className={`flex items-center gap-2.5 text-[0.72rem] leading-snug text-muted ${i > 0 ? "sm:border-l sm:border-hairline sm:pl-6" : ""}`}
              >
                <Icon size={22} strokeWidth={1.6} className="shrink-0 text-text" />
                <span>
                  <b className="block text-[0.7rem] font-bold uppercase tracking-[0.06em] text-text">{title}</b>
                  {text}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Angled art panel: slides in, then drifts as you scroll */}
        <motion.div
          aria-hidden="true"
          initial={{ clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" }}
          animate={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1], delay: 0.15 }}
          className="relative -mx-5 h-[340px] bg-soft2 sm:-mx-10 lg:absolute lg:inset-y-0 lg:right-0 lg:mx-0 lg:h-auto lg:w-[62%] lg:left-auto"
        >
          <motion.div style={{ y: artY }} className="absolute inset-[-8%_0_-8%_0]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <>
                {/* Before a banner photo is uploaded (Site Images): brand shapes, not a stock image */}
                <div className="absolute left-[34%] top-[16%] h-[58%] aspect-square rounded-full bg-primary" />
                <div className="absolute right-[10%] bottom-[14%] h-[26%] aspect-square rounded-full bg-gold" />
                <ArcMotif variant="gold" className="absolute left-[24%] bottom-[-4%] h-[46%] w-auto opacity-90" />
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Badge: springs in, then floats */}
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0, rotate: -120 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 12, delay: 1.0 }}
          className="absolute right-[6%] top-auto bottom-[62%] z-20 lg:left-[36%] lg:right-auto lg:top-[9%] lg:bottom-auto"
        >
          <div className="grid aspect-square w-[104px] animate-floaty place-items-center rounded-full bg-primary-deep text-center text-[0.75rem] font-black leading-[1.05] tracking-[0.04em] text-white shadow-lg">
            <span>
              NEW
              <strong className="block text-[1.6rem]">IN</strong>
              THIS SEASON
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
