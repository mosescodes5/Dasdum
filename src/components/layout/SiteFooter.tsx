import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/site";
import { ArrowUp } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/shop" },
      { label: "Categories", href: "/shop/categories" },
      { label: "Best sellers", href: "/shop?sort=bestselling" },
      { label: "New arrivals", href: "/shop?sort=newest" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Journal", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Shipping & returns", href: "/faq#shipping" },
      { label: "Track an order", href: "/account/orders" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-primary-deep text-white mt-4">
      <div className="container-editorial pt-12 pb-6">
        <Stagger className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-8 md:gap-10">
          <StaggerItem className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="DASDUM home" className="inline-block">
              {/* The wordmark is dark teal, so it sits on a light pill against the navy footer */}
              <Image
                src="/logo-wordmark.png"
                alt="DASDUM"
                width={150}
                height={44}
                className="h-[50px] w-auto rounded-md bg-[#F8F8F8] px-2.5 py-1.5"
              />
            </Link>
            <p className="mt-4 max-w-[30ch] text-sm text-white/80">
              Thoughtful goods for modern living, designed with purpose.
            </p>
            {SITE.contactEmail && (
              <a href={`mailto:${SITE.contactEmail}`} className="mt-3 block text-sm text-white/80 transition-colors hover:text-gold">
                {SITE.contactEmail}
              </a>
            )}
            {SITE.social.length > 0 && (
              <div className="mt-5 flex gap-4 text-sm">
                {SITE.social.map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-gold transition-colors">
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </StaggerItem>
          {COLUMNS.map((col) => (
            <StaggerItem key={col.title}>
              <h4 className="text-[0.8rem] tracking-[0.08em] mb-4">{col.title}</h4>
              <ul className="grid gap-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block text-white/80 transition-[color,transform] duration-300 hover:translate-x-1 hover:text-gold">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </Stagger>
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-[0.8rem] text-white/70">
          <span>© {new Date().getFullYear()} DASDUM. All rights reserved.</span>
          <a href="#top" className="group inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.08em] transition-colors hover:text-gold">
            Back to top <ArrowUp size={14} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
