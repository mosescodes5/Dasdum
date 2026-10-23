const WIDTHS = { "2xl": "max-w-2xl", "3xl": "max-w-3xl", full: "" } as const;

/** Shared top band for the content pages (about, FAQ, contact, journal,
 * legal…): small eyebrow, headline that rises out of a mask, optional intro.
 * Server component animated with CSS, so it's visible straight away. `width`
 * should match the page body below it so the left edges line up. */
export function PageHeader({
  eyebrow,
  title,
  intro,
  width = "full",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  width?: keyof typeof WIDTHS;
}) {
  return (
    <section className="bg-soft">
      <div className={`container-editorial py-12 md:py-16 ${WIDTHS[width]}`}>
        {eyebrow && (
          <p className="anim-fade mb-3 text-[0.78rem] font-medium uppercase tracking-[0.14em] text-gold-text">{eyebrow}</p>
        )}
        <h1 className="block overflow-hidden pb-[0.1em] text-[clamp(2rem,4.4vw,3.2rem)] text-primary-deep">
          <span className="anim-mask block">{title}</span>
        </h1>
        {intro && (
          <p style={{ animationDelay: "0.25s" }} className="anim-rise mt-3 max-w-xl text-muted md:text-lg">
            {intro}
          </p>
        )}
      </div>
    </section>
  );
}
