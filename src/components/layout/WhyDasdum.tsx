import { Compass, Gem, Landmark, Leaf, UserCheck } from "lucide-react";
import type { SiteContent } from "@/lib/site-content";

// One icon per pillar, by position — the text is admin-editable, the icons aren't.
const ICONS = [Compass, Gem, Landmark, Leaf, UserCheck];

export function WhyDasdum({ content }: { content: SiteContent["whyDasdum"] }) {
  return (
    <section className="container-editorial py-20">
      <h2 className="font-display text-3xl md:text-4xl text-primary-deep max-w-lg">
        {content.heading}
      </h2>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {content.pillars.map(({ title, body }, i) => {
          const Icon = ICONS[i] ?? Compass;
          return (
            <div key={i} className="border-t-2 border-gold pt-5">
              <Icon size={22} className="text-primary-deep" strokeWidth={1.5} />
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
