import Link from "next/link";
import { Box, Tag, Gift } from "lucide-react";
import { formatMoney } from "@/lib/currency";

/** The three-panel promo strip from the design. A panel only appears when
 * it's true for this shop right now: free shipping only if a threshold is
 * configured, "on sale" only if a product actually has a sale price. */
export function Banners({ freeShippingThreshold, hasSale }: { freeShippingThreshold: number | null; hasSale: boolean }) {
  const panels = [
    freeShippingThreshold !== null && {
      Icon: Box, title: "Free shipping", text: `On orders over ${formatMoney(freeShippingThreshold)}`,
      href: "/shop", cta: "Shop now →", tone: "bg-primary-deep text-white",
    },
    hasSale && {
      Icon: Tag, title: "On sale now", text: "Reduced prices on selected pieces",
      href: "/shop?sale=1", cta: "See the deals →", tone: "bg-gold text-primary-deep",
    },
    {
      Icon: Gift, title: "Limited runs", text: "Join the circle for early access",
      href: "#news", cta: "Join free →", tone: "bg-soft text-text",
    },
  ].filter(Boolean) as { Icon: typeof Box; title: string; text: string; href: string; cta: string; tone: string }[];

  return (
    <div
      className="container-editorial grid grid-cols-1 overflow-hidden rounded-lg md:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
      style={{ "--n": panels.length } as React.CSSProperties}
    >
      {panels.map(({ Icon, title, text, href, cta, tone }) => (
        <div key={title} className={`group flex items-center gap-5 px-7 py-6 ${tone}`}>
          <Icon strokeWidth={1.1} className="h-12 w-12 shrink-0 transition-transform duration-500 ease-editorial group-hover:-rotate-12 group-hover:scale-110" />
          <div>
            <h3 className="mb-1 text-[0.95rem]">{title}</h3>
            <p className="mb-1.5 text-[0.8rem] opacity-85">{text}</p>
            <Link href={href} className="text-[0.74rem] font-bold tracking-[0.04em] underline-offset-4 hover:underline">
              {cta}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
