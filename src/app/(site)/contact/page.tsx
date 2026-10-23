import type { Metadata } from "next";
import { ContactForm } from "@/components/shared/ContactForm";
import { SITE } from "@/lib/site";

import { PageHeader } from "@/components/shared/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the DASDUM team.",
};

export default function ContactPage() {
  return (
    <>
    <PageHeader
      eyebrow="Contact"
      title="Get in touch"
      intro="Questions about an order, a product, or wholesale? Send us a message and we’ll reply within 1–2 business days."
    />
    <div className="container-editorial py-12">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-12">
        <Reveal><ContactForm /></Reveal>

        <aside className="anim-rise space-y-6 text-sm" style={{ animationDelay: "0.35s" }}>
          {SITE.contactEmail && (
            <div>
              <h2 className="font-medium text-primary-deep">Email</h2>
              <p className="mt-1 text-muted">
                <a href={`mailto:${SITE.contactEmail}`} className="hover:text-primary-deep">{SITE.contactEmail}</a>
              </p>
            </div>
          )}
          {SITE.supportHours && (
            <div>
              <h2 className="font-medium text-primary-deep">Customer support</h2>
              <p className="mt-1 text-muted">{SITE.supportHours}</p>
            </div>
          )}
          {SITE.social.length > 0 && (
            <div>
              <h2 className="font-medium text-primary-deep">Follow along</h2>
              <div className="mt-1 flex gap-3 text-muted">
                {SITE.social.map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary-deep">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
    </>
  );
}
